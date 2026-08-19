import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  action?: { label: string; symbol: string };
}

interface ChatbotProps {
  onAnalyze: (symbol: string) => void;
}

const SYMBOL_MAP: Record<string, { symbol: string; name: string }> = {
  apple: { symbol: "AAPL", name: "Apple" },
  aapl: { symbol: "AAPL", name: "Apple" },
  microsoft: { symbol: "MSFT", name: "Microsoft" },
  msft: { symbol: "MSFT", name: "Microsoft" },
  nvidia: { symbol: "NVDA", name: "NVIDIA" },
  nvda: { symbol: "NVDA", name: "NVIDIA" },
  google: { symbol: "GOOGL", name: "Alphabet (Google)" },
  alphabet: { symbol: "GOOGL", name: "Alphabet (Google)" },
  googl: { symbol: "GOOGL", name: "Alphabet" },
  goog: { symbol: "GOOGL", name: "Alphabet" },
  amazon: { symbol: "AMZN", name: "Amazon" },
  amzn: { symbol: "AMZN", name: "Amazon" },
  meta: { symbol: "META", name: "Meta Platforms" },
  facebook: { symbol: "META", name: "Meta Platforms" },
  tesla: { symbol: "TSLA", name: "Tesla" },
  tsla: { symbol: "TSLA", name: "Tesla" },
  netflix: { symbol: "NFLX", name: "Netflix" },
  nflx: { symbol: "NFLX", name: "Netflix" },
  jpmorgan: { symbol: "JPM", name: "JPMorgan Chase" },
  "jp morgan": { symbol: "JPM", name: "JPMorgan Chase" },
  jpm: { symbol: "JPM", name: "JPMorgan Chase" },
  visa: { symbol: "V", name: "Visa" },
  mastercard: { symbol: "MA", name: "Mastercard" },
  walmart: { symbol: "WMT", name: "Walmart" },
  oracle: { symbol: "ORCL", name: "Oracle" },
  adobe: { symbol: "ADBE", name: "Adobe" },
  amd: { symbol: "AMD", name: "AMD" },
  intel: { symbol: "INTC", name: "Intel" },
  qualcomm: { symbol: "QCOM", name: "Qualcomm" },
  salesforce: { symbol: "CRM", name: "Salesforce" },
  tcs: { symbol: "TCS.NS", name: "TCS" },
  "tata consultancy": { symbol: "TCS.NS", name: "TCS" },
  reliance: { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  infosys: { symbol: "INFY.NS", name: "Infosys" },
  infy: { symbol: "INFY.NS", name: "Infosys" },
  wipro: { symbol: "WIPRO.NS", name: "Wipro" },
  hdfc: { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  "hdfc bank": { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  icici: { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  "icici bank": { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  sbi: { symbol: "SBIN.NS", name: "State Bank of India" },
  hcl: { symbol: "HCLTECH.NS", name: "HCL Technologies" },
  maruti: { symbol: "MARUTI.NS", name: "Maruti Suzuki" },
  airtel: { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
  kotak: { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  "kotak bank": { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  adani: { symbol: "ADANIENT.NS", name: "Adani Enterprises" },
  bajaj: { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv" },
  "bajaj finance": { symbol: "BAJFINANCE.NS", name: "Bajaj Finance" },
  titan: { symbol: "TITAN.NS", name: "Titan Company" },
  "tech mahindra": { symbol: "TECHM.NS", name: "Tech Mahindra" },
};

function resolveQuery(raw: string): { symbol: string; name: string; confidence: "exact" | "fuzzy" } | null {
  const q = raw.toLowerCase().trim();
  if (SYMBOL_MAP[q]) return { ...SYMBOL_MAP[q], confidence: "exact" };

  let best: string | null = null;
  let bestScore = 0;
  for (const key of Object.keys(SYMBOL_MAP)) {
    if (q.includes(key) || key.includes(q)) {
      const score = Math.min(q.length, key.length) / Math.max(q.length, key.length);
      if (score > bestScore) { bestScore = score; best = key; }
    }
  }
  if (best && bestScore > 0.35) return { ...SYMBOL_MAP[best], confidence: "fuzzy" };

  return null;
}

const GREETING: Message = {
  id: 0,
  role: "bot",
  text: "Hi! I can help you look up stocks. Try typing a company name like \"Tesla\", \"TCS\", or \"Nvidia\" — or just enter a symbol like \"MSFT\".",
};

export function Chatbot({ onAnalyze }: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  let nextId = useRef(1);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  function addMessage(msg: Omit<Message, "id">) {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    addMessage({ role: "user", text });

    setTimeout(() => {
      const resolved = resolveQuery(text);

      if (resolved) {
        const { symbol, name, confidence } = resolved;
        const intro = confidence === "exact"
          ? `Symbol for ${name} is`
          : `Did you mean ${name}?`;
        addMessage({
          role: "bot",
          text: `${intro} **${symbol}**. Click below to analyze.`,
          action: { label: `Analyze ${symbol}`, symbol },
        });
      } else {
        // Treat it as a direct symbol attempt
        const upper = text.toUpperCase().replace(/\s+/g, "");
        addMessage({
          role: "bot",
          text: `Trying "${upper}" as a symbol directly. Click below to run the analysis, or check the spelling.`,
          action: { label: `Analyze ${upper}`, symbol: upper },
        });
      }
    }, 300);
  }

  function handleAction(symbol: string) {
    onAnalyze(symbol);
    addMessage({ role: "bot", text: `Fetching data for **${symbol}**...` });
    setOpen(false);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform focus:outline-none"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold font-mono tracking-wide">Stock Assistant</span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-foreground"
                  }`}
                >
                  {msg.text.split("**").map((part, i) =>
                    i % 2 === 1
                      ? <strong key={i} className="font-mono">{part}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
                {msg.action && (
                  <button
                    onClick={() => handleAction(msg.action!.symbol)}
                    className="mt-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {msg.action.label}
                  </button>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-muted/20 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder='e.g. "TCS" or "Nvidia"'
              className="h-9 text-sm font-mono bg-background"
            />
            <Button size="sm" onClick={handleSend} className="h-9 px-3" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
