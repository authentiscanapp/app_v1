/**
 * AuthentiScan Pro — Public API v1
 * POST /api/v1/analyze
 *
 * Authenticated, rate-limited, productized entry point for external
 * developers. Speaks a clean, documented contract and reuses the same
 * analysis engine as the app. The legacy app endpoint (/api/analyze)
 * is intentionally separate and unchanged.
 */

const { analyzeText, analyzeAudio } = require("../_lib/core.js");
const { authenticate, logRequest, rateLimitHeaders } = require("../_lib/keys.js");

const MAX_TEXT = 10000;       // characters
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB decoded

function fail(res, status, code, detail, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  return res.status(status).json({ error: code, detail });
}

/** Map internal 0-100 score to the public risk_level vocabulary. */
function riskLevel(score) {
  if (score <= 34) return "low";
  if (score <= 64) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

/** Map internal signal objects to the public credibility_signals shape. */
function mapSignals(signals) {
  if (!Array.isArray(signals)) return [];
  return signals.map((s) => ({
    name: s.name,
    finding: s.desc,
    score: s.pct,
    level: s.level,
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET → lightweight, unauthenticated endpoint descriptor
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "AuthentiScan Pro API",
      version: "v1",
      endpoint: "POST /api/v1/analyze",
      docs: "https://app.authentiscanapp.com/docs",
    });
  }

  if (req.method !== "POST") {
    return fail(res, 405, "METHOD_NOT_ALLOWED", "Only GET and POST are supported on this endpoint");
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const RESEMBLE_KEY = process.env.RESEMBLE_API_KEY;
  const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

  // ── Authenticate + per-key quota ──
  const auth = await authenticate(req, { supabaseUrl: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY });
  const headers = auth.keyRow
    ? rateLimitHeaders(auth.limit, auth.remaining)
    : {};
  if (!auth.ok) {
    return fail(res, auth.status, auth.code, auth.error, headers);
  }
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);

  if (!ANTHROPIC_KEY) {
    return fail(res, 500, "INTERNAL_ERROR", "Analysis engine not configured");
  }

  const body = req.body || {};
  let { type, content, audio, audioMime, audioExt, language, include_signals } = body;

  // Backwards-friendly: accept `text` as an alias for `content`
  if (content == null && typeof body.text === "string") content = body.text;
  const includeSignals = include_signals !== false; // default true

  // ── AUDIO MODE ──
  if (type === "audio" || (audio && !content)) {
    if (!audio || typeof audio !== "string") {
      return fail(res, 400, "INVALID_REQUEST", 'Audio mode requires a base64 "audio" field');
    }
    const approxBytes = Math.floor((audio.length * 3) / 4);
    if (approxBytes > MAX_AUDIO_BYTES) {
      return fail(res, 400, "CONTENT_TOO_LONG", "Audio exceeds the 25 MB limit");
    }
    try {
      const result = await analyzeAudio({
        audio, audioMime, audioExt,
        anthropicKey: ANTHROPIC_KEY,
        resembleKey: RESEMBLE_KEY,
        elevenLabsKey: ELEVENLABS_KEY,
      });
      return respond(res, result, "audio", { auth, includeSignals, SUPABASE_URL, SUPABASE_SERVICE_KEY });
    } catch (err) {
      if (err.status === 422 || err.code === "AUDIO_FORMAT_UNSUPPORTED") {
        return fail(res, 422, "AUDIO_FORMAT_UNSUPPORTED", err.message);
      }
      return fail(res, 500, "INTERNAL_ERROR", err.message);
    }
  }

  // ── TEXT / URL MODE ──
  if (!content || typeof content !== "string" || content.trim().length < 5) {
    return fail(res, 400, "INVALID_REQUEST", 'Missing or too-short "content" field (min 5 characters)');
  }
  if (content.length > MAX_TEXT) {
    return fail(res, 400, "CONTENT_TOO_LONG", `Content exceeds the ${MAX_TEXT.toLocaleString("en-US")} character limit`);
  }

  const isUrl = /^https?:\/\//i.test(content.trim());
  const mode = type === "url" || isUrl ? "url" : "text";

  try {
    const result = await analyzeText({ text: content, anthropicKey: ANTHROPIC_KEY });
    return respond(res, result, mode, { auth, includeSignals, SUPABASE_URL, SUPABASE_SERVICE_KEY });
  } catch (err) {
    if (err.upstreamStatus === 429) {
      return fail(res, 503, "SERVICE_UNAVAILABLE", "Analysis engine is busy, retry shortly");
    }
    return fail(res, 500, "INTERNAL_ERROR", err.message);
  }
};

/** Shape the internal result into the public response + log usage. */
async function respond(res, result, mode, ctx) {
  const { auth, includeSignals, SUPABASE_URL, SUPABASE_SERVICE_KEY } = ctx;
  const score = typeof result.score === "number" ? result.score : 0;
  const level = riskLevel(score);

  const payload = {
    request_id: cryptoId(),
    mode,
    risk_score: score,
    risk_level: level,
    verdict: result.verdict || "unverified",
    title: result.title || null,
    summary: result.summary || null,
    explanation: result.desc || null,
    analyzed_at: new Date().toISOString(),
  };
  if (result.transcription) payload.transcription = result.transcription;
  if (includeSignals) payload.credibility_signals = mapSignals(result.signals);

  // Best-effort usage log (counts toward the daily quota)
  await logRequest({
    supabaseUrl: SUPABASE_URL,
    serviceKey: SUPABASE_SERVICE_KEY,
    keyRow: auth.keyRow,
    mode,
    riskLevel: level,
    score,
  });

  // Reflect the request we just consumed in the remaining counter
  if (auth.limit != null) {
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, auth.remaining - 1)));
  }

  return res.status(200).json(payload);
}

function cryptoId() {
  try {
    return "req_" + require("crypto").randomBytes(12).toString("hex");
  } catch (_) {
    return "req_" + String(Date.now());
  }
}
