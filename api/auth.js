/**
 * AuthentiScan Pro — Bearer token validation helper
 *
 * Usage in any API route:
 *   import { validateBearer } from "./auth.js";
 *   const { valid, error } = validateBearer(req);
 *   if (!valid) return res.status(401).json({ error });
 *
 * The app frontend continues to work normally — it does not send
 * a Bearer token and is never blocked by this helper.
 * This helper is only used when explicitly called by an API route.
 */

export function validateBearer(req) {
  const authHeader = req.headers["authorization"] || "";

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Authorization header missing or not Bearer type" };
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return { valid: false, error: "Bearer token is empty" };
  }

  const validKey = process.env.AUTHENTISCAN_API_KEY;

  // If no key is configured in Vercel env, skip validation (dev mode)
  if (!validKey) {
    console.warn("AUTHENTISCAN_API_KEY not set — skipping token validation");
    return { valid: true, token };
  }

  if (token !== validKey) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true, token };
}

/**
 * Returns standard X-RateLimit headers.
 * Values are static for now — can be made dynamic later.
 */
export function rateLimitHeaders() {
  return {
    "X-RateLimit-Limit":     "500",
    "X-RateLimit-Remaining": "499",
    "X-RateLimit-Reset":     String(Math.floor(Date.now() / 1000) + 86400),
  };
}
