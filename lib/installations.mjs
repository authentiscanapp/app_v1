/**
 * Per-workspace Slack bot tokens, stored in Supabase via the REST API
 * (same pattern already used in api/analyze.js — no new dependency).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Save (upsert by team_id) an installation after the OAuth flow completes.
export async function saveInstallation({ teamId, teamName, botToken, botUserId, raw }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase env vars missing");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slack_installations`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      team_id: teamId,
      team_name: teamName || null,
      bot_token: botToken,
      bot_user_id: botUserId || null,
      raw: raw || null,
      installed_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase save failed ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

// Look up the bot token for a workspace. Falls back to the single-workspace
// env token so the original workspace keeps working before/without OAuth.
export async function getBotToken(teamId) {
  if (teamId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/slack_installations?team_id=eq.${encodeURIComponent(teamId)}&select=bot_token`,
        { headers: sbHeaders() }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]?.bot_token) return rows[0].bot_token;
      }
    } catch (err) {
      console.error("[installations] lookup error:", err);
    }
  }
  return process.env.SLACK_BOT_TOKEN || null; // fallback for the original workspace
}
