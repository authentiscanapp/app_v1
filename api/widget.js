/**
 * Public widget endpoint.
 *
 * The embeddable widget (public/widget.js) calls this with just a URL and gets
 * back a compact, authoritative score. The partner site never supplies the
 * score itself — it always comes from AuthentiScan, so it can't be faked.
 *
 *   GET  /api/widget?url=https://example.com/article
 *   POST /api/widget          { "url": "https://example.com/article" }
 *
 * Response:
 *   { score, verdict, signals: [{label, value, level}], url, cached }
 *
 * Under the hood it reuses the existing /api/analyze endpoint (same Claude +
 * web-search pipeline) and caches results per URL in Supabase so a widget on a
 * popular page doesn't re-analyze on every page view.
 */
module.exports = async function handler(req, res) {
  // CORS — the widget runs on arbitrary partner domains.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(200).end();

  const rawUrl =
    (req.method === "POST" ? req.body?.url : req.query?.url) || "";
  const url = String(rawUrl).trim();

  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "A valid http(s) url is required" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  // 1) Try the cache first (best-effort; missing table just skips it).
  const cached = await readCache(SUPABASE_URL, SUPABASE_SERVICE_KEY, url, CACHE_TTL_MS);
  if (cached) {
    return res.status(200).json({ ...cached, url, cached: true });
  }

  // 2) Cache miss — analyze via the existing pipeline.
  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const base =
      process.env.AUTHENTISCAN_BASE_URL ||
      (host ? `${proto}://${host}` : "https://app.authentiscanapp.com");

    const r = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "url", text: url, source: "widget" }),
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(502).json({ error: e.error || `analyze failed (${r.status})` });
    }

    const data = await r.json();
    const compact = toCompact(data);

    // 3) Store in cache (best-effort).
    await writeCache(SUPABASE_URL, SUPABASE_SERVICE_KEY, url, compact);

    return res.status(200).json({ ...compact, url, cached: false });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Widget analysis failed" });
  }
};

// Strip citation tags Claude leaves in the text and collapse whitespace.
function strip(s) {
  return typeof s === "string"
    ? s.replace(/<\/?cite[^>]*>/gi, "").replace(/\s{2,}/g, " ").trim()
    : s;
}

// Map an AuthentiScan analysis to the compact shape the widget renders.
// Everything is on the RISK axis (high = worse), matching the widget's colors.
function toCompact(r) {
  const levelToValue = (level) => {
    const l = String(level || "").toLowerCase();
    if (l === "danger") return 85;
    if (l === "warn") return 55;
    if (l === "safe") return 22;
    return 50;
  };

  const signals = Array.isArray(r.signals)
    ? r.signals.slice(0, 3).map((s) => ({
        label: strip(s.name) || "Signal",
        value: levelToValue(s.level),
        level: String(s.level || "").toLowerCase() || undefined,
      }))
    : [];

  return {
    score: typeof r.score === "number" ? r.score : undefined,
    verdict: strip(r.title || r.verdict) || undefined,
    signals,
    explanation: strip(r.desc || r.summary) || undefined,
  };
}

function sbHeaders(key, extra) {
  return Object.assign(
    {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    extra || {}
  );
}

async function readCache(sbUrl, sbKey, url, ttlMs) {
  if (!sbUrl || !sbKey) return null;
  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/widget_cache?url=eq.${encodeURIComponent(url)}&select=payload,created_at`,
      { headers: sbHeaders(sbKey) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    const age = Date.now() - new Date(row.created_at).getTime();
    if (age > ttlMs) return null;
    return row.payload;
  } catch {
    return null;
  }
}

async function writeCache(sbUrl, sbKey, url, payload) {
  if (!sbUrl || !sbKey) return;
  try {
    await fetch(`${sbUrl}/rest/v1/widget_cache`, {
      method: "POST",
      headers: sbHeaders(sbKey, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        url,
        payload,
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // best-effort; ignore
  }
}
