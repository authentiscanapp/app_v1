const { put, del } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ status: "ok", message: "AuthentiScan API running" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
  const RESEMBLE_KEY = process.env.RESEMBLE_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const FREE_DAILY_LIMIT = 5;
  const userId = req.body?.userId || null;
  const source = req.body?.source || "app";

  // ── Scan limit check ──
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
          return res.status(429).json({ error: "Daily scan limit reached", limit: FREE_DAILY_LIMIT, code: "LIMIT_REACHED" });
        }
      }
    } catch (e) { console.warn("Limit check failed:", e.message); }
  }

  // ── Log scan ──
  async function logScan({ mode, url, score, type, verdict, title }) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/scan_logs`, {
        method: "POST",
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ mode, source, url: url ? url.slice(0, 500) : null, score, type, verdict: verdict || null, title: title ? title.slice(0, 200) : null, user_id: userId || null }),
      });
    } catch (e) { console.warn("logScan failed:", e.message); }
  }

  // ── Gemini: returns clean JSON ──
  async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error?.message || `Gemini error ${r.status}`);
    }
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  }

  // ── Google Custom Search for domain context ──
  async function googleSearch(query) {
    const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY;
    const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
    if (!GOOGLE_CSE_KEY || !GOOGLE_CSE_ID) return "";
    try {
      const r = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=3`);
      if (!r.ok) return "";
      const d = await r.json();
      return (d.items || []).map(i => `${i.title}: ${i.snippet}`).join("\n");
    } catch (e) { return ""; }
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
      let resembleScore = null, resembleLabel = null, resembleError = null, blobUrl = null;

      if (RESEMBLE_KEY) {
        try {
          const blob = await put(`audio-scan-${Date.now()}.${ext}`, audioBuffer, { access: "public", contentType: mime });
          blobUrl = blob.url;
          const rr = await fetch("https://app.resemble.ai/api/v2/detect", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEMBLE_KEY}`, "Content-Type": "application/json", "Prefer": "wait" },
            body: JSON.stringify({ url: blobUrl }),
          });
          try { await del(blobUrl); } catch (_) {}
          if (!rr.ok) {
            const e = await rr.json().catch(() => ({}));
            resembleError = e.message || e.error || `Resemble error ${rr.status}`;
          } else {
            const rd = await rr.json();
            const metrics = rd?.item?.metrics || {};
            const raw = metrics.aggregated_score ?? metrics.score?.[0] ?? null;
            resembleScore = raw !== null ? Math.min(1, Math.max(0, parseFloat(raw))) : null;
            resembleLabel = metrics.label || (resembleScore > 0.5 ? "fake" : "real");
          }
        } catch (e) {
          resembleError = e.message;
          if (blobUrl) { try { await del(blobUrl); } catch (_) {} }
        }
      } else { resembleError = "RESEMBLE_API_KEY not configured"; }

      let transcription = null, transcriptionError = null;
      if (ELEVENLABS_KEY) {
        try {
          const f = new FormData();
          f.append("file", new Blob([audioBuffer], { type: mime }), `audio.${ext}`);
          f.append("model_id", "scribe_v1");
          const er = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": ELEVENLABS_KEY }, body: f });
          if (er.ok) { const ed = await er.json(); transcription = ed.text || ed.transcription || null; }
          else { const ed = await er.json().catch(() => ({})); transcriptionError = ed.detail?.message || `ElevenLabs error ${er.status}`; }
        } catch (e) { transcriptionError = e.message; }
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
          desc: isAI ? `Resemble Detect identified synthetic voice characteristics with ${aiPct}% confidence.` : `Acoustic analysis found no significant evidence of artificial synthesis. ${100 - aiPct}% probability of being human.`,
          summary: isAI ? `Audio has high probability of being AI-generated (${aiPct}%).` : `Audio appears to be of human origin (${100 - aiPct}% human).`,
          transcription: transcription ? transcription.slice(0, 300) : null,
          signals: [
            { name: "Voice Origin", desc: isAI ? `Resemble DETECT-3B identified synthetic voice patterns with ${aiPct}% probability.` : `Acoustic patterns consistent with natural human voice.`, pct: `${aiPct}%`, level: type },
            { name: "Acoustic Analysis", desc: `Resemble AI DETECT-3B analyzed ${isAI ? "neural synthesis artifacts" : "natural speech variations"} frame-by-frame.`, pct: `${aiPct}%`, level: type },
            { name: "Speech Transcription", desc: transcription ? `"${transcription.slice(0, 120)}"` : transcriptionError ? `Unavailable: ${transcriptionError}` : "Add ELEVENLABS_API_KEY to enable.", pct: transcription ? "OK" : "N/A", level: transcription ? "safe" : "neutral" },
            { name: "Content Analysis", desc: "Use text mode to verify spoken claims.", pct: "N/A", level: "neutral" },
          ],
        });
      }

      return res.status(200).json({
        type: "warn", score: 45, verdict: "unverified", title: "Configuration Incomplete",
        desc: !RESEMBLE_KEY ? "Add RESEMBLE_API_KEY to enable voice detection." : `Detection failed: ${resembleError || "Unknown error"}`,
        summary: "Configure environment variables for complete analysis.",
        signals: [
          { name: "Voice Origin", desc: RESEMBLE_KEY ? (resembleError || "Error") : "RESEMBLE_API_KEY required.", pct: "N/A", level: "warn" },
          { name: "Acoustic Analysis", desc: "Requires Resemble Detect API.", pct: "N/A", level: "warn" },
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
  if (!text || text.trim().length < 5) return res.status(400).json({ error: "No content provided" });

  try {
    // Optional: get search context for URLs
    const isUrl = text.trim().match(/^https?:\/\//i);
    let searchContext = "";
    if (isUrl) {
      const domain = text.trim().replace(/^https?:\/\//, "").split("/")[0];
      searchContext = await googleSearch(`${domain} credibility reputation scam`);
    }

    const prompt = `You are a fact-checker for AuthentiScan Pro. Analyze the content below for misinformation, scams, and credibility risks.
${searchContext ? `\nSearch context about this source:\n${searchContext}\n` : ""}
Content: """${text.slice(0, 3000)}"""

Respond with ONLY a JSON object. No markdown. No backticks. No explanation. Start with { end with }.

Use this exact structure:
{"type":"danger","score":87,"title":"High Misinformation Risk","desc":"2-3 sentences about why this is risky or credible.","verdict":"fake","summary":"One sentence finding.","signals":[{"name":"Claim Accuracy","desc":"finding about claims","pct":"15%","level":"danger"},{"name":"Source Credibility","desc":"finding about source","pct":"5%","level":"danger"},{"name":"Emotional Intensity","desc":"tone analysis","pct":"20%","level":"danger"},{"name":"Context Completeness","desc":"context analysis","pct":"25%","level":"warn"}]}

Rules:
- type: "danger" if score 65-100, "warn" if 35-64, "safe" if 0-34
- verdict: "fake", "misleading", "real", or "unverified"
- Source Credibility pct: "N/A" if no URL
- Return ONLY the JSON, nothing else`;

    const raw = await callGemini(prompt);
    const clean = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);
    await logScan({ mode: isUrl ? "url" : "text", url: isUrl ? text.trim().slice(0, 500) : null, score: result.score, type: result.type, verdict: result.verdict, title: result.title });
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message, detail: "Check GEMINI_API_KEY in Vercel environment variables" });
  }
}
