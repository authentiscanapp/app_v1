// api/generate-image.js
// Vercel serverless function: generates a branded Instagram post image.
// Called by Make.com with: { headline, body, screenshotUrl, background }
//
// Deploy this inside your existing Vercel project (same one running
// app.authentiscanapp.com). Route will be:
//   https://app.authentiscanapp.com/api/generate-image

// ---- Font setup for the serverless runtime ----
// Vercel's Lambda ships no system fonts, so librsvg (used by sharp to
// rasterize the SVG) renders text as empty boxes ("tofu"). We bundle the
// fonts under api/fonts/ (kept in the deploy via `includeFiles` in
// vercel.json) and point fontconfig at them. Its cache must live in /tmp,
// the only writable path on Lambda. Must run before sharp renders any text.
const path = require('path');
const fs = require('fs');

(function configureFonts() {
  try {
    const fontDir = path.join(__dirname, 'fonts');
    const fcDir = '/tmp/fontconfig';
    const fcCache = '/tmp/fontconfig-cache';
    fs.mkdirSync(fcDir, { recursive: true });
    fs.mkdirSync(fcCache, { recursive: true });
    fs.writeFileSync(
      path.join(fcDir, 'fonts.conf'),
      `<?xml version="1.0"?>
<fontconfig>
  <dir>${fontDir}</dir>
  <cachedir>${fcCache}</cachedir>
</fontconfig>
`
    );
    process.env.FONTCONFIG_PATH = fcDir;
  } catch (err) {
    console.error('font setup failed:', err);
  }
})();

const sharp = require('sharp');

// ---- Brand constants ----
const COLOR_LIME = '#C8FF00';
const COLOR_WHITE = '#FFFFFF';
const CANVAS_W = 1080;
const CANVAS_H = 1080;

// Background templates: pre-generated once in Midjourney, hosted as static
// files in your Vercel project's /public folder (or on Supabase storage).
// Add as many as you want variety — the Make.com scenario can pick one at
// random or rotate through them.
const BACKGROUNDS = {
  a: 'https://app.authentiscanapp.com/templates/bg-a.png',
  b: 'https://app.authentiscanapp.com/templates/bg-b.png',
  c: 'https://app.authentiscanapp.com/templates/bg-c.png',
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Very simple word-wrap for SVG <tspan> lines.
function wrapText(text, maxCharsPerLine) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildTextSvg({ headline, body }) {
  const headlineLines = wrapText(headline, 22);
  const bodyLines = wrapText(body, 46);

  const headlineTspans = headlineLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 64}">${escapeXml(line)}</tspan>`)
    .join('');

  const bodyStartY = 220 + headlineLines.length * 64;
  const bodyTspans = bodyLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join('');

  return `
  <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .headline { font-family: 'Barlow Condensed', Arial, sans-serif; font-weight: 700; font-size: 56px; fill: ${COLOR_LIME}; }
      .body { font-family: 'Inter', Arial, sans-serif; font-weight: 400; font-size: 28px; fill: ${COLOR_WHITE}; }
    </style>
    <text class="headline" x="80" y="140">${headlineTspans}</text>
    <text class="body" x="80" y="${bodyStartY}">${bodyTspans}</text>
  </svg>`;
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  try {
    const { headline, body, screenshotUrl, background } = req.body;

    if (!headline || !body) {
      res.status(400).json({ error: 'headline and body are required' });
      return;
    }

    const bgUrl = BACKGROUNDS[background] || BACKGROUNDS.a;
    const bgBuffer = await fetchBuffer(bgUrl);

    const textSvg = Buffer.from(buildTextSvg({ headline, body }));

    const layers = [
      { input: textSvg, top: 0, left: 0 },
    ];

    // Optional: composite a screenshot mock in the lower-right area.
    if (screenshotUrl) {
      const screenshotBuffer = await fetchBuffer(screenshotUrl);
      const resizedScreenshot = await sharp(screenshotBuffer)
        .resize(420, 420, { fit: 'cover' })
        .composite([])
        .png()
        .toBuffer();

      layers.push({
        input: resizedScreenshot,
        top: CANVAS_H - 420 - 60,
        left: CANVAS_W - 420 - 60,
      });
    }

    const output = await sharp(bgBuffer)
      .resize(CANVAS_W, CANVAS_H)
      .composite(layers)
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(output);
  } catch (err) {
    console.error('generate-image error:', err);
    res.status(500).json({ error: err.message });
  }
};
