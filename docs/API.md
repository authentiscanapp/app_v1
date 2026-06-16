# AuthentiScan Pro — API Reference (v1)

Real-time misinformation, phishing and AI-voice-fraud detection over a simple REST API.

- **Base URL:** `https://app.authentiscanapp.com`
- **Endpoint:** `POST /api/v1/analyze`
- **Auth:** `Authorization: Bearer <api_key>`
- **Format:** `application/json` over HTTPS only
- **Status:** Production

---

## 1. Quickstart

```bash
curl -X POST https://app.authentiscanapp.com/api/v1/analyze \
  -H "Authorization: Bearer ask_test_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "content": "https://paypal-security-alert-login.com" }'
```

```json
{
  "request_id": "req_5f3c1a9b8e2d4c6a7b0f1e2d",
  "mode": "url",
  "risk_score": 92,
  "risk_level": "critical",
  "verdict": "fake",
  "title": "Phishing Domain Detected",
  "summary": "Domain impersonates PayPal and is not an official property.",
  "explanation": "The domain paypal-security-alert-login.com is not owned by PayPal...",
  "credibility_signals": [
    { "name": "Source Credibility", "finding": "Domain registered recently, not a PayPal property", "score": "5%", "level": "danger" }
  ],
  "analyzed_at": "2026-06-16T21:30:00.000Z"
}
```

---

## 2. Authentication

Every request must send a Bearer API key:

```
Authorization: Bearer <api_key>
```

| Prefix                  | Environment | Daily limit | Notes                          |
|-------------------------|-------------|-------------|--------------------------------|
| `ask_test_`             | Sandbox     | 100 req/day | For evaluation — no billing    |
| `authentiscan_sk_live_` | Production  | Per plan    | Live traffic                   |

Keys are secret — use them **only server-side**. A missing or invalid key returns `401 UNAUTHORIZED`; a revoked key returns `403 FORBIDDEN`.

---

## 3. `POST /api/v1/analyze`

Analyzes a URL, free text, or an audio clip and returns a risk score (0–100) with a level, verdict, and an explanation.

### Request body

| Field             | Type    | Required | Description                                                                 |
|-------------------|---------|----------|-----------------------------------------------------------------------------|
| `content`         | string  | yes¹     | A URL or raw text to analyze. 5–10,000 characters.                          |
| `type`            | string  | no       | `"url"`, `"text"` or `"audio"`. Auto-detected from `content` when omitted.  |
| `audio`           | string  | yes²     | Base64-encoded audio (for `type: "audio"`). Max 25 MB decoded.              |
| `audioMime`       | string  | no       | `"audio/wav"` (default), `"audio/mp3"`, `"audio/m4a"`.                        |
| `audioExt`        | string  | no       | `"wav"` (default), `"mp3"`, `"m4a"`.                                          |
| `include_signals` | boolean | no       | Include the `credibility_signals` array. Default `true`.                    |

¹ Required for text/URL mode. ² Required for audio mode.
*Language is detected automatically — no language field is required.*

### Response — `200 OK`

| Field                 | Type    | Description                                                          |
|-----------------------|---------|----------------------------------------------------------------------|
| `request_id`          | string  | Unique id for this analysis (for support/tracing).                   |
| `mode`                | string  | `"url"`, `"text"` or `"audio"`.                                      |
| `risk_score`          | integer | 0–100.                                                               |
| `risk_level`          | string  | `"low"`, `"medium"`, `"high"`, `"critical"` (see mapping below).      |
| `verdict`             | string  | `"real"`, `"unverified"`, `"misleading"`, `"fake"`.                  |
| `title`               | string  | Short headline.                                                      |
| `summary`             | string  | One-sentence key finding.                                            |
| `explanation`         | string  | 2–3 sentence analysis.                                               |
| `credibility_signals` | array   | Up to 4 signal objects (when `include_signals` is true).             |
| `transcription`       | string  | Audio mode only — transcribed speech (≤ 300 chars).                  |
| `analyzed_at`         | string  | ISO-8601 timestamp.                                                  |

