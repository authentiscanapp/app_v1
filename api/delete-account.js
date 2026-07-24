/**
 * AuthentiScan Pro — Account deletion
 * POST /api/delete-account
 *
 * Required by App Store Guideline 5.1.1(v): apps that let users create an
 * account must let them delete it from within the app.
 *
 * The client sends the user's Supabase access token (JWT) as a Bearer token.
 * We verify it, delete the user's data (scans, profile), then permanently
 * delete the auth user with the service role key. Never exposes admin creds
 * to the client.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lirxysrkgxjomhtfwkhf.supabase.co";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "Server not configured" });

  // 1) Authenticate the caller from their Supabase access token.
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }
  const accessToken = authHeader.slice(7).trim();

  let userId;
  try {
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!who.ok) return res.status(401).json({ error: "Invalid or expired session" });
    const user = await who.json();
    userId = user?.id;
    if (!userId) return res.status(401).json({ error: "Could not identify user" });
  } catch (e) {
    return res.status(401).json({ error: "Session validation failed" });
  }

  const admin = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  // 2) Delete the user's data first (best-effort; don't block deletion on these).
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scans?user_id=eq.${userId}`, { method: "DELETE", headers: admin });
  } catch (_) { /* ignore */ }
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, { method: "DELETE", headers: admin });
  } catch (_) { /* ignore */ }

  // 3) Permanently delete the auth user.
  try {
    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: admin,
    });
    if (!del.ok && del.status !== 404) {
      const detail = await del.text().catch(() => "");
      return res.status(502).json({ error: "Could not delete account", detail });
    }
  } catch (e) {
    return res.status(500).json({ error: "Account deletion failed", detail: e.message });
  }

  return res.status(200).json({ ok: true, deleted: true });
};
