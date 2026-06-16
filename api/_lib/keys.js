/**
 * AuthentiScan Pro — API key authentication & per-key rate limiting
 *
 * Keys are stored in the Supabase `api_keys` table as SHA-256 hashes
 * (never plaintext). Daily usage is counted from `api_requests`.
 * See supabase/api_keys.sql for the schema.
 */

const crypto = require("crypto");

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Unix timestamp (seconds) of the next UTC midnight — when the daily quota resets. */
function resetEpoch() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.floor(next.getTime() / 1000);
}

function rateLimitHeaders(limit, remaining) {
  return {
    "X-RateLimit-Limit": String(limit == null ? "unlimited" : limit),
    "X-RateLimit-Remaining": String(remaining == null ? "unlimited" : Math.max(0, remaining)),
    "X-RateLimit-Reset": String(resetEpoch()),
  };
}

/**
 * Validate the Bearer token and enforce the per-key daily quota.
 * @returns { ok, status, code, error, keyRow, usedToday, limit, remaining }
 */
async function authenticate(req, { supabaseUrl, serviceKey }) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";

  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", error: "Authorization header missing or not Bearer type" };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", error: "Bearer token is empty" };
  }
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, status: 500, code: "INTERNAL_ERROR", error: "Key store not configured" };
  }

  const hash = sha256(token);

  // Look up the key by its hash
  let keyRow;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/api_keys?key_hash=eq.${hash}&select=id,label,plan,daily_limit,active&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await res.json();
    keyRow = Array.isArray(rows) ? rows[0] : null;
  } catch (e) {
    return { ok: false, status: 503, code: "SERVICE_UNAVAILABLE", error: "Key validation failed" };
  }

  if (!keyRow) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", error: "Invalid API key" };
  }
  if (keyRow.active === false) {
    return { ok: false, status: 403, code: "FORBIDDEN", error: "API key has been revoked" };
  }

  // daily_limit null or 0 ⇒ unlimited (enterprise)
  const limit = keyRow.daily_limit && keyRow.daily_limit > 0 ? keyRow.daily_limit : null;

  let usedToday = 0;
  if (limit != null) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `${supabaseUrl}/rest/v1/api_requests?api_key_id=eq.${keyRow.id}&created_at=gte.${today}T00:00:00Z&select=id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "count=exact" } }
      );
      const range = res.headers.get("content-range");
      usedToday = range ? parseInt(range.split("/")[1]) || 0 : 0;
    } catch (_) { /* fail open on counting errors */ }
  }

  const remaining = limit != null ? limit - usedToday : null;

  if (limit != null && usedToday >= limit) {
    return {
      ok: false, status: 429, code: "RATE_LIMIT_EXCEEDED",
      error: "Daily request quota reached. Retry after X-RateLimit-Reset.",
      keyRow, usedToday, limit, remaining: 0,
    };
  }

  return { ok: true, keyRow, usedToday, limit, remaining };
}

/**
 * Record a successful request (for quota counting + analytics) and bump
 * the key's last_used_at / total_requests. Best-effort; never throws.
 */
async function logRequest({ supabaseUrl, serviceKey, keyRow, mode, riskLevel, score }) {
  if (!supabaseUrl || !serviceKey || !keyRow) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/api_requests`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        api_key_id: keyRow.id,
        mode: mode || null,
        risk_level: riskLevel || null,
        score: typeof score === "number" ? score : null,
      }),
    });
  } catch (_) { /* best effort */ }
}

module.exports = { authenticate, logRequest, rateLimitHeaders, sha256 };
