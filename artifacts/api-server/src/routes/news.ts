import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = path.resolve(_dir, "news_fetch.py");

function runNews(symbol: string): Promise<unknown> {
  const args = symbol ? [SCRIPT_PATH, symbol] : [SCRIPT_PATH];
  return new Promise((resolve, reject) => {
    const proc = spawn("python", args, { timeout: 15000 });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c: Buffer) => { stdout += c.toString(); });
    proc.stderr.on("data", (c: Buffer) => { stderr += c.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) { reject(new Error(`Script error: ${stderr}`)); return; }
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error(`Parse error: ${stdout}`)); }
    });
    proc.on("error", reject);
  });
}

// Cache per symbol for 5 minutes
const newsCache = new Map<string, { data: unknown; expires: number }>();

router.get("/news", async (req, res) => {
  const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim().toUpperCase() : "";
  const cacheKey = symbol || "__general__";
  const now = Date.now();

  const cached = newsCache.get(cacheKey);
  if (cached && cached.expires > now) {
    res.json(cached.data);
    return;
  }

  try {
    const data = await runNews(symbol);
    newsCache.set(cacheKey, { data, expires: now + 5 * 60_000 });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error fetching news");
    const stale = newsCache.get(cacheKey);
    if (stale) { res.json(stale.data); return; }
    res.status(500).json({ error: "server_error", message: "Failed to fetch news" });
  }
});

export default router;
