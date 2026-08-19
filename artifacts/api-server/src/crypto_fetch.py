#!/usr/bin/env python3
"""Fetch cryptocurrency data from CoinGecko free API."""
import sys
import json
import urllib.request
import urllib.parse
import urllib.error

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

TOP_COINS = [
    "bitcoin", "ethereum", "tether", "binancecoin", "solana",
    "ripple", "usd-coin", "staked-ether", "dogecoin", "cardano",
    "tron", "avalanche-2", "shiba-inu", "polkadot", "chainlink",
    "bitcoin-cash", "near", "uniswap", "litecoin", "internet-computer",
]


def fetch_coins(ids: list[str]) -> list[dict]:
    ids_str = ",".join(ids)
    params = urllib.parse.urlencode({
        "vs_currency": "usd",
        "ids": ids_str,
        "order": "market_cap_desc",
        "per_page": len(ids),
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    })
    url = f"{COINGECKO_BASE}/coins/markets?{params}"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return [{"error": "rate_limited", "message": "CoinGecko rate limit hit, try again in 60s"}]
        raise

    result = []
    for c in raw:
        result.append({
            "id": c.get("id", ""),
            "symbol": (c.get("symbol") or "").upper(),
            "name": c.get("name", ""),
            "price": c.get("current_price") or 0,
            "change24h": c.get("price_change_percentage_24h"),
            "marketCap": c.get("market_cap"),
            "volume24h": c.get("total_volume"),
            "image": c.get("image"),
        })
    return result


if __name__ == "__main__":
    ids = sys.argv[1].split(",") if len(sys.argv) > 1 and sys.argv[1].strip() else TOP_COINS
    try:
        coins = fetch_coins(ids)
        print(json.dumps({"coins": coins}))
    except Exception as e:
        print(json.dumps({"error": "fetch_error", "message": str(e)}))
        sys.exit(1)
