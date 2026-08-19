import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGetStock, getGetStockQueryKey } from "@workspace/api-client-react";
import { StockChart } from "@/components/StockChart";
import { StockSnapshot } from "@/components/StockSnapshot";
import { TrendSummary } from "@/components/TrendSummary";
import { TopMovers } from "@/components/TopMovers";
import { SearchBar } from "@/components/SearchBar";
import { NewsPanel } from "@/components/NewsPanel";
import { CryptoTab } from "@/components/CryptoTab";
import { MetalsTab } from "@/components/MetalsTab";
import { WatchlistTab } from "@/components/WatchlistTab";
import { ShareInsightCard } from "@/components/ShareInsightCard";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp, TrendingDown, Activity, AlertCircle,
  BarChart2, Bitcoin, Bookmark, Layers, Share2,
  ChevronDown, ChevronUp,
} from "lucide-react";

type Tab = "stocks" | "crypto" | "watchlist" | "metals";
type Period = "1h" | "1mo" | "3mo" | "6mo" | "1y";

const MAGNIFICENT_7 = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"];

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "stocks",    label: "Stocks",    icon: <BarChart2 className="h-4 w-4" /> },
  { id: "crypto",    label: "Crypto",    icon: <Bitcoin className="h-4 w-4" /> },
  { id: "watchlist", label: "Watchlist", icon: <Bookmark className="h-4 w-4" /> },
  { id: "metals",    label: "Metals",    icon: <Layers className="h-4 w-4" /> },
];

