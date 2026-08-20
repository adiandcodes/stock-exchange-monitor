import React, { useRef, useCallback, useMemo } from "react";
import html2canvas from "html2canvas";
import { X, Download } from "lucide-react";
import {
  StockData,
  NewsArticle,
  useGetNews,
  getGetNewsQueryKey,
} from "@workspace/api-client-react";

interface ShareInsightCardProps {
  data: StockData;
  symbol: string;
  currencySymbol: string;
  convert: (v: number | null | undefined, fromCurrency?: string) => number | null;
  onClose: () => void;
}

function getSignalStrength(data: StockData): number {
  let score = 50;
  if (data.trend === "Bullish") score += 10;
  else if (data.trend === "Bearish") score -= 10;
  if (data.momentum === "Bullish Crossover") score += 20;
  else if (data.momentum === "Bearish Crossover") score -= 20;
  if (data.volatility === "Low") score += 10;
  else if (data.volatility === "High") score -= 10;
  const chg = Math.abs(data.percent ?? 0);
  if (chg > 2) score += 5;
  return Math.min(Math.max(score, 5), 95);
}

// ── A) Technical signal — one observation, grounded only in existing data ──
function getTechnicalSignal(data: StockData): string {
  const ma7 = data.ma7 ?? [];
  const ma30 = data.ma30 ?? [];
  const lastMa7 = ma7.length ? ma7[ma7.length - 1] : null;
  const lastMa30 = ma30.length ? ma30[ma30.length - 1] : null;
  const price = data.price ?? null;

  if (data.momentum === "Bullish Crossover") {
    return "Short-term momentum is strengthening as the 7D MA crosses above the 30D MA.";
  }
  if (data.momentum === "Bearish Crossover") {
    return "Short-term momentum is weakening as the 7D MA moves below the 30D MA.";
  }
  if (price != null && lastMa30 != null) {
    if (price > lastMa30) {
      return "Price is trading above the 30D moving average, indicating an established upward trend.";
    }
    if (price < lastMa30) {
      return "Price is below the 30D moving average, indicating continued downward pressure.";
    }
  }
  if (lastMa7 != null && lastMa30 != null) {
    if (lastMa7 > lastMa30) {
      return "Short-term average remains above the long-term average, supporting the current trend.";
    }
    if (lastMa7 < lastMa30) {
      return "Short-term average remains below the long-term average, reflecting persistent weakness.";
    }
  }
  return "Momentum is neutral with no significant moving-average crossover.";
}

// ── C) Secondary signal — one more observation, distinct from the technical one ──
function getSecondarySignal(
  data: StockData,
  convert: (v: number | null | undefined, fromCurrency?: string) => number | null,
  currencySymbol: string
): string {
  if (data.volatility === "High") {
    return "Volatility is elevated, pointing to sharper-than-usual price swings.";
  }
  if (data.volatility === "Low") {
    return "Volatility remains low, reflecting steady, controlled price action.";
  }

  const price = data.price;
  const high = data.weekHigh52;
  const low = data.weekLow52;

  if (price != null && high != null && high > 0) {
    const offHigh = ((high - price) / high) * 100;
    if (offHigh <= 3) {
      return `Trading within ${offHigh.toFixed(1)}% of its 52-week high.`;
    }
  }
  if (price != null && low != null && low > 0) {
    const offLow = ((price - low) / low) * 100;
    if (offLow <= 5) {
      return `Trading just ${offLow.toFixed(1)}% above its 52-week low.`;
    }
  }

  const dayHigh = convert(data.dayHigh, data.currency);
  const dayLow = convert(data.dayLow, data.currency);
  if (dayHigh != null && dayLow != null) {
    return `Today's range has held between ${currencySymbol}${dayLow.toFixed(2)} and ${currencySymbol}${dayHigh.toFixed(2)}.`;
  }

  return data.volatility
    ? `Volatility is ${data.volatility.toLowerCase()}, reflecting balanced buying and selling pressure.`
    : "Price action remains within a balanced, two-sided range.";
}

