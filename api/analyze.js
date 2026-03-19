import { put, del } from "@vercel/blob";

export default async function handler(req, res) {
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

  const { text, audio, mode } = req.body || {};

  // ══════════════════════════════════════
  // AUDIO MODE
  // ══════════════════════════════════════
  if (mode === "audio" && audio) {
    try {
      const audioBuffer = Buffer.from(audio, "base64");

      // ── STEP 1: Resemble Detect ──
      let resembleScore = null;
      let resembleLabel = null;
      let resembleError = null;
      let blobUrl = null;

      if (RESEMBLE_KEY) {
        try {
          const blob = await put(
            `audio-scan-${Date.now()}.wav`,
            audioBuffer,
            { access: "public", contentType: "audio/wav" }
          );
          blobUrl = blob.url;

          const resembleRes = await fetch("https://app.resemble.ai/api/v2/detect", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEMBLE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "wait",
            },
            body: JSON.stringify({
              url: blobUrl,
              privacy_mode: true,
            }),
          });

          try { await del(blobUrl); } catch (_) {}

          if (!resembleRes.ok) {
            const errData = await resembleRes.json().catch(() => ({}));
            resembleError = errData.message || errData.error || `Resemble error ${resembleRes.status}`;
            console.error("Resemble error:", resembleRes.status, JSON.stringify(errData));
          } else {
            const rData = await resembleRes.json();
            console.log("Resemble response:", JSON.stringify(rData));
            const metrics = rData?.item?.metrics || {};

            // FIX: aggregated_score é probabilidade de ser HUMANO (0=AI, 1=human)
            // Precisamos inverter: aiProbability = 1 - humanProbability
            const rawScore = metrics.aggregated_score ?? metrics.score?.[0] ?? null;
            if (rawScore !== null) {
              const humanProbability = parseFloat(rawScore);
              // aiProbability é o oposto da probabilidade humana
              const aiProbability = 1 - humanProbability;
              resembleScore = Math.max(0, Math.min(1, aiProbability)); // clamp 0-1
              resembleLabel = aiProbability > 0.5 ? "fake" : "real";
            }
          }
        } catch (e) {
          resembleError = e.message;
          if (blobUrl) { try { await del(blobUrl); } catch (_) {} }
          console.error("Resemble exception:", e.message);
        }
      } else {
        resembleError = "RESEMBLE_API_KEY not configured";
      }

      // ── STEP 2: ElevenLabs STT ──
      let transcription = null;
      let transcriptionError = null;

      if (ELEVENLABS_KEY) {
        try {
          const elForm = new FormData();
          elForm.append("file", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");
          elForm.append("model_id", "scribe_v1");
          // Sem language_code = auto-detect nativo do ElevenLabs

          const elRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
            method: "POST",
            headers: { "xi-api-key": ELEVENLABS_KEY },
            body: elForm,
          });

          if (elRes.ok) {
            const elData = await elRes.json();
            const rawTranscription = elData.text || elData.transcription || null;

            // FIX: filtra transcrições inválidas (muito curtas, só ruído, ou não-latinas)
            if (rawTranscription && rawTranscription.trim().length > 2) {
              // Verifica se tem pelo menos algum caractere latino/número
              // Se for só caracteres CJK (chinês/japonês/coreano), descarta
              const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(rawTranscription);
              const hasLatin = /[a-zA-ZÀ-ÿ0-9]/.test(rawTranscription);
              if (!hasCJK || hasLatin) {
                transcription = rawTranscription;
              } else {
                transcriptionError = "Audio language could not be determined — likely noise or silence";
              }
            }
          } else {
            const errData = await elRes.json().catch(() => ({}));
            transcriptionError = errData.detail?.message || `ElevenLabs error ${elRes.status}`;
          }
        } catch (e) {
          transcriptionError = e.message;
        }
      }

      // ── STEP 3: Retorna resultado com score do Resemble ──
      if (resembleScore !== null) {
        // FIX: aiPct agora é corretamente 0-100 (0=humano, 100=AI)
        const aiPct = Math.round(resembleScore * 100); // já está clampado 0-1
        const humanPct = 100 - aiPct;
        const isAI = resembleLabel === "fake";
        const type = aiPct >= 65 ? "danger" : aiPct >= 35 ? "warn" : "safe";
        const verdict = aiPct >= 65 ? "fake" : aiPct >= 35 ? "misleading" : "real";

        return res.status(200).json({
          type,
          score: aiPct,
          verdict,
          title: isAI ? "AI-Generated Voice Detected" : "Voice Appears Authentic",
          desc: isAI
            ? `Resemble Detect identified synthetic voice characteristics with ${aiPct}% AI probability.`
            : `Acoustic analysis found no significant evidence of artificial synthesis. ${humanPct}% probability of being human.`,
          summary: isAI
            ? `Audio has high probability of being AI-generated (${aiPct}% AI).`
            : `Audio appears to be of human origin (${humanPct}% human).`,
          transcription: transcription ? transcription.slice(0, 300) : null,
          signals: [
            {
              name: "Voice Origin",
              desc: isAI
                ? `Resemble DETECT-3B identified synthetic voice patterns with ${aiPct}% AI probability.`
                : `Acoustic patterns consistent with natural human voice (${humanPct}% human probability).`,
              pct: `${aiPct}%`,
              level: type,
              col: type === "safe" ? "#00e676" : type === "warn" ? "#ffb340" : "#ff3b5c",
              dot: type === "safe" ? "#00e676" : type === "warn" ? "#ffb340" : "#ff3b5c",
            },
            {
              name: "Acoustic Analysis",
              desc: `Resemble AI DETECT-3B analyzed ${isAI ? "neural synthesis artifacts" : "natural speech variations"} frame-by-frame.`,
              pct: `${aiPct}%`,
              level: type,
              col: type === "safe" ? "#00e676" : type === "warn" ? "#ffb340" : "#ff3b5c",
              dot: type === "safe" ? "#00e676" : type === "warn" ? "#ffb340" : "#ff3b5c",
            },
            {
              name: "Speech Transcription",
              desc: transcription
                ? `"${transcription.slice(0, 120)}"`
                : transcriptionError
                  ? `Transcription unavailable: ${transcriptionError}`
                  : "Add ELEVENLABS_API_KEY to enable transcription.",
              pct: transcription ? "OK" : "N/A",
              level: transcription ? "safe" : "neutral",
              col: transcription ? "#00e676" : "#5a6475",
              dot: transcription ? "#00e676" : "#5a6475",
            },
            {
              name: "Content Analysis",
              desc: transcription
                ? "Transcription available. Use text mode to verify spoken claims."
                : "Acoustic analysis complete. Transcription required to verify spoken content.",
              pct: "N/A",
              level: "neutral",
              col: "#5a6475",
              dot: "#5a6475",
            },
          ],
        });
      }

      // ── STEP 4: Fallback — usa Claude na transcrição ──
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
    {"name": "Voice Origin", "desc": "Acoustic analysis unavailable — RESEMBLE_API_KEY required", "pct": "N/A", "level": "warn", "col": "#ffb340", "dot": "#ffb340"},
    {"name": "Speech Transcription", "desc": "transcription excerpt here", "pct": "OK", "level": "safe", "col": "#00e676", "dot": "#00e676"},
    {"name": "Audio Integrity", "desc": "coherence evaluation", "pct": "50%", "level": "warn", "col": "#ffb340", "dot": "#ffb340"},
    {"name": "Content Analysis", "desc": "analysis of claims made", "pct": "60%", "level": "warn", "col": "#ffb340", "dot": "#ffb340"}
  ]
}`;

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
            max_tokens: 1000,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{ role: "user", content: audioPrompt }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const fullText = data.content.filter(b => b.type === "text").map(b => b.text).join("");
          const clean = fullText.replace(/```json|```/g, "").trim();
          const jsonMatch = clean.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            analysis.transcription = transcription.slice(0, 300);
            return res.status(200).json(analysis);
          }
        }
      }

      // ── STEP 5: Fallback final ──
      return res.status(200).json({
        type: "warn",
        score: 45,
        verdict: "unverified",
        title: "Configuration Incomplete",
        desc: !RESEMBLE_KEY
          ? "Add RESEMBLE_API_KEY and BLOB_READ_WRITE_TOKEN in Vercel to enable real acoustic AI voice detection."
          : `Detection failed: ${resembleError || "Unknown error"}`,
        summary: "Configure environment variables for complete analysis.",
        signals: [
          { name: "Voice Origin", desc: RESEMBLE_KEY ? (resembleError || "Error") : "RESEMBLE_API_KEY required.", pct: "N/A", level: "warn", col: "#ffb340", dot: "#ffb340" },
          { name: "Acoustic Analysis", desc: "Requires Resemble Detect API + Vercel Blob.", pct: "N/A", level: "warn", col: "#ffb340", dot: "#ffb340" },
          { name: "Speech Transcription", desc: ELEVENLABS_KEY ? (transcriptionError || "No speech detected") : "ELEVENLABS_API_KEY required.", pct: "N/A", level: "warn", col: "#ffb340", dot: "#ffb340" },
          { name: "Content Analysis", desc: "Transcription required.", pct: "N/A", level: "warn", col: "#5a6475", dot: "#5a6475" },
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

  const prompt = `You are an expert fact-checker for AuthentiScan Pro. Analyze this content and return ONLY valid JSON (no markdown, no explanation outside JSON):

