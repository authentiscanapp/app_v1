/**
 * AuthentiScan Pro — shared analysis engine
 *
 * Pure analysis logic reused by the public API (api/v1/analyze.js).
 * Returns the INTERNAL result shape:
 *   { type, score, verdict, title, desc, summary, signals[], transcription? }
 *
 * The public endpoint maps this to the documented public contract.
 * The legacy app endpoint (api/analyze.js) is intentionally left untouched.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";

/**
 * Analyze a URL or free text for misinformation / scam / credibility risk.
 * @returns internal result object
 */
async function analyzeText({ text, anthropicKey }) {
  const systemPrompt =
    `You are an expert fact-checker for AuthentiScan Pro. Use web_search only once to verify the domain or a key claim. Do not run multiple searches. Return concise JSON only.`;

  const prompt = `Analyze this content for misinformation, scams, and credibility risks. Use web_search first, then return ONLY valid JSON (no markdown, no explanation outside JSON):

Content: """${text.slice(0, 3000)}"""

{
  "type": "danger",
  "score": 87,
  "title": "High Misinformation Risk",
  "desc": "2-3 sentence analysis based on what you found. If a URL, explain what the domain is and why it is risky or credible.",
  "verdict": "fake",
  "summary": "One sentence key finding.",
  "signals": [
    {"name": "Claim Accuracy", "desc": "specific finding about claims", "pct": "15%", "level": "danger"},
    {"name": "Source Credibility", "desc": "what you found about this domain/source", "pct": "5%", "level": "danger"},
    {"name": "Emotional Intensity", "desc": "language tone analysis", "pct": "20%", "level": "danger"},
    {"name": "Context Completeness", "desc": "context analysis", "pct": "25%", "level": "warn"}
  ]
}

Rules:
- type: "danger" if score 65-100, "warn" if 35-64, "safe" if 0-34
- verdict: "fake", "misleading", "real", or "unverified"
- Source Credibility pct MUST be "N/A" if no URL in content
- Be specific — mention the actual domain name and what you found about it
- Score must reflect what you actually found via web search — do not guess`;

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const e = new Error(err.error?.message || `Anthropic API error ${response.status}`);
    e.upstreamStatus = response.status;
    throw e;
  }

  const data = await response.json();
  const fullText = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const clean = fullText.replace(/```json|```/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in model response");

  return JSON.parse(jsonMatch[0]);
}

/**
 * Analyze base64 audio for AI/synthetic voice + optional transcription.
 * Requires RESEMBLE (acoustic) and/or ELEVENLABS (transcription) keys.
 * @returns internal result object
 */