const STORAGE_KEY = "market_watchlist";
const CURRENCIES = ["USD", "INR", "EUR"] as const;

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveWatchlist(list: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export default function Home() {
  const [activeTab, setActiveTab]       = useState<Tab>("stocks");
  const [tabKey, setTabKey]             = useState(0);
  const [symbolInput, setSymbolInput]   = useState("AAPL");
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [period, setPeriod]             = useState<Period>("6mo");
  const [watchlist, setWatchlist]       = useState<string[]>(() => loadWatchlist());
  const [showShareCard, setShowShareCard] = useState(false);
  const [keyIndicatorsOpen, setKeyIndicatorsOpen] = useState(true);
  const [snapshotOpen, setSnapshotOpen]           = useState(true);

  const { currency, setCurrency, convert, symbol: currencySymbol } = useCurrency();

  const { data: stockData, isLoading, isError, error } = useGetStock(
    { symbol: activeSymbol, period: "1y" },
    {
      query: {
        enabled: !!activeSymbol && activeTab === "stocks",
        queryKey: getGetStockQueryKey({ symbol: activeSymbol, period: "1y" }),
        retry: false,
        refetchOnWindowFocus: false,
      },
    }
  );

  const { data: intradayData, isLoading: intradayLoading } = useGetStock(
    { symbol: activeSymbol, period: "1h" },
    {
      query: {
        enabled: !!activeSymbol && activeTab === "stocks" && period === "1h",
        queryKey: [...getGetStockQueryKey({ symbol: activeSymbol, period: "1h" }), "intraday"],
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
    }
  );

  const chartData    = period === "1h" ? (intradayData ?? stockData) : stockData;
  const chartLoading = period === "1h" ? (intradayLoading && !intradayData) : isLoading;

  useEffect(() => { saveWatchlist(watchlist); }, [watchlist]);

  const trendGradient = useMemo(() => {
    if (!stockData?.percent || activeTab !== "stocks") return "none";
    return stockData.percent >= 0
      ? "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.30) 0%, transparent 70%)"
      : "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(180,20,20,0.22) 0%, transparent 70%)";
  }, [stockData?.percent, activeTab]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setTabKey((k) => k + 1);
  };

  const handleSelect = useCallback((result: {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
  }) => {
    const upper = result.symbol.trim().toUpperCase();
    setSymbolInput(upper);

    if (result.type === "CRYPTOCURRENCY") {
      setActiveTab("crypto");
      setActiveSymbol(upper);
    } else {
      setActiveSymbol(upper);
      setActiveTab("stocks");
    }

    setTabKey((k) => k + 1);
  }, []);

  const handleQuickSelect = (sym: string) => {
    setSymbolInput(sym);
    setActiveSymbol(sym);
  };

  const toggleWatchlist = useCallback((id: string, type: "stock" | "crypto") => {
    const key = `${type}:${id}`;
    setWatchlist((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const removeFromWatchlist = useCallback((key: string) => {
    setWatchlist((prev) => prev.filter((k) => k !== key));
  }, []);

  const isStockWatched = watchlist.includes(`stock:${activeSymbol}`);
  const isPositive     = (stockData?.change ?? 0) >= 0;
  const convertedPrice  = convert(stockData?.price);
  const convertedChange = convert(stockData?.change);
  const convertedPrev   = convert(stockData?.prevPrice);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-24 relative">
      {/* Ambient trend background */}
      <div className="trend-bg" style={{ background: trendGradient }} />

      {/* Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="shrink-0">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              Terminal
            </h1>
            <p className="text-muted-foreground text-[10px] font-mono tracking-widest uppercase hidden sm:block">
              Market Analyzer
            </p>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1 border border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === "watchlist" && watchlist.length > 0 && (
                  <span className="bg-primary/20 text-primary text-xs px-1 rounded-full font-mono leading-none py-0.5">
                    {watchlist.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right side: search + currency */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="flex-1 hidden md:block">
              <SearchBar
                value={symbolInput}
                onChange={setSymbolInput}
                onSelect={handleSelect}
                placeholder="Search stocks, ETFs…"
              />
            </div>
            {/* Currency selector */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border shrink-0">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 text-xs font-mono rounded ${
                    currency === c
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 relative z-10">
        {/* Mobile search */}
        <div className="md:hidden">
          <SearchBar value={symbolInput} onChange={setSymbolInput} onSelect={handleSelect} />
        </div>

        {/* ── STOCKS TAB ── */}
        {activeTab === "stocks" && (
          <div key={tabKey} className="tab-content space-y-5">
            {/* Mag 7 quick-picks */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider mr-1">
                Mag 7:
              </span>
              {MAGNIFICENT_7.map((sym) => (
                <Button
                  key={sym}
                  variant="outline"
                  size="sm"
                  className={`h-7 px-3 text-xs font-mono ${
                    activeSymbol === sym
                      ? "bg-primary/20 text-primary border-primary/50"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleQuickSelect(sym)}
                >
                  {sym}
                </Button>
              ))}
            </div>

            {isError && (
              <Alert
                variant="destructive"
                className="bg-destructive/10 border-destructive/20 text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {(error as any)?.message ??
                    "Failed to fetch stock data. Check the symbol and try again."}
                </AlertDescription>
              </Alert>
            )}

            {/* 3-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left column */}
              <div className="lg:col-span-3 space-y-4">
                {/* Price card */}
                <Card className="bg-card border-border shadow-md relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${
                      isLoading
                        ? "bg-muted"
                        : isPositive
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <CardContent className="p-5">
                    {isLoading || !stockData ? (
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-36 mt-2" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-7 w-28 mt-2" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                              {stockData.symbol}
                            </h2>
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {stockData.name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mt-1 -mr-1"
                            onClick={() => toggleWatchlist(activeSymbol, "stock")}
                            title={
                              isStockWatched
                                ? "Remove from watchlist"
                                : "Add to watchlist"
                            }
                          >
                            <Bookmark
                              className={`h-4 w-4 ${
                                isStockWatched
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        </div>
                        <div>
                          <div className="text-4xl font-bold font-mono tracking-tight flex items-baseline gap-1">
                            <span className="text-base text-muted-foreground font-sans font-normal">
                              {currencySymbol}
                            </span>
                            {convertedPrice != null
                              ? convertedPrice.toFixed(2)
                              : "—"}
                          </div>
                          <div
                            className={`flex items-center gap-1.5 mt-1 font-mono text-sm ${
                              isPositive ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {isPositive ? "+" : ""}
                              {convertedChange != null
                                ? convertedChange.toFixed(2)
                                : "—"}
                            </span>
                            <span className="opacity-75">
                              ({isPositive ? "+" : ""}
                              {stockData.percent?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        {stockData.insight && (
                          <Badge
                            variant="outline"
                            className={`font-mono uppercase px-2.5 py-1 text-xs ${
                              stockData.insight === "Uptrend"
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                : stockData.insight === "Downtrend"
                                ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                                : "border-primary/30 text-primary bg-primary/10"
                            }`}
                          >
                            {stockData.insight === "Uptrend" && (
                              <TrendingUp className="h-3 w-3 mr-1.5 inline" />
                            )}
                            {stockData.insight === "Downtrend" && (
                              <TrendingDown className="h-3 w-3 mr-1.5 inline" />
                            )}
                            {stockData.insight === "Momentum Shift" && (
                              <Activity className="h-3 w-3 mr-1.5 inline" />
                            )}
                            {stockData.insight}
                          </Badge>
                        )}

                        {/* Share Insight button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2 mt-1 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => setShowShareCard(true)}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share Insight
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Key Indicators — collapsible */}
                <div className="bg-muted/30 rounded-lg border border-border/50">
                  <button
                    onClick={() => setKeyIndicatorsOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-4 pt-4 pb-3 text-left"
                  >
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Key Indicators
                    </h3>
                    {keyIndicatorsOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
                    )}
                  </button>
                  <div
                    className={`collapsible-section ${
                      keyIndicatorsOpen ? "collapsible-section--open" : ""
                    }`}
                  >
                    <div className="px-4 pb-4">
                      {isLoading || !stockData ? (
                        <div className="space-y-2.5">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-sm">
                          {[
                            ["Prev Close", convert(stockData.prevPrice)],
                            ["Day High",   convert(stockData.dayHigh)],
                            ["Day Low",    convert(stockData.dayLow)],
                            ["5D MA",      convert(stockData.ma7?.[stockData.ma7.length - 1])],
                            ["20D MA",     convert(stockData.ma30?.[stockData.ma30.length - 1])],
                          ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-mono">
                                {val != null
                                  ? `${currencySymbol}${(val as number).toFixed(2)}`
                                  : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Snapshot — collapsible */}
                <div className="bg-card border border-border rounded-lg shadow-md">
                  <button
                    onClick={() => setSnapshotOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-4 pt-4 pb-3 text-left"
                  >
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Stock Snapshot
                    </h3>
                    {snapshotOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
                    )}
                  </button>
                  <div
                    className={`collapsible-section ${
                      snapshotOpen ? "collapsible-section--open" : ""
                    }`}
                  >
                    <div className="px-4 pb-4">
                      {stockData && (
                        <StockSnapshot
                          data={stockData}
                          loading={isLoading}
                          convert={convert}
                          currencySymbol={currencySymbol}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {stockData && <TrendSummary data={stockData} loading={isLoading} />}
              </div>

              {/* Center: chart */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold font-mono uppercase tracking-wider text-muted-foreground">
                    Price Action
                  </h2>
                  <div className="flex items-center p-0.5 bg-muted/50 rounded-md border border-border">
                    {(["1h", "1mo", "3mo", "6mo", "1y"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1 text-xs font-mono rounded-sm ${
                          period === p
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {chartLoading || !chartData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[280px] w-full rounded-xl" />
                    <Skeleton className="h-[90px] w-full rounded-xl" />
                    <Skeleton className="h-[120px] w-full rounded-xl" />
                  </div>
                ) : (
                  <StockChart data={chartData} period={period} />
                )}

                {!isLoading && stockData && <NewsPanel symbol={activeSymbol} />}
              </div>

              {/* Right: movers */}
              <div className="lg:col-span-3">
                <TopMovers onSelect={handleSelect} />
              </div>
            </div>
          </div>
        )}

        {/* ── CRYPTO TAB ── */}
        {activeTab === "crypto" && (
          <div key={tabKey} className="tab-content">
            <CryptoTab
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              convert={convert}
              currencySymbol={currencySymbol}
            />
          </div>
        )}

        {/* ── WATCHLIST TAB ── */}
        {activeTab === "watchlist" && (
          <div key={tabKey} className="tab-content">
            <WatchlistTab
              watchlist={watchlist}
              onRemove={removeFromWatchlist}
              onSelectStock={handleSelect}
            />
          </div>
        )}

        {/* ── METALS TAB ── */}
        {activeTab === "metals" && (
          <div key={tabKey} className="tab-content">
            <MetalsTab convert={convert} currencySymbol={currencySymbol} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 mt-8 py-5 text-center">
        <p className="text-xs text-muted-foreground/60 font-mono tracking-wide">
          Built with precision by{" "}
          <span className="text-primary/70 font-semibold">Aditya Sharma</span>
        </p>
      </footer>

      {/* Share Insight Card modal */}
      {showShareCard && stockData && (
        <ShareInsightCard
          data={stockData}
          symbol={activeSymbol}
          currencySymbol={currencySymbol}
          convert={convert}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
