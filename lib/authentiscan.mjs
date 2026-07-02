/**
 * Adapter to the real AuthentiScan /api/analyze endpoint.
 *
 * Contract (from api/analyze.js):
 *   REQUEST (text/URL): POST { text, source }
 *   REQUEST (audio):    POST { mode:"audio", audio:<base64>, audioMime, audioExt, source }
 *   RESPONSE (200):     { type, score, title, verdict, desc, summary, signals:[{name,desc,pct,level}] }
 *   score is a RISK score: higher = more risk (danger).
 */

const API_URL =
  process.env.AUTHENTISCAN_API_URL ||
  "https://app.authentiscanapp.com/api/analyze";

// Analyze a URL or free text. The endpoint reads the `text` field.
export async function analyzeUrl(text) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source: "slack" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `analyze API ${res.status}`);
  return normalize(data);
}

// Analyze audio. The endpoint expects base64 audio in JSON (not multipart).
export async function analyzeAudio(buffer, filename, mimetype) {
  const audioExt = (
    filename && filename.includes(".")
      ? filename.split(".").pop()
      : (mimetype || "").split("/").pop() || "wav"
  ).toLowerCase();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "audio",
      audio: buffer.toString("base64"),
      audioMime: mimetype || "audio/wav",
      audioExt,
      source: "slack",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `analyze API ${res.status}`);
  return normalize(data);
}

// Strip web-search citation tags (<cite index="...">) that /api/analyze leaves
// in the text, and collapse leftover whitespace.
function strip(s) {
  return typeof s === "string"
    ? s.replace(/<\/?cite[^>]*>/gi, "").replace(/\s{2,}/g, " ").trim()
    : s;
}

// Map AuthentiScan's response into the shape the Slack formatter expects.
function normalize(r) {
  const signals = Array.isArray(r.signals)
    ? r.signals.map((s) => {
        const pct = s.pct && s.pct !== "N/A" ? ` (${s.pct})` : "";
        return { label: s.name, value: `${strip(s.desc) || ""}${pct}`.trim() };
      })
    : [];
  return {
    score: typeof r.score === "number" ? r.score : undefined,
    verdict: strip(r.title || r.verdict) || "Analysis complete",
    signals,
    explanation: strip(r.desc || r.summary) || undefined,
    higherIsBetter: false, // score is a RISK score: higher = worse
    raw: r,
  };
}