**Signal object:** `{ "name": string, "finding": string, "score": string, "level": "safe"|"warn"|"danger"|"neutral" }`

### Risk level mapping

| Level      | Score   | Meaning                                                        |
|------------|---------|----------------------------------------------------------------|
| `low`      | 0–34    | Appears credible. No significant risk signals.                 |
| `medium`   | 35–64   | Some signals warrant caution. Secondary verification advised.  |
| `high`     | 65–80   | Multiple red flags. Do not share without verification.         |
| `critical` | 81–100  | Strong evidence of fraud or deliberate disinformation.         |

---

## 4. Examples

### URL / text — cURL

```bash
curl -X POST https://app.authentiscanapp.com/api/v1/analyze \
  -H "Authorization: Bearer $AUTHENTISCAN_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "content": "URGENT: Your PayPal account has been limited. Verify now." }'
```

### Node.js

```js
const r = await fetch("https://app.authentiscanapp.com/api/v1/analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.AUTHENTISCAN_KEY}`,
  },
  body: JSON.stringify({ content: "https://example.com/article", include_signals: true }),
});
const result = await r.json();
console.log(result.risk_score, result.risk_level);
```

### Python

```python
import os, requests

r = requests.post(
    "https://app.authentiscanapp.com/api/v1/analyze",
    headers={"Authorization": f"Bearer {os.environ['AUTHENTISCAN_KEY']}"},
    json={"content": "https://example.com/article"},
)
print(r.json()["risk_score"], r.json()["risk_level"])
```

### Audio (AI-voice detection)

```bash
# audio must be base64-encoded in the "audio" field
curl -X POST https://app.authentiscanapp.com/api/v1/analyze \
  -H "Authorization: Bearer $AUTHENTISCAN_KEY" \
  -H "Content-Type: application/json" \
  -d "{ \"type\": \"audio\", \"audio\": \"$(base64 -w0 sample.wav)\", \"audioExt\": \"wav\" }"
```

---

## 5. Rate limits

Limits are enforced per API key. Every response includes:

```
X-RateLimit-Limit:     100
X-RateLimit-Remaining: 97
X-RateLimit-Reset:     1781654400   # Unix time (UTC) of the daily reset
```

When the quota is exhausted the API returns `429 RATE_LIMIT_EXCEEDED`. Retry after `X-RateLimit-Reset`.

---

## 6. Errors

All errors use a consistent envelope:

```json
{ "error": "CONTENT_TOO_LONG", "detail": "Content exceeds the 10,000 character limit" }
```

| HTTP | Error code                 | Meaning                                          |
|------|----------------------------|--------------------------------------------------|
| 400  | `INVALID_REQUEST`          | Malformed payload or missing required field.     |
| 400  | `CONTENT_TOO_LONG`         | Text > 10,000 chars or audio > 25 MB.            |
| 401  | `UNAUTHORIZED`             | API key missing or invalid.                      |
| 403  | `FORBIDDEN`                | Key revoked or lacks access.                     |
| 405  | `METHOD_NOT_ALLOWED`       | Unsupported HTTP method.                          |
| 422  | `AUDIO_FORMAT_UNSUPPORTED` | Audio could not be processed.                    |
| 429  | `RATE_LIMIT_EXCEEDED`      | Daily quota reached — retry after reset.         |
| 500  | `INTERNAL_ERROR`           | Unexpected server error — safe to retry.         |
| 503  | `SERVICE_UNAVAILABLE`      | Temporary upstream unavailability — retry.       |

---

## 7. Health check

```bash
curl https://app.authentiscanapp.com/api/ping
```

```json
{ "status": "ok", "version": "1.0", "timestamp": "2026-06-16T21:14:53.988Z" }
```

A `GET /api/v1/analyze` (no auth) also returns a small descriptor confirming the endpoint is live.

---

## 8. Webhooks — *Beta (coming soon)*

Push notifications on scan completion (`scan.complete`, `scan.high_risk`) with an HMAC-signed payload are on the roadmap. Contact us to join the beta.

---

*AuthentiScan Pro · app.authentiscanapp.com · API v1*
