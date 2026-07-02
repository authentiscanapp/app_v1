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

// Map AuthentiScan's response into the shape the Slack formatter expects.
function normalize(r) {
  const signals = Array.isArray(r.signals)
    ? r.signals.map((s) => ({ label: s.name, value: s.pct }))
    : [];
  return {
    score: typeof r.score === "number" ? r.score : undefined,
    verdict: r.title || r.verdict || "Analysis complete",
    signals,
    explanation: r.desc || r.summary || undefined,
    higherIsBetter: false, // score is a RISK score: higher = worse
    raw: r,
  };
}
