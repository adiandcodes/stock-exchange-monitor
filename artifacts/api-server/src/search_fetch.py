#!/usr/bin/env python3
"""Search for stock symbols via Yahoo Finance search API."""
import sys
import json
import urllib.request
import urllib.parse
import urllib.error


def search_symbols(query: str) -> list[dict]:
    encoded = urllib.parse.quote(query)
    url = (
        f"https://query2.finance.yahoo.com/v1/finance/search"
        f"?q={encoded}&lang=en-US&region=US&quotesCount=8&newsCount=0"
        f"&enableFuzzyQuery=true&enableCb=false&enableNavLinks=false"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        return []

    quotes = data.get("quotes", [])
    results = []
    seen = set()
    for q in quotes:
        sym = q.get("symbol", "")
        if not sym or sym in seen:
            continue
        # Skip non-equity/ETF items that aren't useful
        qtype = q.get("quoteType", "")
        if qtype in ("FUTURE", "CURRENCY", "OPTION"):
            continue
        seen.add(sym)
        results.append({
            "symbol": sym,
            "name": q.get("longname") or q.get("shortname") or sym,
            "exchange": q.get("exchDisp") or q.get("exchange") or "",
            "type": qtype,
        })
        if len(results) >= 5:
            break
    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing_query", "message": "Query required"}))
        sys.exit(1)
    query = " ".join(sys.argv[1:])
    results = search_symbols(query)
    print(json.dumps({"results": results}))
