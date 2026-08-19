import React from "react";
import { getGetMetalsQueryKey, useGetMetals } from "@workspace/api-client-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetalsTabProps {
  convert: (v: number | null | undefined) => number | null;
  currencySymbol: string;
}

const METAL_ICONS: Record<string, string> = {
  Gold: "🥇",
  Silver: "🥈",
  Platinum: "⬜",
  Copper: "🟫",
};

function fmtPrice(
  price: number | null | undefined,
  symbol: string
): string {
  if (price == null) return "—";
  return `${symbol}${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MetalsTab({ convert, currencySymbol }: MetalsTabProps) {
  const { data, isLoading, isError } = useGetMetals({
    query: { queryKey: getGetMetalsQueryKey(), refetchInterval: 5 * 60_000, refetchOnWindowFocus: false },
  });

  const metals = data?.metals ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
        Precious Metals · Live Futures Prices
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load metals data.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metals.map((m) => {
            const pos = (m.percent ?? 0) >= 0;
            const convertedPrice = convert(m.price);
            const convertedChange = convert(m.change);

            return (
              <div
                key={m.symbol}
                className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{METAL_ICONS[m.name] ?? "🔘"}</span>
                    <div>
                      <div className="font-bold">{m.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {m.symbol}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-3xl font-bold font-mono tracking-tight">
                    {fmtPrice(convertedPrice, currencySymbol)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    per {m.unit}
                  </div>
                </div>

                {m.change != null && (
                  <div
                    className={`flex items-center gap-1.5 text-sm font-mono ${
                      pos ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {pos ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {pos ? "+" : ""}
                    {convertedChange != null
                      ? convertedChange.toFixed(2)
                      : "—"}{" "}
                    ({pos ? "+" : ""}
                    {m.percent?.toFixed(2)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        Prices from Yahoo Finance futures contracts (GC=F, SI=F, PL=F, HG=F). Refreshes every 5
        minutes.
      </div>
    </div>
  );
}
