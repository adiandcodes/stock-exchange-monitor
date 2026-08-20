import { StockData } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StockSnapshotProps {
  data: StockData;
  loading?: boolean;
  convert: (v: number | null | undefined, fromCurrency?: string) => number | null;
  currencySymbol: string;
}

function fmtConverted(
  val: number | null | undefined,
  symbol: string
): string {
  if (val == null) return "—";
  return `${symbol}${val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtMarketCap(
  val: number | null | undefined,
  symbol: string
): string {
  if (val == null) return "—";
  if (val >= 1e12) return `${symbol}${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `${symbol}${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${symbol}${(val / 1e6).toFixed(2)}M`;
  return `${symbol}${val.toLocaleString()}`;
}

function fmtVolume(val: number | null | undefined): string {
  if (val == null) return "—";
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return String(val);
}

const ROWS = [
  { label: "Day High", key: "dayHigh" as keyof StockData },
  { label: "Day Low", key: "dayLow" as keyof StockData },
  { label: "52W High", key: "weekHigh52" as keyof StockData },
  { label: "52W Low", key: "weekLow52" as keyof StockData },
];

export function StockSnapshot({
  data,
  loading,
  convert,
  currencySymbol,
}: StockSnapshotProps) {
  const latestVol = data?.volume?.length
    ? data.volume[data.volume.length - 1]
    : null;

  return (
    <div>
      {loading ? (
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5 text-sm">
            {ROWS.map(({ label, key }) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium">
                  {fmtConverted(
                    convert(data[key] as number | null, data.currency),
                    currencySymbol
                  )}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-mono font-medium">
                {fmtVolume(latestVol)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Market Cap</span>
              <span className="font-mono font-medium">
                {fmtMarketCap(convert(data.marketCap, data.currency), currencySymbol)}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
