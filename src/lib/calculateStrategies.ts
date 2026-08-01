import { CONTRACT_SOURCES } from "@/data/contracts";
import { evaluateFormula } from "@/lib/formulaEngine";
import type {
  Quote,
  QuoteMode,
  StrategyConfig,
  StrategyState,
  StrategyStatus,
} from "@/types";

export interface LegView {
  slot: string;
  contract: string;
  dir: string;
  lots: number;
  price: number | null;
  volume: number | null;
  mode: QuoteMode | null;
  isProxy: boolean;
  label?: string;
}

export interface StrategyResult extends StrategyState {
  legs: LegView[];
  legPrice: Record<string, number | null>;
}

export function quoteForContract(
  contract: string,
  quotes: Record<string, Quote>,
): Quote | undefined {
  const src = CONTRACT_SOURCES[contract];
  if (!src) return undefined;
  return quotes[src.quoteKey];
}

/**
 * 依据行情计算单条策略。
 * 任一已配置腿缺失有效价格 → 不计算，状态 DOWN。
 * 策略成交量 = 各真实期货腿（排除 UC 代理与手数 0 占位腿）成交量的最小值。
 */
export function calculateStrategy(
  strategy: StrategyConfig,
  quotes: Record<string, Quote>,
  prev?: StrategyState,
): StrategyResult {
  const legs: LegView[] = [];
  const vars: Record<string, number> = {};
  const legPrice: Record<string, number | null> = {};
  const volumes: number[] = [];
  let missing = false;
  let hasProxy = false;

  for (const leg of strategy.legs) {
    const src = CONTRACT_SOURCES[leg.contract];
    const q = quoteForContract(leg.contract, quotes);
    const price = q?.available && typeof q.price === "number" ? q.price : null;
    const isProxy = src?.kind === "proxy";
    const volume =
      !isProxy && q?.available && typeof q.volume === "number" && q.volume >= 0 ? q.volume : null;
    if (price === null) missing = true;
    else {
      vars[leg.slot] = price;
      if (q?.mode === "proxy") hasProxy = true;
    }
    if (volume !== null && leg.lots > 0) volumes.push(volume);
    legPrice[leg.slot] = price;
    legs.push({
      slot: leg.slot,
      contract: leg.contract,
      dir: leg.dir,
      lots: leg.lots,
      price,
      volume,
      mode: q?.mode ?? null,
      isProxy,
      label: src?.label,
    });
  }

  const volume = volumes.length > 0 ? Math.min(...volumes) : null;
  const prevSpread = prev?.spread ?? null;

  const down = (): StrategyResult => ({
    id: strategy.id,
    spread: null,
    prevSpread,
    change: null,
    changePct: null,
    volume,
    status: "DOWN",
    updatedAt: prev?.updatedAt ?? null,
    flashDir: null,
    legs,
    legPrice,
  });

  if (missing) return down();

  let raw: number | null = null;
  try {
    raw = evaluateFormula(strategy.id, strategy.formula, vars);
  } catch {
    raw = null;
  }

  if (raw === null) return down();

  const factor = 10 ** strategy.decimals;
  const spread = Math.round(raw * factor) / factor;

  let change: number | null = null;
  let changePct: number | null = null;
  if (prevSpread !== null) {
    change = Math.round((spread - prevSpread) * factor) / factor;
    changePct = prevSpread === 0 ? null : (change / Math.abs(prevSpread)) * 100;
  }

  const status: StrategyStatus = hasProxy ? "PROXY" : "LIVE";
  const flashDir = change === null || change === 0 ? null : change > 0 ? "up" : "down";

  return {
    id: strategy.id,
    spread,
    prevSpread,
    change,
    changePct,
    volume,
    status,
    updatedAt: Date.now(),
    flashDir,
    legs,
    legPrice,
  };
}

export function calculateAll(
  strategies: StrategyConfig[],
  quotes: Record<string, Quote>,
  prevStates: Record<string, StrategyState>,
): Record<string, StrategyResult> {
  const out: Record<string, StrategyResult> = {};
  for (const s of strategies) {
    out[s.id] = calculateStrategy(s, quotes, prevStates[s.id]);
  }
  return out;
}
