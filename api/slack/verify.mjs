import crypto from "node:crypto";

/**
 * Reads the raw request body as a UTF-8 string.
 * Slack signatures are computed over the raw bytes, so we must NOT use a parsed body.
 * (The events function disables Vercel's body parser via `export const config`.)
 */
export async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Verifies the X-Slack-Signature header.
 * Returns true only if the signature is valid and the request is recent (<5 min).
 */
export function verifySlackSignature(signingSecret, headers, rawBody) {
  const timestamp = headers["x-slack-request-timestamp"];
  const signature = headers["x-slack-signature"];
  if (!signingSecret || !timestamp || !signature) return false;

  // Reject replays older than 5 minutes.
  const fiveMinutes = 60 * 5;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > fiveMinutes) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" +
    crypto.createHmac("sha256", signingSecret).update(base).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
