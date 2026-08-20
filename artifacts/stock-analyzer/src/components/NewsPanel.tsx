import React, { useMemo } from "react";
import { getGetNewsQueryKey, useGetNews, NewsArticle } from "@workspace/api-client-react";
import { ExternalLink, Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsPanelProps {
  symbol?: string;
}

const MAX_ARTICLES = 6;

// ── Ticker/company-aware relevance ──────────────────────────────────────
// Yahoo's per-symbol news search mixes in loosely-related and outright
// unrelated stories (other companies mentioned alongside the requested one,
// broad market roundups, etc). NewsArticle only exposes title/publisher/
// link/publishedAt/thumbnail — no summary — so relevance is scored from the
// title plus the link's URL slug against small per-ticker keyword profiles.
interface CompanyProfile {
  names: string[];
  ceo: string[];
  products: string[];
  industryTerms: string[];
  peers: string[];
}

const EMPTY_PROFILE: CompanyProfile = { names: [], ceo: [], products: [], industryTerms: [], peers: [] };

const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  AAPL: {
    names: ["apple"],
    ceo: ["tim cook"],
    products: ["iphone", "ipad", "macbook", "apple watch", "airpods", "app store", "vision pro", "apple intelligence", "apple silicon", "ios "],
    industryTerms: ["smartphone", "consumer electronics", "wearables"],
    peers: ["samsung", "huawei"],
  },
  MSFT: {
    names: ["microsoft"],
    ceo: ["satya nadella"],
    products: ["azure", "windows", "office 365", "microsoft teams", "xbox", "copilot", "github", "linkedin", "microsoft surface", "bing"],
    industryTerms: ["cloud computing", "enterprise software", "saas"],
    peers: ["amazon web services", "google cloud", "oracle", "salesforce"],
  },
  NVDA: {
    names: ["nvidia"],
    ceo: ["jensen huang"],
    products: ["geforce", "cuda", "blackwell", "h100", "h200", "rtx ", "dgx", "grace hopper"],
    industryTerms: ["semiconductor", "gpu", "chipmaker", "ai accelerator", "data center"],
    peers: ["amd", "intel", "tsmc", "broadcom", "qualcomm"],
  },
  AMZN: {
    names: ["amazon"],
    ceo: ["andy jassy"],
    products: ["aws", "amazon web services", "amazon prime", "alexa", "kindle", "whole foods"],
    industryTerms: ["e-commerce", "cloud computing", "logistics", "online retail"],
    peers: ["walmart", "microsoft azure", "google cloud", "shopify"],
  },
  TSLA: {
    names: ["tesla"],
    ceo: ["elon musk"],
    products: ["model 3", "model y", "model s", "model x", "cybertruck", "gigafactory", "full self-driving", " fsd", "powerwall", "supercharger"],
    industryTerms: ["electric vehicle", " ev ", "battery", "autonomous driving", "self-driving"],
    peers: ["ford", "general motors", " gm ", "byd", "rivian", "lucid motors"],
  },
  GOOGL: {
    names: ["google", "alphabet"],
    ceo: ["sundar pichai"],
    products: ["youtube", "android", "gemini", "google cloud", "waymo", "pixel phone", "chrome"],
    industryTerms: ["search engine", "digital advertising", "ai model"],
    peers: ["microsoft", "meta", "openai"],
  },
  META: {
    names: ["meta platforms", "facebook"],
    ceo: ["mark zuckerberg"],
    products: ["instagram", "whatsapp", "reality labs", "meta quest", "threads", "llama"],
    industryTerms: ["social media", "digital advertising", "metaverse"],
    peers: ["google", "snap", "tiktok", "bytedance"],
  },
};

// Broader-than-COMPANY_PROFILES list used only to detect "this article is
// primarily about a different, specific company" for the Tier-4 penalty.
// These frequently show up as noise in per-symbol news feeds (competitors,
// unrelated tickers swept in by Yahoo's search) without needing a full
// product/CEO/industry profile of their own.
const OTHER_COMPANY_MARKERS: Record<string, string[]> = {
  IBM: ["ibm", "international business machines"],
  MRNA: ["moderna"],
  MRK: ["merck"],
  WPM: ["wheaton precious metals"],
  WMT: ["walmart"],
  ORCL: ["oracle"],
  CRM: ["salesforce"],
  INTC: ["intel"],
  AMD: ["amd", "advanced micro devices"],
  QCOM: ["qualcomm"],
  AVGO: ["broadcom"],
  TSM: ["tsmc", "taiwan semiconductor"],
  F: ["ford motor"],
  GM: ["general motors"],
  RIVN: ["rivian"],
  LMT: ["lockheed martin"],
  ZM: ["zoom"],
  MRVL: ["marvell"],
  LOW: ["lowe's", "lowes"],
  NFLX: ["netflix"],
  PLTR: ["palantir"],
  COIN: ["coinbase"],
};

const MACRO_KEYWORDS = [
  "federal reserve", " fed ", "interest rate", "rate cut", "rate hike",
  "tariff", "inflation", "nasdaq", "s&p 500", "dow jones",
  "ai spending", "tech stocks", "stock market", "market rally", "recession",
];

// Only counted as a bonus when the article already has a company-specific
// signal — otherwise "earnings" alone would tier-1-match any company's news.
const CONTEXT_KEYWORDS = [
  "earnings", "revenue", "guidance", "outlook", "quarterly",
  "acquisition", "acquire", "lawsuit", "regulatory", "antitrust",
  "investigation", "analyst", "price target", "upgrade", "downgrade",
];

