import { useState, useEffect, useCallback } from "react";

export type Currency = "USD" | "INR" | "EUR";

const CURRENCY_KEY = "app_currency";
const RATE_KEY = "app_fx_rates";
const RATE_TTL_KEY = "app_fx_rates_ttl";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
};

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem(CURRENCY_KEY) as Currency) ?? "USD";
  });

  const [rates, setRates] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem(RATE_KEY);
      const ttl = localStorage.getItem(RATE_TTL_KEY);
      if (cached && ttl && Date.now() < Number(ttl)) {
        return JSON.parse(cached);
      }
    } catch {}
    return FALLBACK_RATES;
  });

  useEffect(() => {
    const ttl = localStorage.getItem(RATE_TTL_KEY);
    if (ttl && Date.now() < Number(ttl)) return;

    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((r) => r.json())
      .then((d) => {
        const r = d.rates as Record<string, number>;
        setRates(r);
        localStorage.setItem(RATE_KEY, JSON.stringify(r));
        localStorage.setItem(RATE_TTL_KEY, String(Date.now() + 3_600_000));
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_KEY, c);
  }, []);

  const convert = useCallback(
    (usdValue: number | null | undefined): number | null => {
      if (usdValue == null) return null;
      return usdValue * (rates[currency] ?? 1);
    },
    [rates, currency]
  );

  const symbol = currency === "USD" ? "$" : currency === "INR" ? "₹" : "€";

  return { currency, setCurrency, convert, symbol, rates };
}
