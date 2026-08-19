import { useGetMovers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TopMoversProps {
  onSelect: (symbol: string) => void;
}

export function TopMovers({ onSelect }: TopMoversProps) {
  const { data, isLoading } = useGetMovers();

  return (
    <Card className="border-border bg-card shadow-md">
      <CardContent className="p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Top Movers
        </h3>
        {isLoading || !data ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gainers */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/80">Gainers</span>
              </div>
              <div className="space-y-1.5">
                {data.gainers.map((mover) => (
                  <button
                    key={mover.symbol}
                    onClick={() => onSelect(mover.symbol)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-muted/20 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all group text-left"
                  >
                    <div>
                      <span className="text-xs font-mono font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                        {mover.symbol}
                      </span>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">{mover.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-emerald-400">
                        +{mover.percent.toFixed(2)}%
                      </span>
                      <p className="text-xs font-mono text-muted-foreground">
                        {mover.currency === "INR" ? "₹" : "$"}{mover.price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-rose-400/80">Losers</span>
              </div>
              <div className="space-y-1.5">
                {data.losers.map((mover) => (
                  <button
                    key={mover.symbol}
                    onClick={() => onSelect(mover.symbol)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-muted/20 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all group text-left"
                  >
                    <div>
                      <span className="text-xs font-mono font-semibold text-foreground group-hover:text-rose-400 transition-colors">
                        {mover.symbol}
                      </span>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">{mover.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-rose-400">
                        {mover.percent.toFixed(2)}%
                      </span>
                      <p className="text-xs font-mono text-muted-foreground">
                        {mover.currency === "INR" ? "₹" : "$"}{mover.price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
