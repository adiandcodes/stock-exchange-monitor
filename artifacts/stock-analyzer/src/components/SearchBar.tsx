import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onSelect, placeholder }: SearchBarProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error("search failed");
      const data = await resp.json();
      setResults(data.results || []);
      setOpen((data.results || []).length > 0);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSelect = (result: SearchResult) => {
    onChange(result.symbol);
    setOpen(false);
    setResults([]);
    onSelect(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (results.length > 0) {
        handleSelect(results[0]);
      } else {
        onSelect({
          symbol: value.trim().toUpperCase(),
          name: value.trim().toUpperCase(),
          exchange: "",
          type: "EQUITY",
        });
        setOpen(false);
      }
    }
    if (e.key === "Escape") { setOpen(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      EQUITY: "Stock", ETF: "ETF", MUTUALFUND: "Fund",
      CRYPTOCURRENCY: "Crypto", INDEX: "Index", FUTURE: "Future",
    };
    return map[t] || t;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-3 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder ?? "Search stocks, crypto… (e.g. Google, Reliance)"}
          className="pl-9 font-mono bg-card border-border h-11 shadow-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono font-bold text-primary text-sm shrink-0">{r.symbol}</span>
                <span className="text-sm text-foreground truncate">{r.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs text-muted-foreground">{r.exchange}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                  {typeLabel(r.type)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
