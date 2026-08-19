import React from "react";
import { getGetCryptoQueryKey, useGetCrypto } from "@workspace/api-client-react";
import { TrendingUp, TrendingDown, Bookmark, BookmarkCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface CryptoTabProps {
  watchlist: string[];
  onToggleWatchlist: (id: string, type: "crypto") => void;
  convert: (v: number | null | undefined) => number | null;
  currencySymbol: string;
}

function fmtConverted(
  n: number | null | undefined,
  symbol: string,
  decimals = 2
): string {
  if (n == null) return "—";
  if (n >= 1e12) return `${symbol}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${symbol}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${symbol}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)
    return `${symbol}${n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  return `${symbol}${n.toFixed(n < 1 ? 6 : decimals)}`;
}

const COIN_GLOW: Record<string, string> = {
  bitcoin: "rgba(247,147,26,0.35)",
  ethereum: "rgba(98,126,234,0.35)",
  binancecoin: "rgba(243,186,47,0.35)",
  solana: "rgba(153,69,255,0.35)",
  ripple: "rgba(0,166,255,0.30)",
  dogecoin: "rgba(196,166,60,0.30)",
  cardano: "rgba(0,51,173,0.30)",
  avalanche2: "rgba(232,65,66,0.30)",
  "avalanche-2": "rgba(232,65,66,0.30)",
  polkadot: "rgba(230,0,122,0.30)",
  chainlink: "rgba(55,91,210,0.30)",
  tron: "rgba(255,0,0,0.22)",
};

export function CryptoTab({
  watchlist,
  onToggleWatchlist,
  convert,
  currencySymbol,
}: CryptoTabProps) {
  const { data, isLoading, isError } = useGetCrypto(
    {},
    { query: { queryKey: getGetCryptoQueryKey({}), refetchInterval: 60_000, refetchOnWindowFocus: false } }
  );

  const coins = data?.coins ?? [];
  const isWatched = (id: string) => watchlist.includes(`crypto:${id}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          Top Cryptocurrencies · CoinGecko
        </h2>
        <span className="text-xs text-muted-foreground">Auto-refreshes every 60s</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load crypto data. CoinGecko may be rate-limiting. Try again shortly.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {coins.map((coin) => {
            const pos = (coin.change24h ?? 0) >= 0;
            const watched = isWatched(coin.id);
            const glowColor =
              COIN_GLOW[coin.id] ??
              (pos ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)");
            const convertedPrice = convert(coin.price);
            const convertedMcap = convert(coin.marketCap);
            const convertedVol = convert(coin.volume24h);

            return (
              <div
                key={coin.id}
                className="crypto-card bg-card border border-border rounded-xl p-4 space-y-2.5 relative group cursor-default"
                style={{ "--coin-glow": glowColor } as React.CSSProperties}
              >
                <div
                  className="crypto-card-glow"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${glowColor} 0%, transparent 70%)`,
                  }}
                />

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    {coin.image && (
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-bold text-sm">{coin.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {coin.symbol}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onToggleWatchlist(coin.id, "crypto")}
                    title={watched ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    {watched ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                <div className="relative z-10">
                  <div className="text-2xl font-bold font-mono">
                    {fmtConverted(convertedPrice, currencySymbol)}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-mono mt-0.5 ${
                      pos ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {pos ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {pos ? "+" : ""}
                    {coin.change24h?.toFixed(2) ?? "—"}%
                  </div>
                </div>

                <div className="pt-1 border-t border-border/50 space-y-1 text-xs relative z-10">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-mono">
                      {fmtConverted(convertedMcap, currencySymbol, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">24h Vol</span>
                    <span className="font-mono">
                      {fmtConverted(convertedVol, currencySymbol, 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
