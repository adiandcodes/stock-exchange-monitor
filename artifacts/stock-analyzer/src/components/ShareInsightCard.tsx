import React, { useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { X, Download } from "lucide-react";
import { StockData } from "@workspace/api-client-react";

interface ShareInsightCardProps {
  data: StockData;
  symbol: string;
  currencySymbol: string;
  convert: (v: number | null | undefined) => number | null;
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

function getReasons(data: StockData): string[] {
  const pct = data.percent ?? 0;
  const bullish = pct >= 0;
  const reasons: string[] = [];

  if (Math.abs(pct) > 1) {
    reasons.push(
      `${bullish ? "+" : ""}${pct.toFixed(2)}% move today signals ${bullish ? "strong buying" : "heavy selling"} pressure`
    );
  } else {
    reasons.push(`Modest ${Math.abs(pct).toFixed(2)}% day-change — market is consolidating`);
  }

  if (data.momentum === "Bullish Crossover") {
    reasons.push("5D MA crossed above 20D MA — classic bullish momentum signal");
  } else if (data.momentum === "Bearish Crossover") {
    reasons.push("5D MA crossed below 20D MA — bearish momentum signal detected");
  } else if (data.trend === "Bullish") {
    reasons.push("Short-term MA trending above long-term MA — uptrend intact");
  } else {
    reasons.push("Short-term MA trending below long-term MA — downward pressure");
  }

  if (data.volatility === "Low") {
    reasons.push("Low volatility environment — controlled, steady price movement");
  } else if (data.volatility === "High") {
    reasons.push("High volatility detected — significant price swings expected");
  } else {
    reasons.push("Moderate volatility — balanced buying and selling pressure");
  }

  return reasons.slice(0, 3);
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
  const reasons = getReasons(data);
  const price = convert(data.price);
  const change = convert(data.change);

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
                marginBottom: "10px",
              }}
            >
              Why it's moving
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {reasons.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span
                    style={{ color: accentColor, flexShrink: 0, marginTop: "1px", fontSize: "12px" }}
                  >
                    {bullish ? "▲" : "▼"}
                  </span>
                  <span
                    style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.55" }}
                  >
                    {r}
                  </span>
                </div>
              ))}
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
