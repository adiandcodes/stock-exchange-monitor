import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// Simple in-memory cache: movers data is valid for 5 minutes
let moversCache: { data: unknown; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const MOVERS_SCRIPT = path.resolve(_dir, "movers_fetch.py");

function fetchMovers(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [MOVERS_SCRIPT], { timeout: 45000 });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`movers_fetch.py exited ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Failed to parse movers output: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on("error", reject);
  });
}

router.get("/movers", async (req, res) => {
  try {
    const now = Date.now();
    if (moversCache && moversCache.expires > now) {
      res.json(moversCache.data);
      return;
    }
    const data = await fetchMovers();
    moversCache = { data, expires: now + CACHE_TTL_MS };
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error fetching movers");
    // Return cached stale data on error if available
    if (moversCache) {
      res.json(moversCache.data);
      return;
    }
    res.status(500).json({
      error: "server_error",
      message: "Could not fetch market movers",
    });
  }
});

export default router;
