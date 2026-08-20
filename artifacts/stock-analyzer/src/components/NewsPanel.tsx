import React from "react";
import { getGetNewsQueryKey, useGetNews } from "@workspace/api-client-react";
import { ExternalLink, Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsPanelProps {
  symbol?: string;
}

// publishedAt is typed as `string` but Yahoo's feed sometimes serializes it
// as a raw Unix epoch (seconds, not milliseconds) instead of ISO-8601. Feeding
// that straight into `new Date()` is misread as an epoch-milliseconds value
// landing near 1970, producing bogus multi-thousand-day "ago" text. Detect
// and normalize both shapes before parsing.
function parsePublishedAt(value: unknown): Date | null {
  if (value == null || value === "") return null;

  let num: number | null = null;
  if (typeof value === "number") num = value;
  else if (typeof value === "string" && /^\d+$/.test(value)) num = Number(value);

  if (num != null) {
    const ms = num < 1e12 ? num * 1000 : num; // seconds vs milliseconds epoch
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function timeAgo(value: unknown): string {
  const d = parsePublishedAt(value);
  if (!d) return typeof value === "string" ? value : "";

  const diff = Math.max(Date.now() - d.getTime(), 0);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function NewsPanel({ symbol }: NewsPanelProps) {
  const { data, isLoading } = useGetNews(
    symbol ? { symbol } : {},
    { query: { queryKey: getGetNewsQueryKey(symbol ? { symbol } : {}), refetchOnWindowFocus: false } }
  );

  const articles = data?.articles ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {symbol ? `${symbol} News` : "Market News"}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No news available.</p>
      ) : (
        <div className="space-y-3">
          {articles.slice(0, 6).map((article, i) => (
            <a
              key={i}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex gap-3 items-start">
                {article.thumbnail && (
                  <img
                    src={article.thumbnail}
                    alt=""
                    className="w-14 h-10 object-cover rounded shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                    <ExternalLink className="inline h-3 w-3 ml-1 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.publisher} · {timeAgo(article.publishedAt)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
