# AuthentiScan Pro

> **Detect Misinformation & AI Voice Fraud in Real Time**

AuthentiScan Pro is an AI-powered digital platform that helps users evaluate the credibility of online information. The system analyzes URLs, text, and audio content — returning credibility signals, risk scores, and educational insights to support informed decision-making.

**Live App:** [app.authentiscanapp.com](https://app.authentiscanapp.com)  
**Website:** [www.authentiscanapp.com](https://www.authentiscanapp.com)

---

## What It Does

Misinformation, scams, and AI-generated audio content are spreading rapidly online. AuthentiScan Pro gives individuals and organizations a fast, accessible tool to assess the trustworthiness of digital content before acting on it.

**Three analysis modes:**

- **Text** — Paste any text passage to receive a credibility assessment, bias detection, tone analysis, and fact-checking signals
- **URL** — Submit any web address to evaluate source credibility, domain risk, and content reliability
- **Audio** — Record or upload audio to detect AI-generated voice fraud and deepfake speech

---

## Key Features

- Real-time credibility scoring (0–100 Risk Index)
- Multi-signal analysis: fact-check indicators, source verification, bias detection, tone analysis
- AI voice / deepfake audio detection via Resemble AI
- Natural language explanation of risk signals powered by Claude (Anthropic)
- Audio transcription via ElevenLabs
- Scan history with persistent result storage
- Guest mode (5 free scans) + authenticated user mode
- Fully mobile-responsive interface

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (single-file component architecture) |
| Backend / API | Node.js serverless functions (Vercel) |
| AI Analysis | Anthropic Claude API |
| Deepfake Detection | Resemble AI Detect API |
| Audio Transcription | ElevenLabs API |
| File Storage | Vercel Blob Storage |
| Deployment | Vercel (auto-deploy from `main` branch) |

---

## Architecture Overview

```
User Interface (React)
        │
        ▼
  /api/analyze.js  ←── Vercel Serverless Function
        │
        ├── Text/URL mode  →  Anthropic Claude API
        │                     (credibility analysis + explanation)
        │
        └── Audio mode     →  ElevenLabs API (transcription)
                           →  Resemble AI API (deepfake detection)
                           →  Anthropic Claude API (analysis of transcript)
```

**Frontend components:**
- `Splash` — Landing / onboarding screen
- `LoginScreen` — Authentication + guest access
- `ScanScreen` — Main input interface (text / URL / audio modes)
- `ResultScreen` — Credibility report with signal breakdown
- `HistoryScreen` — Past scan results
- `ProfileScreen` — User account and usage stats

---

## Getting Started

### Prerequisites

- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- API accounts for: Anthropic, Resemble AI, ElevenLabs

### Installation

```bash
# Clone the repository
git clone https://github.com/authentiscanapp/app_v1.git
cd app_v1

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root with the following keys:

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Resemble AI — Deepfake Detection
RESEMBLE_API_KEY=your_resemble_api_key

# ElevenLabs — Audio Transcription
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

> **Note:** Never commit `.env.local` to version control. All environment variables are configured via Vercel project settings in production.

### Running Locally

```bash
# Start development server with Vercel (required for API routes)
vercel dev
```

App will be available at `http://localhost:3000`

### Deployment

The app auto-deploys to Vercel on every push to the `main` branch.

```bash
git add .
git commit -m "your message"
git push origin main
```

---

## API Reference

### `POST /api/analyze`

Accepts text, URL, or audio content and returns a credibility assessment.

**Text / URL request:**
```json
{
  "text": "Paste text or URL here"
}
```

**Audio request:**
```json
{
  "mode": "audio",
  "audio": "<base64-encoded audio>"
}
```

**Response:**
```json
{
  "score": 23,
  "label": "High Risk",
  "signals": [...],
  "explanation": "...",
  "deepfake_score": 0.87
}
```

---

## Resemble AI Integration

Deepfake audio detection uses the Resemble AI Detect API:

- **Endpoint:** `https://app.resemble.ai/api/v2/detect`
- **Auth:** Bearer token
- **Header:** `Prefer: wait` (synchronous response)
- **Score field:** `metrics.aggregated_score` (0.0–1.0, higher = more likely AI-generated)

---

## Use Cases

| Audience | Use Case |
|---|---|
| Individuals | Verify news articles, social media claims, suspicious messages |
| Educators | Teach digital literacy and critical information evaluation |
| Organizations | Internal misinformation risk screening |
| Journalists | Quick credibility triage before publishing |
| Seniors / vulnerable users | Protection against voice fraud and phone scams |

---

## Project Status

**Current phase:** Active beta testing  
**Deployment:** Publicly accessible at [app.authentiscanapp.com](https://app.authentiscanapp.com)  
**Testing:** Validated across 7 functional test cases covering all three analysis modes

---

## License

This project is proprietary software. All rights reserved.  
© 2026 AuthentiScan Pro

---

## Contact

For partnership inquiries, university collaborations, or press:  
**[www.authentiscanapp.com](https://www.authentiscanapp.com)**
