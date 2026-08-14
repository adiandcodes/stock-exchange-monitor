import { StockData } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, BarChart2, Activity } from "lucide-react";

interface TrendSummaryProps {
  data: StockData;
  loading?: boolean;
}

export function TrendSummary({ data, loading }: TrendSummaryProps) {
  const trend = data?.trend;
  const volatility = data?.volatility;
  const momentum = data?.momentum;

  return (
    <Card className="border-border bg-card shadow-md">
      <CardContent className="p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Trend Summary
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-md" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Trend */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {trend === "Bullish"
                  ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                  : <TrendingDown className="h-4 w-4 text-rose-400" />
                }
                <span>Trend</span>
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-xs px-2 py-0.5 ${
                  trend === "Bullish"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                }`}
              >
                {trend ?? "—"}
              </Badge>
            </div>

            {/* Volatility */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart2 className="h-4 w-4 text-primary/70" />
                <span>Volatility</span>
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-xs px-2 py-0.5 ${
                  volatility === "Low"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : volatility === "High"
                    ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                    : "border-primary/30 text-primary bg-primary/10"
                }`}
              >
                {volatility ?? "—"}
              </Badge>
            </div>

            {/* Momentum */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-primary/70" />
                <span>Momentum</span>
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-xs px-2 py-0.5 ${
                  momentum === "Bullish Crossover"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : momentum === "Bearish Crossover"
                    ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                    : "border-muted-foreground/30 text-muted-foreground bg-muted/30"
                }`}
              >
                {momentum ?? "—"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
