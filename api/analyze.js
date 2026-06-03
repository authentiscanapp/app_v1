import { put, del } from "@vercel/blob";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ status: "ok", message: "AuthentiScan API running" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { text, audio, mode, audioMime, audioExt } = req.body || {};

  // ══════════════════════════════════════
  // AUDIO MODE — Gemini 2.5 Flash (replaces Resemble AI + ElevenLabs)
  // ══════════════════════════════════════
  if (mode === "audio" && audio) {
    if (!GEMINI_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    try {
      const audioBuffer = Buffer.from(audio, "base64");
      const mime = audioMime || "audio/wav";
      const audioBase64 = audioBuffer.toString("base64");

      const geminiPrompt = `You are an expert in deepfake audio detection and fact-checking for AuthentiScan Pro.

Analyze this audio file for:
1. Signs of AI-generated or synthetic voice (artifacts, unnatural cadence, robotic tone, TTS patterns)
2. Whether the spoken content contains misinformation, scams, or false claims
3. Overall credibility risk

Return ONLY a valid JSON object, no markdown, no explanation outside JSON:

{
  "type": "danger",
  "score": 87,
  "title": "AI-Generated Voice Detected",
  "desc": "2-3 sentences about what you found in this audio.",
  "verdict": "fake",
  "summary": "One sentence key finding.",
  "transcription": "Full transcription of spoken content here.",
  "signals": [
    {"name": "Voice Origin", "desc": "specific finding about voice authenticity", "pct": "87%", "level": "danger"},
    {"name": "Acoustic Analysis", "desc": "specific artifacts or natural patterns found", "pct": "85%", "level": "danger"},
    {"name": "Speech Transcription", "desc": "excerpt of what was said", "pct": "OK", "level": "safe"},
    {"name": "Content Analysis", "desc": "credibility of spoken claims", "pct": "70%", "level": "warn"}
  ]
}

Rules:
- type: "danger" if score 65-100, "warn" if 35-64, "safe" if 0-34
- verdict: "fake" (AI voice), "misleading", "real" (human voice), or "unverified"
- score reflects AI voice probability (0 = definitely human, 100 = definitely AI)
- transcription: full text of what is spoken in the audio`;

      const genai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const model = genai.models;

      const response = await model.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: geminiPrompt },
              { inlineData: { mimeType: mime, data: audioBase64 } },
            ],
          },
        ],
      });

      const rawText = response.text ?? "";
      const clean = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Gemini did not return valid JSON");
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return res.status(200).json(analysis);

    } catch (err) {
      console.error("Audio analysis error:", err.message);
      return res.status(500).json({ error: "Audio analysis failed: " + err.message });
    }
  }

  // ══════════════════════════════════════
  // TEXT / URL MODE — Claude Sonnet (unchanged)
  // ══════════════════════════════════════
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ error: "No content provided" });
  }

  const systemPrompt = `You are an expert fact-checker for AuthentiScan Pro. You ALWAYS use web_search before making any assessment. This is mandatory — never skip it. Search for the domain reputation, credibility, and any known issues before evaluating. Your score must reflect what you actually find via web search, never guess.`;

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

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const fullText = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    const clean = fullText.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      detail: "Check ANTHROPIC_API_KEY in Vercel environment variables",
    });
  }
}
