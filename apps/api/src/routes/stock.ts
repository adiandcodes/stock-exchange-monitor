import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { GetStockQueryParams } from "@workspace/api-zod";

const router = Router();

// In dev: src/routes → src/stock_fetch.py (../stock_fetch.py)
// In prod (built): dist/routes bundled into dist/index.mjs → dist/stock_fetch.py
// The build copies stock_fetch.py into dist/, so we use __dirname (injected by esbuild banner in prod)
const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = path.resolve(_dir, "stock_fetch.py");

function fetchStockData(symbol: string, period: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SCRIPT_PATH, symbol, period], {
      timeout: 30000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

router.get("/stock", async (req, res) => {
  const parseResult = GetStockQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({
      error: "invalid_params",
      message: "Missing or invalid 'symbol' query parameter",
    });
    return;
  }

  const { symbol, period } = parseResult.data;
  const safePeriod = period ?? "1y";

  if (!symbol || symbol.trim() === "") {
    res.status(400).json({
      error: "invalid_symbol",
      message: "Stock symbol cannot be empty",
    });
    return;
  }

  try {
    const data = (await fetchStockData(symbol.trim().toUpperCase(), safePeriod)) as Record<string, unknown>;

    if (data && typeof data === "object" && "error" in data) {
      const errData = data as { error: string; message: string };
      if (errData.error === "no_data") {
        res.status(400).json({
          error: "no_data",
          message: errData.message,
        });
        return;
      }
      res.status(500).json({
        error: "fetch_error",
        message: errData.message || "Failed to fetch stock data",
      });
      return;
    }

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error fetching stock data");
    res.status(500).json({
      error: "server_error",
      message: "An error occurred while fetching stock data",
    });
  }
});

export default router;