const TIER4_PENALTY_THRESHOLD = -30;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function articleSearchText(article: NewsArticle): string {
  const title = article.title || "";
  let slug = "";
  try {
    slug = new URL(article.link).pathname.replace(/[-_/]+/g, " ");
  } catch {
    // link may be relative/malformed — title alone is still usable.
  }
  return ` ${title} ${slug} `.toLowerCase();
}

function scoreArticle(article: NewsArticle, symbol: string): number {
  const text = articleSearchText(article);
  const profile = COMPANY_PROFILES[symbol.toUpperCase()] ?? EMPTY_PROFILE;

  let score = 0;
  let hasTier1 = false;

  const tickerRe = new RegExp(`\\b${escapeRegExp(symbol.toLowerCase())}\\b`);
  if (tickerRe.test(text)) { score += 100; hasTier1 = true; }
  if (profile.names.some((n) => text.includes(n))) { score += 100; hasTier1 = true; }
  if (profile.ceo.some((n) => text.includes(n))) { score += 80; hasTier1 = true; }
  if (profile.products.some((n) => text.includes(n))) { score += 70; hasTier1 = true; }

  if (hasTier1 && CONTEXT_KEYWORDS.some((k) => text.includes(k))) {
    score += 40;
  }

  const tier2Hits = [...profile.industryTerms, ...profile.peers].filter((k) => text.includes(k)).length;
  if (tier2Hits > 0) score += Math.min(tier2Hits, 2) * 30;

  const tier3Hits = MACRO_KEYWORDS.filter((k) => text.includes(k)).length;
  if (tier3Hits > 0) score += Math.min(tier3Hits, 2) * 8;

  if (!hasTier1) {
    const upperSymbol = symbol.toUpperCase();
    const otherCompanyNames: Record<string, string[]> = { ...OTHER_COMPANY_MARKERS };
    for (const [sym, profile] of Object.entries(COMPANY_PROFILES)) {
      otherCompanyNames[sym] = [...(otherCompanyNames[sym] ?? []), ...profile.names];
    }

    const mentionsOtherCompany = Object.entries(otherCompanyNames).some(([otherSymbol, names]) => {
      if (otherSymbol === upperSymbol) return false;
      const otherTickerRe = new RegExp(`\\b${escapeRegExp(otherSymbol.toLowerCase())}\\b`);
      return otherTickerRe.test(text) || names.some((n) => text.includes(n));
    });
    if (mentionsOtherCompany) score -= 60;
  }

  const date = parsePublishedAt(article.publishedAt);
  if (date) {
    const hoursAgo = (Date.now() - date.getTime()) / 3600000;
    if (hoursAgo <= 6) score += 3;
    else if (hoursAgo <= 24) score += 1;
  }

  return score;
}

function selectRelevantArticles(articles: NewsArticle[], symbol: string | undefined, max: number): NewsArticle[] {
  const seenTitles = new Set<string>();
  const deduped: NewsArticle[] = [];
  for (const a of articles) {
    if (!a || !a.title || !a.link) continue;
    const key = a.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    deduped.push(a);
  }

  if (!symbol) return deduped.slice(0, max);

  const scored = deduped
    .map((article) => ({ article, score: scoreArticle(article, symbol) }))
    .sort((a, b) => b.score - a.score);

  const pool = scored.filter((s) => s.score > TIER4_PENALTY_THRESHOLD);
  const ranked = pool.length > 0 ? pool : scored; // never render an empty panel if data exists

  return ranked.slice(0, max).map((s) => s.article);
}

// publishedAt is typed as `string` but Yahoo's feed sometimes serializes it
// as a raw Unix epoch (seconds, not milliseconds) instead of ISO-8601. Feeding
// that straight into `new Date()` is misread as an epoch-milliseconds value
// landing near 1970, producing bogus multi-thousand-day "ago" text. Detect
// and normalize both shapes before parsing.
function parsePublishedAt(value: unknown): Date | null {
  if (value == null || value === "") return null;

  let num: number | null = null;
  if (typeof value === "number") num = value;
  else if (typeof value === "string" && /^\d+$/.test(value)) num = Number(value);

  if (num != null) {
    const ms = num < 1e12 ? num * 1000 : num; // seconds vs milliseconds epoch
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function timeAgo(value: unknown): string {
  const d = parsePublishedAt(value);
  if (!d) return typeof value === "string" ? value : "";

  const diff = Math.max(Date.now() - d.getTime(), 0);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function NewsPanel({ symbol }: NewsPanelProps) {
  const { data, isLoading } = useGetNews(
    symbol ? { symbol } : {},
    { query: { queryKey: getGetNewsQueryKey(symbol ? { symbol } : {}), refetchOnWindowFocus: false } }
  );

  const articles = useMemo(
    () => selectRelevantArticles(data?.articles ?? [], symbol, MAX_ARTICLES),
    [data, symbol]
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {symbol ? `${symbol} News` : "Market News"}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No news available.</p>
      ) : (
        <div className="space-y-3">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex gap-3 items-start">
                {article.thumbnail && (
                  <img
                    src={article.thumbnail}
                    alt=""
                    className="w-14 h-10 object-cover rounded shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                    <ExternalLink className="inline h-3 w-3 ml-1 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.publisher} · {timeAgo(article.publishedAt)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
