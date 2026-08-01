import {
  CONTRACT_SOURCES,
  UNIQUE_SYMBOLS,
  USD_CNH_KEY,
  USD_CNH_SYMBOL,
  UC_PROXY_LABEL,
  ucPriceFromSpot,
  type ContractSource,
} from "@/data/contracts";
import type { Quote, QuotesResponse, UpstreamState } from "@/types";
import {
  extractHqString,
  parseDomesticQuote,
  parseGlobalQuote,
  parseUsdCnhQuote,
} from "@/lib/sina-parsers";

const HQ_BASE = "https://hq.sinajs.cn/";
const BATCH_SIZE = 40;

const SINA_HEADERS = {
  Referer: "https://finance.sina.com.cn/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
};

async function fetchText(url: string, timeoutMs = 6000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: SINA_HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const buf = await res.arrayBuffer();
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** 批量抓取（单批最多 40 个代码），单批失败不影响其它批次。 */
async function fetchBatched(symbols: string[]): Promise<string> {
  const parts = await Promise.all(
    chunk(symbols, BATCH_SIZE).map(async (group) => {
      try {
        return await fetchText(`${HQ_BASE}?_=${Date.now()}&list=${group.join(",")}`);
      } catch (e) {
        console.error("[quotes] hq.sinajs.cn 批次失败", (e as Error).message);
        return "";
      }
    }),
  );
  return parts.join("\n");
}

function unavailable(src: ContractSource, error: string): Quote {
  return {
    price: null,
    bid: null,
    ask: null,
    volume: null,
    openInterest: null,
    source: "sina",
    sourceSymbol: src.sourceSymbol,
    mode: src.kind === "proxy" ? "proxy" : "realtime",
    sourceTime: null,
    available: false,
    error,
  };
}

function rollUp(total: number, ok: number): UpstreamState {
  if (total === 0) return "ok";
  if (ok === total) return "ok";
  if (ok === 0) return "error";
  return "partial";
}

export async function buildQuotes(): Promise<QuotesResponse> {
  const sources = Object.values(CONTRACT_SOURCES);
  const quotes: Record<string, Quote> = {};

  const lmeSources = sources.filter((s) => s.kind === "lme");
  const cmxSources = sources.filter((s) => s.kind === "cmx");
  const domesticSources = sources.filter((s) => s.kind === "domestic");
  const proxySources = sources.filter((s) => s.kind === "proxy");

  const globalSymbols = [...UNIQUE_SYMBOLS.lme, ...UNIQUE_SYMBOLS.cmx, USD_CNH_SYMBOL];
  const [globalText, domesticText] = await Promise.all([
    fetchBatched(globalSymbols),
    fetchBatched(UNIQUE_SYMBOLS.domestic),
  ]);

  // ---- 1) 全球期货：LME 3M + COMEX 铜（各自绑定，不互相替代）----
  let lmeOk = 0;
  let cmxOk = 0;
  for (const src of [...lmeSources, ...cmxSources]) {
    const parsed = parseGlobalQuote(extractHqString(globalText, src.sourceSymbol));
    if (!parsed) {
      quotes[src.quoteKey] = unavailable(src, "全球期货实时行情不可用");
      continue;
    }
    if (src.kind === "lme") lmeOk += 1;
    else cmxOk += 1;
    quotes[src.quoteKey] = {
      price: parsed.price,
      bid: parsed.bid,
      ask: parsed.ask,
      volume: parsed.volume,
      openInterest: null,
      source: "sina",
      sourceSymbol: src.sourceSymbol,
      mode: "realtime",
      sourceTime: parsed.sourceTime,
      available: true,
      error: null,
    };
  }

  // ---- 2) 国内期货实时快照（nf_*，价格 p[5]，成交量 p[13]，持仓 p[14]）----
  let domesticOk = 0;
  for (const src of domesticSources) {
    const parsed = parseDomesticQuote(extractHqString(domesticText, src.sourceSymbol));
    if (!parsed) {
      quotes[src.quoteKey] = unavailable(src, "国内期货实时行情不可用");
      continue;
    }
    domesticOk += 1;
    quotes[src.quoteKey] = {
      price: parsed.price,
      bid: parsed.bid,
      ask: parsed.ask,
      volume: parsed.volume,
      openInterest: parsed.openInterest,
      source: "sina",
      sourceSymbol: src.sourceSymbol,
      mode: "realtime",
      sourceTime: parsed.sourceTime,
      available: true,
      error: null,
    };
  }

  // ---- 3) USD/CNH 即期 + UC 月度派生价（固定月差 0.015）----
  const fx = parseUsdCnhQuote(extractHqString(globalText, USD_CNH_SYMBOL));
  const usdCnh: UpstreamState = fx ? "ok" : "error";

  quotes[USD_CNH_KEY] = fx
    ? {
        price: fx.price,
        bid: fx.bid,
        ask: fx.ask,
        volume: null,
        openInterest: null,
        source: "sina",
        sourceSymbol: USD_CNH_SYMBOL,
        mode: "proxy",
        sourceTime: fx.sourceTime,
        available: true,
        error: null,
      }
    : {
        price: null,
        bid: null,
        ask: null,
        volume: null,
        openInterest: null,
        source: "sina",
        sourceSymbol: USD_CNH_SYMBOL,
        mode: "proxy",
        sourceTime: null,
        available: false,
        error: "USD/CNH 即期行情不可用",
      };

  for (const src of proxySources) {
    if (quotes[src.quoteKey]) continue;
    if (!fx) {
      quotes[src.quoteKey] = unavailable(src, "USD/CNH 即期行情不可用");
      continue;
    }
    quotes[src.quoteKey] = {
      price: ucPriceFromSpot(fx.price, src.monthDistance ?? 0),
      bid: null,
      ask: null,
      volume: null,
      openInterest: null,
      source: "sina",
      sourceSymbol: USD_CNH_SYMBOL,
      mode: "proxy",
      sourceTime: fx.sourceTime,
      available: true,
      error: null,
      proxyFor: UC_PROXY_LABEL,
    };
  }

  return {
    receivedAt: new Date().toISOString(),
    quotes,
    upstreams: {
      lme: rollUp(lmeSources.length, lmeOk),
      cmx: rollUp(cmxSources.length, cmxOk),
      domestic: rollUp(domesticSources.length, domesticOk),
      usdCnh,
    },
  };
}
