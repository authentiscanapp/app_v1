const { put, del } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ status: "ok", message: "AuthentiScan API running" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
  const RESEMBLE_KEY = process.env.RESEMBLE_API_KEY;

  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const FREE_DAILY_LIMIT = 5;

  const userId = req.body?.userId || null;
  const source = req.body?.source || "app";

  if (userId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_pro`,
        { headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const profiles = await profileRes.json();
      const isPro = profiles?.[0]?.is_pro === true;

      if (!isPro) {
        const today = new Date().toISOString().slice(0, 10);
        const scansRes = await fetch(
          `${SUPABASE_URL}/rest/v1/scans?user_id=eq.${userId}&created_at=gte.${today}T00:00:00Z&select=id`,
          { headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Prefer": "count=exact" } }
        );
        const countHeader = scansRes.headers.get("content-range");
        const todayCount = countHeader ? parseInt(countHeader.split("/")[1]) : 0;

        if (todayCount >= FREE_DAILY_LIMIT) {
          return res.status(429).json({
            error: "Daily scan limit reached",
            limit: FREE_DAILY_LIMIT,
            code: "LIMIT_REACHED",
          });
        }
      }
    } catch (e) {
      console.warn("Limit check failed:", e.message);
    }
  }

  // ── Helper: log scan to Supabase ──
  async function logScan({ mode, url, score, type, verdict, title }) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/scan_logs`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          mode,
          source,
          url: url ? url.slice(0, 500) : null,
          score,
          type,
          verdict: verdict || null,
          title: title ? title.slice(0, 200) : null,
          user_id: userId || null,
        }),
      });
    } catch (e) {
      console.warn("logScan failed:", e.message);
    }
  }

  const { text, audio, mode, audioMime, audioExt } = req.body || {};

  // ══════════════════════════════════════
  // AUDIO MODE
  // ══════════════════════════════════════
  if (mode === "audio" && audio) {
    try {
      const audioBuffer = Buffer.from(audio, "base64");
      const mime = audioMime || "audio/wav";
      const ext = audioExt || "wav";

      let resembleScore = null;
      let resembleLabel = null;
      let resembleError = null;
      let blobUrl = null;

      if (RESEMBLE_KEY) {
        try {
          const blob = await put(
            `audio-scan-${Date.now()}.${ext}`,
            audioBuffer,
            { access: "public", contentType: mime }
          );
          blobUrl = blob.url;

          const resembleRes = await fetch("https://app.resemble.ai/api/v2/detect", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEMBLE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "wait",
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

      if (ELEVENLABS_KEY) {
        try {
          const elForm = new FormData();
          elForm.append("file", new Blob([audioBuffer], { type: mime }), `audio.${ext}`);
          elForm.append("model_id", "scribe_v1");

          const elRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
            method: "POST",
            headers: { "xi-api-key": ELEVENLABS_KEY },
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

      if (resembleScore !== null) {
        const aiPct = Math.round(resembleScore * 100);
        const isAI = resembleLabel === "fake" || resembleScore > 0.5;
        const type = aiPct >= 65 ? "danger" : aiPct >= 35 ? "warn" : "safe";
        const verdict = aiPct >= 65 ? "fake" : aiPct >= 35 ? "misleading" : "real";
        const title = isAI ? "AI-Generated Voice Detected" : "Voice Appears Authentic";

        await logScan({ mode: "audio", url: null, score: aiPct, type, verdict, title });

        return res.status(200).json({
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
            { name: "Speech Transcription", desc: transcription ? `"${transcription.slice(0, 120)}"` : transcriptionError ? `Transcription unavailable: ${transcriptionError}` : "Add ELEVENLABS_API_KEY to enable transcription.", pct: transcription ? "OK" : "N/A", level: transcription ? "safe" : "neutral" },
            { name: "Content Analysis", desc: transcription ? "Transcription available. Use text mode to verify spoken claims." : "Acoustic analysis complete. Transcription required to verify spoken content.", pct: "N/A", level: "neutral" },
          ],
        });
      }

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
    {"name": "Voice Origin", "desc": "Acoustic analysis unavailable — RESEMBLE_API_KEY required", "pct": "N/A", "level": "warn"},
    {"name": "Speech Transcription", "desc": "transcription excerpt here", "pct": "OK", "level": "safe"},
    {"name": "Audio Integrity", "desc": "coherence evaluation", "pct": "50%", "level": "warn"},
    {"name": "Content Analysis", "desc": "analysis of claims made", "pct": "60%", "level": "warn"}
  ]
}`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-beta": "web-search-2025-03-05" },
          body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: audioPrompt }] }),
        });

        if (response.ok) {
          const data = await response.json();
          const fullText = data.content.filter(b => b.type === "text").map(b => b.text).join("");
          const clean = fullText.replace(/```json|```/g, "").trim();
          const jsonMatch = clean.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            analysis.transcription = transcription.slice(0, 300);
            await logScan({ mode: "audio", url: null, score: analysis.score, type: analysis.type, verdict: analysis.verdict, title: analysis.title });
            return res.status(200).json(analysis);
          }
        }
      }

      return res.status(200).json({
        type: "warn", score: 45, verdict: "unverified",
        title: "Configuration Incomplete",
        desc: !RESEMBLE_KEY ? "Add RESEMBLE_API_KEY and BLOB_READ_WRITE_TOKEN in Vercel to enable real acoustic AI voice detection." : `Detection failed: ${resembleError || "Unknown error"}`,
        summary: "Configure environment variables for complete analysis.",
        signals: [
          { name: "Voice Origin", desc: RESEMBLE_KEY ? (resembleError || "Error") : "RESEMBLE_API_KEY required.", pct: "N/A", level: "warn" },
          { name: "Acoustic Analysis", desc: "Requires Resemble Detect API + Vercel Blob.", pct: "N/A", level: "warn" },
          { name: "Speech Transcription", desc: ELEVENLABS_KEY ? (transcriptionError || "No speech detected") : "ELEVENLABS_API_KEY required.", pct: "N/A", level: "warn" },
          { name: "Content Analysis", desc: "Transcription required.", pct: "N/A", level: "warn" },
        ],
      });

    } catch (err) {
      return res.status(500).json({ error: "Audio analysis failed: " + err.message });
    }
  }

  // ══════════════════════════════════════
  // TEXT / URL MODE
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
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-beta": "web-search-2025-03-05" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 2000, system: systemPrompt, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: prompt }] }),
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

    const result = JSON.parse(jsonMatch[0]);

    // Detect if input is a URL
    const isUrl = text.trim().match(/^https?:\/\//i);
    await logScan({
      mode: isUrl ? "url" : "text",
      url: isUrl ? text.trim().slice(0, 500) : null,
      score: result.score,
      type: result.type,
      verdict: result.verdict,
      title: result.title,
    });

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      detail: "Check ANTHROPIC_API_KEY in Vercel environment variables",
    });
  }
}