async function analyzeAudio({ audio, audioMime, audioExt, anthropicKey, resembleKey, elevenLabsKey }) {
  const { put, del } = require("@vercel/blob");

  const audioBuffer = Buffer.from(audio, "base64");
  const mime = audioMime || "audio/wav";
  const ext = audioExt || "wav";

  let resembleScore = null;
  let resembleLabel = null;
  let resembleError = null;
  let blobUrl = null;

  if (resembleKey) {
    try {
      const blob = await put(`audio-scan-${Date.now()}.${ext}`, audioBuffer, {
        access: "public",
        contentType: mime,
      });
      blobUrl = blob.url;

      const resembleRes = await fetch("https://app.resemble.ai/api/v2/detect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resembleKey}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({ url: blobUrl }),
      });

      try { await del(blobUrl); } catch (_) {}

      if (!resembleRes.ok) {
        const errData = await resembleRes.json().catch(() => ({}));
        resembleError = errData.message || errData.error || `Resemble error ${resembleRes.status}`;
      } else {
        const rData = await resembleRes.json();
        const metrics = rData?.item?.metrics || {};
        const rawScore = metrics.aggregated_score ?? metrics.score?.[0] ?? null;
        resembleScore = rawScore !== null ? Math.min(1, Math.max(0, parseFloat(rawScore))) : null;
        resembleLabel = metrics.label || (resembleScore > 0.5 ? "fake" : "real");
      }
    } catch (e) {
      resembleError = e.message;
      if (blobUrl) { try { await del(blobUrl); } catch (_) {} }
    }
  } else {
    resembleError = "RESEMBLE_API_KEY not configured";
  }

  let transcription = null;
  let transcriptionError = null;

  if (elevenLabsKey) {
    try {
      const elForm = new FormData();
      elForm.append("file", new Blob([audioBuffer], { type: mime }), `audio.${ext}`);
      elForm.append("model_id", "scribe_v1");

      const elRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": elevenLabsKey },
        body: elForm,
      });

      if (elRes.ok) {
        const elData = await elRes.json();
        transcription = elData.text || elData.transcription || null;
      } else {
        const errData = await elRes.json().catch(() => ({}));
        transcriptionError = errData.detail?.message || `ElevenLabs error ${elRes.status}`;
      }
    } catch (e) {
      transcriptionError = e.message;
    }
  }

  // Acoustic detection succeeded → build a voice-origin result
  if (resembleScore !== null) {
    const aiPct = Math.round(resembleScore * 100);
    const isAI = resembleLabel === "fake" || resembleScore > 0.5;
    const type = aiPct >= 65 ? "danger" : aiPct >= 35 ? "warn" : "safe";
    const verdict = aiPct >= 65 ? "fake" : aiPct >= 35 ? "misleading" : "real";
    const title = isAI ? "AI-Generated Voice Detected" : "Voice Appears Authentic";

    return {
      type, score: aiPct, verdict, title,
      desc: isAI
        ? `Resemble Detect identified synthetic voice characteristics with ${aiPct}% confidence.`
        : `Acoustic analysis found no significant evidence of artificial synthesis. ${100 - aiPct}% probability of being human.`,
      summary: isAI
        ? `Audio has high probability of being AI-generated (${aiPct}%).`
        : `Audio appears to be of human origin (${100 - aiPct}% human).`,
      transcription: transcription ? transcription.slice(0, 300) : null,
      signals: [
        { name: "Voice Origin", desc: isAI ? `Resemble DETECT-3B identified synthetic voice patterns with ${aiPct}% probability.` : `Acoustic patterns consistent with natural human voice (${aiPct}% AI probability).`, pct: `${aiPct}%`, level: type },
        { name: "Acoustic Analysis", desc: `Resemble AI DETECT-3B analyzed ${isAI ? "neural synthesis artifacts" : "natural speech variations"} frame-by-frame.`, pct: `${aiPct}%`, level: type },
        { name: "Speech Transcription", desc: transcription ? `"${transcription.slice(0, 120)}"` : transcriptionError ? `Transcription unavailable: ${transcriptionError}` : "Transcription disabled.", pct: transcription ? "OK" : "N/A", level: transcription ? "safe" : "neutral" },
        { name: "Content Analysis", desc: transcription ? "Transcription available. Use text mode to verify spoken claims." : "Acoustic analysis complete. Transcription required to verify spoken content.", pct: "N/A", level: "neutral" },
      ],
    };
  }

  // Acoustic failed but we have a transcription → fall back to content analysis
  if (transcription && transcription.trim().length > 0) {
    const audioPrompt = `You are a fact-checker for AuthentiScan Pro. Analyze this audio transcription for misinformation. Return ONLY valid JSON:

Transcription: """${transcription.slice(0, 3000)}"""

{
  "type": "warn",
  "score": 50,
  "title": "Audio Content Analysis",
  "desc": "2-3 sentences about credibility.",
  "verdict": "unverified",
  "summary": "One sentence conclusion.",
  "signals": [
    {"name": "Voice Origin", "desc": "Acoustic analysis unavailable", "pct": "N/A", "level": "warn"},
    {"name": "Speech Transcription", "desc": "transcription excerpt here", "pct": "OK", "level": "safe"},
    {"name": "Audio Integrity", "desc": "coherence evaluation", "pct": "50%", "level": "warn"},
    {"name": "Content Analysis", "desc": "analysis of claims made", "pct": "60%", "level": "warn"}
  ]
}`;

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: audioPrompt }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const fullText = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const clean = fullText.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        analysis.transcription = transcription.slice(0, 300);
        return analysis;
      }
    }
  }

  // Nothing worked → signal upstream so the endpoint returns 422
  const e = new Error(resembleError || "Audio could not be analyzed");
  e.code = "AUDIO_FORMAT_UNSUPPORTED";
  e.status = 422;
  throw e;
}

module.exports = { analyzeText, analyzeAudio };
