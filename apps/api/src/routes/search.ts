import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = path.resolve(_dir, "search_fetch.py");

function runSearch(query: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SCRIPT_PATH, query], { timeout: 10000 });
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

// Simple in-memory cache: 30 seconds per query
const cache = new Map<string, { data: unknown; expires: number }>();

router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length < 1) {
    res.status(400).json({ error: "invalid_params", message: "Query parameter 'q' is required" });
    return;
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.json(cached.data);
    return;
  }

  try {
    const data = await runSearch(q);
    cache.set(cacheKey, { data, expires: Date.now() + 30_000 });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error running symbol search");
    res.status(500).json({ error: "server_error", message: "Failed to search symbols" });
  }
});

export default router;
