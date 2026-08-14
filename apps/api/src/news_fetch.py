#!/usr/bin/env python3
"""Fetch news articles from Yahoo Finance via yfinance."""
import sys
import json
import time
import yfinance as yf

GENERAL_TICKERS = ["SPY", "QQQ", "DIA"]


def format_article(article: dict) -> dict:
    content = article.get("content", {})
    title = content.get("title") or article.get("title", "")
    provider = (content.get("provider") or {}).get("displayName") or ""
    link = ""
    click_through = content.get("clickThroughUrl") or {}
    if isinstance(click_through, dict):
        link = click_through.get("url", "")
    if not link:
        canonical = content.get("canonicalUrl") or {}
        if isinstance(canonical, dict):
            link = canonical.get("url", "")
    pub_date = content.get("pubDate") or content.get("publishedAt") or ""
    thumb = None
    thumb_list = content.get("thumbnail") or {}
    if isinstance(thumb_list, dict):
        resolutions = thumb_list.get("resolutions", [])
        if resolutions:
            thumb = resolutions[0].get("url")
    return {
        "title": title,
        "publisher": provider,
        "link": link,
        "publishedAt": pub_date,
        "thumbnail": thumb,
    }


def get_news(symbol: str | None) -> list[dict]:
    tickers = [symbol] if symbol else GENERAL_TICKERS
    seen = set()
    articles = []
    for sym in tickers:
        try:
            ticker = yf.Ticker(sym)
            raw_news = ticker.news or []
            for item in raw_news[:8]:
                formatted = format_article(item)
                title = formatted.get("title", "")
                if not title or title in seen:
                    continue
                seen.add(title)
                articles.append(formatted)
                if len(articles) >= 10:
                    break
        except Exception:
            continue
        if len(articles) >= 10:
            break
    return articles


if __name__ == "__main__":
    symbol = sys.argv[1].strip().upper() if len(sys.argv) > 1 and sys.argv[1].strip() else None
    try:
        articles = get_news(symbol)
        print(json.dumps({"articles": articles}))
    except Exception as e:
        print(json.dumps({"error": "fetch_error", "message": str(e)}))
        sys.exit(1)