Content: """${text.slice(0, 3000)}"""

Return exactly this JSON structure:
{
  "type": "danger",
  "score": 87,
  "title": "High Misinformation Risk",
  "desc": "2-3 sentence analysis of why this content is risky or credible.",
  "verdict": "fake",
  "summary": "One sentence key finding.",
  "signals": [
    {"name": "Claim Accuracy", "desc": "specific finding about claims", "pct": "15%", "level": "danger", "col": "#ff3b5c", "dot": "#ff3b5c"},
    {"name": "Source Credibility", "desc": "source analysis or N/A if no URL", "pct": "N/A", "level": "neutral", "col": "#5a6475", "dot": "#5a6475"},
    {"name": "Emotional Intensity", "desc": "language tone analysis", "pct": "20%", "level": "danger", "col": "#ff3b5c", "dot": "#ff3b5c"},
    {"name": "Context Completeness", "desc": "context analysis", "pct": "25%", "level": "warn", "col": "#ffb340", "dot": "#ffb340"}
  ]
}

Rules:
- type: "danger" if score 65-100, "warn" if 35-64, "safe" if 0-34
- verdict: "fake", "misleading", "real", or "unverified"
- Source Credibility pct MUST be "N/A" if no URL in content
- Be specific about actual claims in the content
- Use web search to verify facts when possible
- col and dot MUST match level: danger="#ff3b5c", warn="#ffb340", safe="#00e676", neutral="#5a6475"`;

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
        max_tokens: 1000,
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
