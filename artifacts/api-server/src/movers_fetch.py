#!/usr/bin/env python3
"""Fetch top gainers and losers from a predefined watchlist."""
import sys
import json
import yfinance as yf

WATCHLIST = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
    "JPM", "V", "JNJ", "WMT", "UNH", "XOM", "PG", "MA",
    "HD", "CVX", "MRK", "ABBV", "PFE", "BAC", "KO", "CSCO",
    "ORCL", "ADBE", "NFLX", "CRM", "AMD", "INTC", "QCOM",
]


def get_movers():
    results = []
    tickers = yf.Tickers(" ".join(WATCHLIST))

    for sym in WATCHLIST:
        try:
            info = tickers.tickers[sym].info
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            prev = info.get("previousClose") or info.get("regularMarketPreviousClose")
            name = info.get("shortName") or info.get("longName") or sym
            currency = info.get("currency", "USD")
            if price and prev:
                change = round(price - prev, 4)
                percent = round((change / prev) * 100, 4)
                results.append({
                    "symbol": sym,
                    "name": name,
                    "price": price,
                    "change": change,
                    "percent": percent,
                    "currency": currency,
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["percent"], reverse=True)
    gainers = results[:3]
    losers = sorted(results, key=lambda x: x["percent"])[:3]

    return {"gainers": gainers, "losers": losers}


if __name__ == "__main__":
    print(json.dumps(get_movers()))
