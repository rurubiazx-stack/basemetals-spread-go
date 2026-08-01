export type Group = "cu" | "al" | "zn" | "sn" | "pb" | "ni" | "ss" | "lc" | "ao";
export type Slot = "A" | "B" | "C" | "D";
export type Direction = "买" | "卖";

export interface StrategyLeg {
  slot: Slot;
  contract: string;
  dir: Direction;
  lots: number;
}

export interface StrategyConfig {
  id: string;
  name: string;
  group: Group;
  formula: string;
  decimals: number;
  legs: StrategyLeg[];
}

/** realtime = 交易所实时快照; proxy = USD/CNH 即期汇率推导 */
export type QuoteMode = "realtime" | "proxy";

export interface Quote {
  price: number | null;
  bid: number | null;
  ask: number | null;
  /** 本交易日累计成交量；无有效实时成交量时为 null */
  volume: number | null;
  openInterest?: number | null;
  source: "sina";
  sourceSymbol: string;
  mode: QuoteMode;
  sourceTime: string | null;
  available: boolean;
  error: string | null;
  proxyFor?: string;
}

export type UpstreamState = "ok" | "partial" | "error";

export interface QuotesResponse {
  receivedAt: string;
  quotes: Record<string, Quote>;
  upstreams: {
    lme: UpstreamState;
    cmx: UpstreamState;
    domestic: UpstreamState;
    usdCnh: UpstreamState;
  };
}

export type StrategyStatus = "LIVE" | "PROXY" | "DOWN";

export interface StrategyState {
  id: string;
  spread: number | null;
  prevSpread: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  status: StrategyStatus;
  updatedAt: number | null;
  flashDir: "up" | "down" | null;
}
