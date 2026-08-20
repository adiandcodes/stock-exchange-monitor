import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { StockData } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";

interface StockChartProps {
  data: StockData;
  period: "1h" | "1mo" | "3mo" | "6mo" | "1y";
  convert: (v: number | null | undefined, fromCurrency?: string) => number | null;
  currencySymbol: string;
}

const getSliceCount = (period: string) => {
  switch (period) {
    case "1h":  return Infinity; // intraday data already pre-sliced
    case "1mo": return 21;
    case "3mo": return 63;
    case "6mo": return 126;
    case "1y":
    default: return Infinity;
  }
};

// Normalize prices to 100 at the start for benchmark comparison
function normalizeToBase(prices: (number | null)[]): (number | null)[] {
  const first = prices.find((v) => v != null);
  if (!first) return prices;
  return prices.map((v) => (v != null ? Math.round((v / first) * 10000) / 100 : null));
}

// Align benchmark data to match stock dates (simple date-based join)
function alignByDate(
  stockDates: string[],
  benchDates: string[],
  benchPrices: (number | null)[]
): (number | null)[] {
  const benchMap = new Map<string, number | null>();
  benchDates.forEach((d, i) => benchMap.set(d, benchPrices[i] ?? null));
  return stockDates.map((d) => benchMap.get(d) ?? null);
}

export function StockChart({ data, period, convert, currencySymbol }: StockChartProps) {
  const isIntraday = period === "1h";

  const chartData = useMemo(() => {
    if (!data.dates || !data.closePrices) return [];

    const sliceCount = getSliceCount(period);
    const startIdx = Math.max(0, data.dates.length - sliceCount);

    return data.dates.slice(startIdx).map((dateStr, i) => {
      const idx = startIdx + i;
      return {
        date: dateStr, // already formatted as "HH:MM" for 1h, or full date otherwise
        close: convert(data.closePrices[idx], data.currency) ?? null,
        ma7:   isIntraday ? null : convert(data.ma7[idx], data.currency) ?? null,
        ma30:  isIntraday ? null : convert(data.ma30[idx], data.currency) ?? null,
        volume: data.volume[idx] ?? null,
      };
    });
  }, [data, period, isIntraday, convert]);

  const benchmarkData = useMemo(() => {
    if (isIntraday) return [];
    if (!data.benchmarkDates?.length || !data.benchmarkPrices?.length || !data.dates?.length) return [];

    const sliceCount = getSliceCount(period);
    const startIdx = Math.max(0, data.dates.length - sliceCount);
    const slicedDates = data.dates.slice(startIdx);
    const slicedClosePrices = data.closePrices.slice(startIdx);

    const alignedBench = alignByDate(slicedDates, data.benchmarkDates, data.benchmarkPrices);
    const normStock = normalizeToBase(slicedClosePrices);
    const normBench = normalizeToBase(alignedBench);

    return slicedDates.map((d, i) => ({
      date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      stock: normStock[i] ?? null,
      benchmark: normBench[i] ?? null,
    }));
  }, [data, period, isIntraday]);

  if (chartData.length === 0) return null;

  const benchLabel = data.benchmarkSymbol === "^NSEI" ? "NIFTY 50" : "S&P 500";

  // For intraday, format the XAxis date labels nicely (they are already "HH:MM")
  const xTickFormatter = isIntraday
    ? (val: string) => val
    : (val: string) => val;

  return (
    <div className="flex flex-col gap-4">
      {/* Price Chart */}
      <Card className="border-border bg-card shadow-md">
        <CardContent className="p-4 pt-6">
          {isIntraday && (
            <p className="text-xs text-muted-foreground font-mono mb-2">
              Last 1 hour · 5-min candles
            </p>
          )}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={isIntraday ? 20 : 30}
                  tickFormatter={xTickFormatter}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${currencySymbol}${val}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "8px", fontSize: "12px" }}
                  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px", fontSize: "11px" }}
                  formatter={(val: number) => [`${currencySymbol}${val?.toFixed(2)}`, undefined]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line type="monotone" dataKey="close" name="Price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                {!isIntraday && (
                  <>
                    <Line type="monotone" dataKey="ma7" name="7-Day MA" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="ma30" name="30-Day MA" stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card className="border-border bg-card shadow-md">
        <CardContent className="p-4 pt-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Volume</p>
          <div className="h-[100px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(val) => {
                    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
                    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                    if (val >= 1e3) return `${(val / 1e3).toFixed(0)}k`;
                    return String(val);
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => [new Intl.NumberFormat("en-US").format(value), "Volume"]}
                />
                <Bar dataKey="volume" name="Volume" fill="hsl(var(--muted-foreground) / 0.3)" radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Comparison — hidden for intraday */}
      {!isIntraday && benchmarkData.length > 1 && (
        <Card className="border-border bg-card shadow-md">
          <CardContent className="p-4 pt-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              vs {benchLabel} (Indexed to 100)
            </p>
            <div className="h-[130px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={benchmarkData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [`${val?.toFixed(1)}`, undefined]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                  <Line type="monotone" dataKey="stock" name={data.symbol} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="benchmark" name={benchLabel} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
