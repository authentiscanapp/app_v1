/**
 * ============================================================================
 *  AUTHENTISCAN API ADAPTER
 * ----------------------------------------------------------------------------
 *  THIS IS THE ONLY FILE YOU SHOULD NEED TO ADJUST.
 *
 *  I don't have the exact request/response contract of your /api/analyze
 *  endpoint, so I made reasonable assumptions based on how the product works
 *  (analyzes URLs / text / audio, returns a score + signals).
 *
 *  Adjust two things to match your real endpoint:
 *    1) REQUEST shape   -> see `analyzeUrl` and `analyzeAudio` below
 *    2) RESPONSE mapping -> see `normalize()` at the bottom
 * ============================================================================
 */

const API_URL =
  process.env.AUTHENTISCAN_API_URL ||
  "https://app.authentiscanapp.com/api/analyze";

function authHeaders() {
  const key = process.env.AUTHENTISCAN_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/**
 * Analyze a URL (or plain text).
 * ASSUMPTION: POST JSON { type: "url", url } -> JSON result.
 * Change the body below if your endpoint expects e.g. { input } or { text }.
 */
export async function analyzeUrl(url) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ type: "url", url }),
  });
  if (!res.ok) {
    throw new Error(`analyze API ${res.status}: ${await safeText(res)}`);
  }
  return normalize(await res.json());
}

/**
 * Analyze an audio file.
 * ASSUMPTION: multipart/form-data with field "file" + type=audio.
 * If your endpoint wants base64 JSON instead, swap the body for:
 *   JSON.stringify({ type: "audio", filename, data: buffer.toString("base64") })
 * and set Content-Type: application/json.
 */
export async function analyzeAudio(buffer, filename, mimetype) {
  const form = new FormData();
  form.append("type", "audio");
  form.append(
    "file",
    new Blob([buffer], { type: mimetype || "application/octet-stream" }),
    filename || "audio"
  );
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { ...authHeaders() }, // do NOT set Content-Type; fetch sets the boundary
    body: form,
  });
  if (!res.ok) {
    throw new Error(`analyze API ${res.status}: ${await safeText(res)}`);
  }
  return normalize(await res.json());
}

/**
 * Maps the raw API response into the shape the Slack formatter expects:
 *   { score, verdict, signals, explanation, higherIsBetter }
 *
 * It reads several common field names defensively. Tighten this to your
 * real response once you confirm the field names.
 */
function normalize(raw) {
  const r = raw?.result ?? raw?.data ?? raw ?? {};

  const score =
    pickNumber(r.riskScore) ??
    pickNumber(r.score) ??
    pickNumber(r.credibilityScore) ??
    pickNumber(r.credibility);

  // If the API reports credibility (high = good) instead of risk, flip the axis.
  const higherIsBetter =
    r.credibilityScore != null || r.credibility != null;

  const signals =
    r.signals ?? r.indicators ?? r.flags ?? r.checks ?? [];

  const verdict =
    r.verdict || r.label || r.summary || r.assessment || undefined;

  const explanation =
    r.explanation || r.reasoning || r.details || r.description || undefined;

  return { score, verdict, signals, explanation, higherIsBetter, raw: r };
}

function pickNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}
