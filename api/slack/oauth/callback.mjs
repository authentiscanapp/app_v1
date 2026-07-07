import { saveInstallation } from "../../../lib/installations.mjs";

// Slack redirects the installer here with ?code=... after they approve the app.
// We exchange the code for that workspace's bot token and store it.
export default async function handler(req, res) {
  const code = req.query?.code;
  const error = req.query?.error;

  if (error) return sendHtml(res, 400, `Installation cancelled: ${escapeHtml(error)}`);
  if (!code) return sendHtml(res, 400, "Missing authorization code.");

  try {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || "",
      client_secret: process.env.SLACK_CLIENT_SECRET || "",
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI || "",
    });

    const resp = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await resp.json();

    if (!data.ok) {
      console.error("[oauth] exchange failed:", data.error);
      return sendHtml(res, 400, `Slack authorization failed: ${escapeHtml(data.error || "unknown")}`);
    }

    await saveInstallation({
      teamId: data.team?.id,
      teamName: data.team?.name,
      botToken: data.access_token,
      botUserId: data.bot_user_id,
      raw: data,
    });

    return sendHtml(
      res,
      200,
      "AuthentiScan is installed! Invite it to a channel and mention it with a link, some text, or an audio file to analyze."
    );
  } catch (err) {
    console.error("[oauth] error:", err);
    return sendHtml(res, 500, "Something went wrong during installation. Please try again.");
  }
}

function sendHtml(res, status, message) {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"><title>AuthentiScan</title></head>` +
      `<body style="font-family:system-ui,-apple-system,sans-serif;background:#0A0A0A;color:#F2F3F0;` +
      `display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px">` +
      `<div style="max-width:460px;text-align:center">` +
      `<div style="font-size:19px;line-height:1.55">${message}</div>` +
      `<div style="margin-top:22px"><a href="https://www.authentiscanapp.com" ` +
      `style="color:#C8FF00;text-decoration:none">www.authentiscanapp.com</a></div></div></body></html>`
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
