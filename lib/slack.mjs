const SLACK_API = "https://slack.com/api";

/**
 * Posts a message back to a Slack channel.
 * Uses Block Kit if `blocks` is provided, otherwise plain text.
 */
export async function postMessage({ token, channel, text, blocks, threadTs }) {
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      text: text || "AuthentiScan result",
      blocks,
      thread_ts: threadTs || undefined,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  const data = await res.json();
  if (!data.ok) console.error("[slack] postMessage failed:", data.error);
  return data;
}

/**
 * Downloads a Slack-hosted file (e.g. an audio clip) using the bot token.
 * Slack file.url_private requires the Authorization header.
 * Returns a Buffer.
 */
export async function downloadSlackFile(urlPrivate, token) {
  const res = await fetch(urlPrivate, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slack file download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Builds a clean Block Kit message from a normalized analysis result.
 * Falls back gracefully if some fields are missing.
 */
export function buildResultBlocks({ kind, target, result }) {
  const score = result.score;
  const verdict = result.verdict || "Analysis complete";
  const emoji = scoreEmoji(score, result.higherIsBetter);

  const header = {
    type: "header",
    text: { type: "plain_text", text: `${emoji} ${verdict}`, emoji: true },
  };

  const contextLines = [];
  if (typeof score === "number") {
    const label = result.higherIsBetter ? "Credibility" : "Risk";
    contextLines.push(`*${label} score:* ${score}/100`);
  }
  contextLines.push(
    `*Analyzed:* ${kind === "audio" ? "audio file" : kind === "text" ? "text" : "link"}`
  );
  if (target) contextLines.push(`*Source:* ${truncate(target, 200)}`);

  const blocks = [
    header,
    {
      type: "section",
      text: { type: "mrkdwn", text: contextLines.join("\n") },
    },
  ];

  if (Array.isArray(result.signals) && result.signals.length) {
    const fields = result.signals.slice(0, 10).map((s) => ({
      type: "mrkdwn",
      text:
        typeof s === "string"
          ? `• ${s}`
          : `*${s.label || s.name || "Signal"}:* ${s.value ?? s.detail ?? ""}`,
    }));
    blocks.push({ type: "section", fields });
  }

  if (result.explanation) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: truncate(result.explanation, 2900) },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      { type: "mrkdwn", text: "AuthentiScan Pro · authentiscanapp.com" },
    ],
  });

  return blocks;
}

function scoreEmoji(score, higherIsBetter) {
  if (typeof score !== "number") return "🔎";
  // Normalize to a "risk" axis: high = bad.
  const risk = higherIsBetter ? 100 - score : score;
  if (risk >= 66) return "🔴";
  if (risk >= 33) return "🟡";
  return "🟢";
}

function truncate(str, max) {
  str = String(str);
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
