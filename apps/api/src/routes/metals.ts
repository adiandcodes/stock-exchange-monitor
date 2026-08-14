import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = path.resolve(_dir, "metals_fetch.py");

function runMetals(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SCRIPT_PATH], { timeout: 20000 });
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

// Cache for 5 minutes
let metalsCache: { data: unknown; expires: number } | null = null;

router.get("/metals", async (req, res) => {
  const now = Date.now();
  if (metalsCache && metalsCache.expires > now) {
    res.json(metalsCache.data);
    return;
  }

  try {
    const data = await runMetals();
    metalsCache = { data, expires: now + 5 * 60_000 };
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error fetching metals data");
    if (metalsCache) { res.json(metalsCache.data); return; }
    res.status(500).json({ error: "server_error", message: "Failed to fetch metals data" });
  }
});

export default router;