// ── B) Market catalyst — pick the most relevant recent article, never invent one ──
const CATALYST_KEYWORDS = [
  "earnings", "guidance", "revenue", "profit", "outlook", "forecast",
  "product", "launch", "partnership", "deal", "contract", "acquisition",
  "merger", "analyst", "upgrade", "downgrade", "price target", "rating",
  "regulatory", "lawsuit", "investigation", "ai ", "chip", "demand",
  "supply", "buyback", "dividend", "ceo", "layoff", "recall", "fda",
  "patent", "ipo", "tariff", "rate cut", "rate hike", "inflation", "fed",
  "stock split", "spinoff", "data center",
];

function parsePublishedAt(value: unknown): Date | null {
  if (value == null || value === "") return null;
  let num: number | null = null;
  if (typeof value === "number") num = value;
  else if (typeof value === "string" && /^\d+$/.test(value)) num = Number(value);
  if (num != null) {
    const ms = num < 1e12 ? num * 1000 : num; // seconds vs ms epoch
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatRelativeTime(date: Date | null): string | null {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(Math.max(diffMs, 0) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function scoreArticle(
  article: NewsArticle,
  index: number,
  symbol: string,
  companyName: string,
  now: number
): number {
  let score = 0;
  const title = (article.title || "").toLowerCase();
  const sym = symbol.toLowerCase();
  const nameWords = companyName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["inc", "corp", "corporation", "ltd", "the"].includes(w));

  if (sym && title.includes(sym)) score += 15;
  if (nameWords.some((w) => title.includes(w))) score += 10;
  if (CATALYST_KEYWORDS.some((kw) => title.includes(kw))) score += 8;

  const date = parsePublishedAt(article.publishedAt);
  if (date) {
    const hoursAgo = (now - date.getTime()) / 3600000;
    if (hoursAgo <= 24) score += 12;
    else if (hoursAgo <= 72) score += 6;
    else if (hoursAgo <= 168) score += 2;
  }

  // Stable tiebreak: earlier results from the feed rank slightly higher.
  score += Math.max(0, 5 - index) * 0.1;
  return score;
}

function selectCatalyst(
  articles: NewsArticle[] | undefined,
  symbol: string,
  companyName: string
): NewsArticle | null {
  if (!articles || articles.length === 0) return null;
  const now = Date.now();
  const usable = articles.filter((a) => a && a.title && a.link);
  if (usable.length === 0) return null;

  let best = usable[0];
  let bestScore = -Infinity;
  usable.forEach((article, i) => {
    const s = scoreArticle(article, i, symbol, companyName, now);
    if (s > bestScore) {
      bestScore = s;
      best = article;
    }
  });
  return best;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function ShareInsightCard({
  data,
  symbol,
  currencySymbol,
  convert,
  onClose,
}: ShareInsightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bullish = (data.trend ?? "") === "Bullish" || (data.percent ?? 0) >= 0;
  const signalStrength = getSignalStrength(data);
  const price = convert(data.price, data.currency);
  const change = convert(data.change, data.currency);

  // Reuses the existing /api/news query — if the News panel on this page
  // already fetched this symbol, the cache is served with no extra request.
  const { data: newsData } = useGetNews(
    { symbol },
    {
      query: {
        queryKey: getGetNewsQueryKey({ symbol }),
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    }
  );

  const technicalSignal = useMemo(() => getTechnicalSignal(data), [data]);
  const secondarySignal = useMemo(
    () => getSecondarySignal(data, convert, currencySymbol),
    [data, convert, currencySymbol]
  );
  const catalyst = useMemo(
    () => selectCatalyst(newsData?.articles, symbol, data.name ?? ""),
    [newsData, symbol, data.name]
  );
  const catalystTime = useMemo(
    () => formatRelativeTime(parsePublishedAt(catalyst?.publishedAt)),
    [catalyst]
  );

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${symbol}-insight-${Date.now()}.png`;
      link.click();
    } catch {}
  }, [symbol]);

  const bullishBg = "linear-gradient(135deg, #060e1a 0%, #0a1c2e 40%, #071a10 100%)";
  const bearishBg = "linear-gradient(135deg, #160606 0%, #280c0c 40%, #130614 100%)";
  const bullishBorder = "1px solid rgba(16,185,129,0.35)";
  const bearishBorder = "1px solid rgba(239,68,68,0.35)";
  const bullishGlow = "0 0 60px rgba(16,185,129,0.25), 0 0 120px rgba(16,185,129,0.08)";
  const bearishGlow = "0 0 60px rgba(239,68,68,0.25), 0 0 120px rgba(239,68,68,0.08)";
  const accentColor = bullish ? "#10b981" : "#ef4444";
  const accentFaint = bullish ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)";
  const accentBorder = bullish ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="space-y-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div
          ref={cardRef}
          className="insight-card-pulse"
          style={{
            background: bullish ? bullishBg : bearishBg,
            boxShadow: bullish ? bullishGlow : bearishGlow,
            border: bullish ? bullishBorder : bearishBorder,
            borderRadius: "20px",
            padding: "28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "50%",
              background: `radial-gradient(ellipse at 50% 0%, ${accentFaint} 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "18px",
              position: "relative",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.03em",
                  fontFamily: "monospace",
                  lineHeight: 1,
                }}
              >
                {symbol}
              </div>
              <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
                {data.name}
              </div>
            </div>
            <div style={{ fontSize: "44px", lineHeight: 1 }}>{bullish ? "🐂" : "🐻"}</div>
          </div>

          {/* Price */}
          <div style={{ marginBottom: "18px", position: "relative" }}>
            <div
              style={{
                fontSize: "38px",
                fontWeight: 800,
                color: "#fff",
                fontFamily: "monospace",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {currencySymbol}
              {price != null ? price.toFixed(2) : "—"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "6px",
                color: accentColor,
                fontSize: "14px",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {bullish ? "▲" : "▼"}
              {change != null
                ? `${bullish ? "+" : ""}${change.toFixed(2)}`
                : "—"}
              <span style={{ opacity: 0.75 }}>
                ({bullish ? "+" : ""}
                {data.percent?.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Trend + Signal */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "20px",
              position: "relative",
            }}
          >
            <div
              style={{
                background: accentFaint,
                border: `1px solid ${accentBorder}`,
                borderRadius: "10px",
                padding: "10px 14px",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "4px",
                }}
              >
                Trend
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: accentColor }}>
                {data.trend ?? "—"}
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "10px 14px",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "5px",
                }}
              >
                Signal Strength
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "5px",
                }}
              >
                {signalStrength}%
              </div>
              <div
                style={{
                  height: "4px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${signalStrength}%`,
                    background: accentColor,
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Why it's moving */}
          <div style={{ marginBottom: "20px", position: "relative" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "12px",
              }}
            >
              Why it's moving
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              {/* A) Technical signal */}
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: accentColor,
                    letterSpacing: "0.08em",
                    marginBottom: "5px",
                  }}
                >
                  📊 TECHNICAL SIGNAL
                </div>
                <div style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.55" }}>
                  {technicalSignal}
                </div>
              </div>

              {/* B) Market catalyst */}
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: accentColor,
                    letterSpacing: "0.08em",
                    marginBottom: "5px",
                  }}
                >
                  📰 MARKET CATALYST
                </div>
                {catalyst ? (
                  <div>
                    <div style={{ fontSize: "10.5px", color: "#888", marginBottom: "3px" }}>
                      A potential catalyst investors are watching:
                    </div>
                    <a
                      href={catalyst.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "12px",
                        color: "#ddd",
                        lineHeight: "1.5",
                        textDecoration: "none",
                        display: "block",
                      }}
                    >
                      &ldquo;{truncate(catalyst.title, 100)}&rdquo;
                    </a>
                    <div style={{ fontSize: "10.5px", color: "#777", marginTop: "4px" }}>
                      {[catalyst.publisher || "Yahoo Finance", catalystTime]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#888", fontStyle: "italic" }}>
                    No major recent catalyst identified in available news.
                  </div>
                )}
              </div>

              {/* C) Secondary signal */}
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: accentColor,
                    letterSpacing: "0.08em",
                    marginBottom: "5px",
                  }}
                >
                  📈 SECONDARY SIGNAL
                </div>
                <div style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.55" }}>
                  {secondarySignal}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingTop: "14px",
              position: "relative",
            }}
          >
            <div
              style={{ fontSize: "11px", color: "#555", textAlign: "center", marginBottom: "3px" }}
            >
              Generated via Terminal · Market Analyzer
            </div>
            <div style={{ fontSize: "10px", color: "#444", textAlign: "center", fontStyle: "italic" }}>
              Probable contributing factors, not guaranteed causes.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
