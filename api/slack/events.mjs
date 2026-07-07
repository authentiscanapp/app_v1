import { getRawBody, verifySlackSignature } from "../../lib/verify.mjs";
import { postMessage, downloadSlackFile, buildResultBlocks } from "../../lib/slack.mjs";
import { analyzeUrl, analyzeAudio } from "../../lib/authentiscan.mjs";
import { getBotToken } from "../../lib/installations.mjs";

// Disable Vercel's automatic body parsing so we can verify the raw signature.
export const config = { api: { bodyParser: false } };

// Set RESPOND_TO_ALL_MESSAGES=true to react to any message with a link/audio.
// Default false = only reacts when the bot is @mentioned (less noisy, easier to approve).
const RESPOND_TO_ALL = process.env.RESPOND_TO_ALL_MESSAGES === "true";

// Best-effort in-memory dedupe within a warm instance (Slack may resend events).
const seen = new Set();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = await getRawBody(req);

  if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET, req.headers, rawBody)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "Bad JSON" });
    return;
  }

  // 1) Slack URL verification handshake (run once when you set the Request URL).
  if (body.type === "url_verification") {
    res.status(200).json({ challenge: body.challenge });
    return;
  }

  // 2) Ignore Slack's retry attempts to avoid double-processing.
  if (req.headers["x-slack-retry-num"]) {
    res.status(200).json({ ok: true });
    return;
  }

  // 3) Dedupe by event_id within this warm instance.
  if (body.event_id) {
    if (seen.has(body.event_id)) {
      res.status(200).json({ ok: true });
      return;
    }
    seen.add(body.event_id);
    if (seen.size > 500) seen.clear();
  }

  // 4) Process the event BEFORE responding.
  //    On Vercel, code after the response is sent is not reliably executed
  //    (the function can be frozen), so we must finish the work first.
  //    Slack allows ~3s; if analysis is slower, Slack retries and we ignore
  //    the retry above, so the first invocation still posts exactly once.
  try {
    if (body.type === "event_callback") {
      const token = await getBotToken(body.team_id);
      await handleEvent(body.event, token);
    }
  } catch (err) {
    console.error("[events] processing error:", err);
  }

  res.status(200).json({ ok: true });
}

async function handleEvent(event, token) {
  if (!event || !token) return;

  const isMention = event.type === "app_mention";
  const isMessage = event.type === "message";

  if (!isMention && !isMessage) return;
  if (!isMention && !RESPOND_TO_ALL) return; // only mentions unless opted in

  // Ignore bot/self messages and edits to prevent loops.
  if (event.bot_id || event.subtype === "bot_message") return;
  if (event.subtype && event.subtype !== "file_share") return;

  const channel = event.channel;
  const threadTs = event.thread_ts || event.ts;

  // --- Audio files take priority ---
  const audioFile = (event.files || []).find(
    (f) => (f.mimetype || "").startsWith("audio/")
  );
  if (audioFile && audioFile.url_private) {
    try {
      const buf = await downloadSlackFile(audioFile.url_private, token);
      const result = await analyzeAudio(buf, audioFile.name, audioFile.mimetype);
      await postMessage({
        token,
        channel,
        threadTs,
        blocks: buildResultBlocks({
          kind: "audio",
          target: audioFile.name,
          result,
        }),
        text: `AuthentiScan result for ${audioFile.name}`,
      });
    } catch (err) {
      await postErr(token, channel, threadTs, err);
    }
    return;
  }

  // --- Otherwise: analyze a URL if present, else the plain text ---
  const url = extractUrl(event.text || "");
  const content = url || stripMentions(event.text || "");

  if (!content || content.trim().length < 5) {
    if (isMention) {
      await postMessage({
        token,
        channel,
        threadTs,
        text: "Paste a link, some text, or attach an audio file and I'll analyze it. 🔎",
      });
    }
    return;
  }

  try {
    const result = await analyzeUrl(content);
    await postMessage({
      token,
      channel,
      threadTs,
      blocks: buildResultBlocks({
        kind: url ? "url" : "text",
        target: url || null,
        result,
      }),
      text: "AuthentiScan result",
    });
  } catch (err) {
    await postErr(token, channel, threadTs, err);
  }
}

// Slack wraps links as <https://...|label>. Handle both wrapped and bare URLs.
function extractUrl(text) {
  const wrapped = text.match(/<(https?:\/\/[^>|\s]+)(?:\|[^>]*)?>/i);
  if (wrapped) return wrapped[1];
  const bare = text.match(/https?:\/\/[^\s]+/i);
  return bare ? bare[0] : null;
}

// Remove Slack mentions like <@U123ABC> so we analyze only the real text.
function stripMentions(text) {
  return text.replace(/<@[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function postErr(token, channel, threadTs, err) {
  console.error("[analyze] error:", err);
  await postMessage({
    token,
    channel,
    threadTs,
    text: "⚠️ I couldn't complete the analysis right now. Please try again in a moment.",
  });
}
