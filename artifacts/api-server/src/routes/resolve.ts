import { Router } from "express";
import { ResolveSymbolQueryParams } from "@workspace/api-zod";

const router = Router();

const SYMBOL_MAP: Record<string, { symbol: string; name: string }> = {
  // US Tech Mega Cap
  apple: { symbol: "AAPL", name: "Apple Inc." },
  aapl: { symbol: "AAPL", name: "Apple Inc." },
  microsoft: { symbol: "MSFT", name: "Microsoft Corporation" },
  msft: { symbol: "MSFT", name: "Microsoft Corporation" },
  nvidia: { symbol: "NVDA", name: "NVIDIA Corporation" },
  nvda: { symbol: "NVDA", name: "NVIDIA Corporation" },
  google: { symbol: "GOOGL", name: "Alphabet Inc." },
  alphabet: { symbol: "GOOGL", name: "Alphabet Inc." },
  googl: { symbol: "GOOGL", name: "Alphabet Inc." },
  goog: { symbol: "GOOGL", name: "Alphabet Inc." },
  amazon: { symbol: "AMZN", name: "Amazon.com Inc." },
  amzn: { symbol: "AMZN", name: "Amazon.com Inc." },
  meta: { symbol: "META", name: "Meta Platforms Inc." },
  facebook: { symbol: "META", name: "Meta Platforms Inc." },
  tesla: { symbol: "TSLA", name: "Tesla Inc." },
  tsla: { symbol: "TSLA", name: "Tesla Inc." },
  netflix: { symbol: "NFLX", name: "Netflix Inc." },
  nflx: { symbol: "NFLX", name: "Netflix Inc." },
  // US Finance
  jpmorgan: { symbol: "JPM", name: "JPMorgan Chase & Co." },
  "jp morgan": { symbol: "JPM", name: "JPMorgan Chase & Co." },
  jpm: { symbol: "JPM", name: "JPMorgan Chase & Co." },
  visa: { symbol: "V", name: "Visa Inc." },
  mastercard: { symbol: "MA", name: "Mastercard Inc." },
  "bank of america": { symbol: "BAC", name: "Bank of America Corp." },
  bac: { symbol: "BAC", name: "Bank of America Corp." },
  // US Healthcare / Consumer
  johnson: { symbol: "JNJ", name: "Johnson & Johnson" },
  "johnson & johnson": { symbol: "JNJ", name: "Johnson & Johnson" },
  jnj: { symbol: "JNJ", name: "Johnson & Johnson" },
  walmart: { symbol: "WMT", name: "Walmart Inc." },
  wmt: { symbol: "WMT", name: "Walmart Inc." },
  pfizer: { symbol: "PFE", name: "Pfizer Inc." },
  pfe: { symbol: "PFE", name: "Pfizer Inc." },
  // US Semis / Cloud
  amd: { symbol: "AMD", name: "Advanced Micro Devices" },
  intel: { symbol: "INTC", name: "Intel Corporation" },
  intc: { symbol: "INTC", name: "Intel Corporation" },
  oracle: { symbol: "ORCL", name: "Oracle Corporation" },
  orcl: { symbol: "ORCL", name: "Oracle Corporation" },
  salesforce: { symbol: "CRM", name: "Salesforce Inc." },
  crm: { symbol: "CRM", name: "Salesforce Inc." },
  adobe: { symbol: "ADBE", name: "Adobe Inc." },
  adbe: { symbol: "ADBE", name: "Adobe Inc." },
  qualcomm: { symbol: "QCOM", name: "Qualcomm Inc." },
  qcom: { symbol: "QCOM", name: "Qualcomm Inc." },
  // Indian stocks
  tcs: { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  "tata consultancy": { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  reliance: { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  infosys: { symbol: "INFY.NS", name: "Infosys Limited" },
  infy: { symbol: "INFY.NS", name: "Infosys Limited" },
  wipro: { symbol: "WIPRO.NS", name: "Wipro Limited" },
  hdfc: { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  "hdfc bank": { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  hdfcbank: { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  icici: { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  "icici bank": { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  icicibank: { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  bajaj: { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv" },
  "bajaj finserv": { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv" },
  "bajaj finance": { symbol: "BAJFINANCE.NS", name: "Bajaj Finance" },
  sbi: { symbol: "SBIN.NS", name: "State Bank of India" },
  "state bank": { symbol: "SBIN.NS", name: "State Bank of India" },
  hcl: { symbol: "HCLTECH.NS", name: "HCL Technologies" },
  hcltech: { symbol: "HCLTECH.NS", name: "HCL Technologies" },
  maruti: { symbol: "MARUTI.NS", name: "Maruti Suzuki" },
  airtel: { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
  bharti: { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
  kotak: { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  "kotak bank": { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  kotakbank: { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  adani: { symbol: "ADANIENT.NS", name: "Adani Enterprises" },
  "adani enterprises": { symbol: "ADANIENT.NS", name: "Adani Enterprises" },
  titan: { symbol: "TITAN.NS", name: "Titan Company" },
  ltimindtree: { symbol: "LTIM.NS", name: "LTIMindtree" },
  ltim: { symbol: "LTIM.NS", name: "LTIMindtree" },
  "tech mahindra": { symbol: "TECHM.NS", name: "Tech Mahindra" },
  techm: { symbol: "TECHM.NS", name: "Tech Mahindra" },
};

router.get("/resolve", (req, res) => {
  const parseResult = ResolveSymbolQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_params", message: "Missing 'query' parameter" });
    return;
  }

  const raw = parseResult.data.query.trim().toLowerCase();

  const exact = SYMBOL_MAP[raw];
  if (exact) {
    res.json({ symbol: exact.symbol, name: exact.name, confidence: "exact" });
    return;
  }

  // Fuzzy: check if raw is contained in any key or any key is contained in raw
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const key of Object.keys(SYMBOL_MAP)) {
    if (raw.includes(key) || key.includes(raw)) {
      const score = Math.min(raw.length, key.length) / Math.max(raw.length, key.length);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
  }

  if (bestKey && bestScore > 0.4) {
    const match = SYMBOL_MAP[bestKey];
    res.json({ symbol: match.symbol, name: match.name, confidence: "fuzzy" });
    return;
  }

  res.status(404).json({
    error: "not_found",
    message: `Could not resolve '${parseResult.data.query}' to a known stock symbol`,
  });
});

export default router;
