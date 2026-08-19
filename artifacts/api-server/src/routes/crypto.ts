import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = path.resolve(_dir, "crypto_fetch.py");

function runCrypto(ids: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [SCRIPT_PATH, ids], { timeout: 15000 });
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

// Cache for 2 minutes
let cryptoCache: { data: unknown; expires: number } | null = null;

router.get("/crypto", async (req, res) => {
  const ids = typeof req.query.ids === "string" ? req.query.ids.trim() : "";

  const now = Date.now();
  if (!ids && cryptoCache && cryptoCache.expires > now) {
    res.json(cryptoCache.data);
    return;
  }

  try {
    const data = await runCrypto(ids);
    if (!ids) {
      cryptoCache = { data, expires: now + 2 * 60_000 };
    }
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error fetching crypto data");
    if (!ids && cryptoCache) { res.json(cryptoCache.data); return; }
    res.status(500).json({ error: "server_error", message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
