export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  return res.status(200).json({
    status: "ok",
    version: "1.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      { method: "POST", path: "/api/analyze", description: "Analyze URL, text, or audio" },
      { method: "GET",  path: "/api/ping",    description: "Health check" },
    ],
  });
}
