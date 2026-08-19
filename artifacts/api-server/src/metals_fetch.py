#!/usr/bin/env python3
"""Fetch precious metals prices via yfinance."""
import sys
import json
import yfinance as yf

METALS = [
    {"symbol": "GC=F", "name": "Gold",     "unit": "troy oz"},
    {"symbol": "SI=F", "name": "Silver",   "unit": "troy oz"},
    {"symbol": "PL=F", "name": "Platinum", "unit": "troy oz"},
    {"symbol": "HG=F", "name": "Copper",   "unit": "lb"},
]


def get_metals() -> list[dict]:
    symbols = [m["symbol"] for m in METALS]
    tickers = yf.Tickers(" ".join(symbols))
    results = []
    for metal in METALS:
        sym = metal["symbol"]
        try:
            info = tickers.tickers[sym].info
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            prev  = info.get("regularMarketPreviousClose") or info.get("previousClose")
            currency = info.get("currency", "USD")
            change  = round(price - prev, 4) if price and prev else None
            percent = round((change / prev) * 100, 4) if change and prev else None
            results.append({
                "symbol":   sym,
                "name":     metal["name"],
                "price":    round(price, 4) if price else None,
                "change":   change,
                "percent":  percent,
                "currency": currency,
                "unit":     metal["unit"],
            })
        except Exception as e:
            results.append({
                "symbol":   sym,
                "name":     metal["name"],
                "price":    None,
                "change":   None,
                "percent":  None,
                "currency": "USD",
                "unit":     metal["unit"],
            })
    return results


if __name__ == "__main__":
    try:
        metals = get_metals()
        print(json.dumps({"metals": metals}))
    except Exception as e:
        print(json.dumps({"error": "fetch_error", "message": str(e)}))
        sys.exit(1)
