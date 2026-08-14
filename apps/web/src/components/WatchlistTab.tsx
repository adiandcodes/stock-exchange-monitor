import React, { useEffect, useState } from "react";
import { Bookmark, X, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WatchlistItem {
  id: string;       // e.g. "stock:AAPL" or "crypto:bitcoin"
  type: "stock" | "crypto";
  symbol: string;   // display symbol
  name?: string;
  addedAt: number;
}

interface WatchlistTabProps {
  watchlist: string[];
  onRemove: (id: string) => void;
  onSelectStock: (symbol: string) => void;
}

export function WatchlistTab({ watchlist, onRemove, onSelectStock }: WatchlistTabProps) {
  const [prices, setPrices] = useState<Record<string, { price?: number; change?: number; percent?: number; name?: string }>>({});

  useEffect(() => {
    const stockSymbols = watchlist
      .filter((id) => id.startsWith("stock:"))
      .map((id) => id.replace("stock:", ""));

    stockSymbols.forEach(async (sym) => {
      if (prices[sym]) return;
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/stock?symbol=${encodeURIComponent(sym)}&period=1mo`);
        if (!r.ok) return;
        const d = await r.json();
        setPrices((prev) => ({
          ...prev,
          [sym]: { price: d.price, change: d.change, percent: d.percent, name: d.name },
        }));
      } catch {}
    });
  }, [watchlist]);

  if (watchlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Bookmark className="h-12 w-12 text-muted-foreground/30" />
        <div>
          <p className="text-muted-foreground font-medium">Your watchlist is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the bookmark icon on stocks and crypto to save them here.
          </p>
        </div>
      </div>
    );
  }

  const stockItems = watchlist.filter((id) => id.startsWith("stock:"));
  const cryptoItems = watchlist.filter((id) => id.startsWith("crypto:"));

  const renderItem = (id: string) => {
    const isStock = id.startsWith("stock:");
    const sym = id.replace(/^(stock:|crypto:)/, "");
    const info = isStock ? prices[sym] : null;
    const pos = (info?.percent ?? 0) >= 0;

    return (
      <div
        key={id}
        className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">{sym.toUpperCase()}</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                {isStock ? "Stock" : "Crypto"}
              </span>
            </div>
            {info?.name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{info.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isStock && info?.price != null && (
            <div className="text-right">
              <div className="font-mono font-bold">${info.price.toFixed(2)}</div>
              <div className={`flex items-center justify-end gap-1 text-xs font-mono ${pos ? "text-emerald-500" : "text-rose-500"}`}>
                {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {pos ? "+" : ""}{info.percent?.toFixed(2)}%
              </div>
            </div>
          )}

          {isStock && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onSelectStock(sym)}
              title="Open in Stocks tab"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
            onClick={() => onRemove(id)}
            title="Remove from watchlist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {stockItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Stocks</h3>
          {stockItems.map(renderItem)}
        </div>
      )}
      {cryptoItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Crypto</h3>
          {cryptoItems.map(renderItem)}
        </div>
      )}
    </div>
  );
}
