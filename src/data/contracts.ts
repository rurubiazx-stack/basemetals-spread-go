import { STRATEGIES } from "@/data/strategies";
import type { QuoteMode } from "@/types";

/**
 * 抓取类别：
 * - lme      : hq.sinajs.cn 全球期货实时快照（hf_*，LME 3M）
 * - cmx      : hq.sinajs.cn 全球期货实时快照（hf_HG，COMEX 铜）
 * - domestic : 国内期货实时快照（nf_合约）
 * - proxy    : SGX UC 月度合约，由 USD/CNH 即期汇率按固定月差推导
 */
export type FetchKind = "lme" | "cmx" | "domestic" | "proxy";

export interface ContractSource {
  contract: string;
  quoteKey: string;
  source: "sina";
  sourceSymbol: string;
  kind: FetchKind;
  mode?: QuoteMode;
  label?: string;
  /** proxy 合约相对 UC2608 的月份距离 */
  monthDistance?: number;
}

export const USD_CNH_KEY = "USD/CNH-SPOT";
export const USD_CNH_SYMBOL = "fx_susdcnh";
export const UC_MONTH_STEP = 0.015;
export const UC_BASE_YEAR = 2026;
export const UC_BASE_MONTH = 9;
export const UC_PROXY_LABEL = "USD/CNH 即期汇率推导，固定月差 0.015，非 SGX 实时行情";

const LME_SYMBOLS: Record<string, string> = {
  "CU3M-LME": "hf_CAD",
  "AL3M-LME": "hf_AHD",
  "ZN3M-LME": "hf_ZSD",
  "PB3M-LME": "hf_PBD",
  "NI3M-LME": "hf_NID",
  "SN3M-LME": "hf_SND",
};

export const CMX_CONTRACT = "HG-CMX";
export const CMX_SYMBOL = "hf_HG";

/** 工作表中不规范的 UC 代码规范化（仅用于内部行情映射层）。 */
const UC_FIXES: Record<string, string> = {
  "UC26010-SGX": "UC2610-SGX",
  "UC26011-SGX": "UC2611-SGX",
  "UC26012-SGX": "UC2612-SGX",
  "UC2603-SGX": "UC2703-SGX",
  "UC0-SGX": "UC2609-SGX",
};

export function normalizeContract(contract: string): string {
  return UC_FIXES[contract] ?? contract;
}

/** monthDistance = (year - 2026) * 12 + (month - 9)，跨年安全。 */
export function ucMonthDistance(contract: string): number | null {
  const m = normalizeContract(contract).match(/^UC(\d{2})(\d{2})-SGX$/);
  if (!m) return null;
  const year = 2000 + Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return (year - UC_BASE_YEAR) * 12 + (month - UC_BASE_MONTH);
}

export function ucPriceFromSpot(spot: number, monthDistance: number): number {
  return spot - monthDistance * UC_MONTH_STEP;
}

function domesticSymbol(contract: string): string {
  return `nf_${contract.replace(/-(SH|SHFE|INE|GZ)$/, "")}`;
}

function buildSource(contract: string): ContractSource | null {
  if (LME_SYMBOLS[contract]) {
    return {
      contract,
      quoteKey: contract,
      source: "sina",
      sourceSymbol: LME_SYMBOLS[contract],
      kind: "lme",
    };
  }
  if (contract === CMX_CONTRACT) {
    return {
      contract,
      quoteKey: contract,
      source: "sina",
      sourceSymbol: CMX_SYMBOL,
      kind: "cmx",
    };
  }
  if (contract.endsWith("-SGX")) {
    const dist = ucMonthDistance(contract);
    if (dist === null) return null;
    return {
      contract,
      quoteKey: `${normalizeContract(contract)}#PROXY`,
      source: "sina",
      sourceSymbol: USD_CNH_SYMBOL,
      kind: "proxy",
      mode: "proxy",
      label: UC_PROXY_LABEL,
      monthDistance: dist,
    };
  }
  if (/-(SH|SHFE|INE|GZ)$/.test(contract)) {
    return {
      contract,
      quoteKey: contract,
      source: "sina",
      sourceSymbol: domesticSymbol(contract),
      kind: "domestic",
    };
  }
  return null;
}

/** 常用价差用到的国内近月对（09-10），直接使用真实月份合约行情（nf_CU2609 / nf_CU2610 …）。 */
export const NEAR_SPREADS = [
  { product: "CU", label: "CU09-10", front: "CU2609-SH", back: "CU2610-SH" },
  { product: "AL", label: "AL09-10", front: "AL2609-SH", back: "AL2610-SH" },
  { product: "NI", label: "NI09-10", front: "NI2609-SH", back: "NI2610-SH" },
  { product: "ZN", label: "ZN09-10", front: "ZN2609-SH", back: "ZN2610-SH" },
  { product: "SS", label: "SS09-10", front: "SS2609-SH", back: "SS2610-SH" },
  { product: "SN", label: "SN09-10", front: "SN2609-SH", back: "SN2610-SH" },
  { product: "PB", label: "PB09-10", front: "PB2609-SH", back: "PB2610-SH" },
  { product: "LC", label: "LC09-10", front: "LC2609-GZ", back: "LC2610-GZ" },
] as const;

function nearSpreadSources(): ContractSource[] {
  const out: ContractSource[] = [];
  for (const s of NEAR_SPREADS) {
    for (const c of [s.front, s.back]) {
      const src = buildSource(c);
      if (src) out.push(src);
    }
  }
  return out;
}


function buildAll(): Record<string, ContractSource> {
  const out: Record<string, ContractSource> = {};
  for (const s of STRATEGIES) {
    for (const leg of s.legs) {
      if (out[leg.contract]) continue;
      const src = buildSource(leg.contract);
      if (src) out[leg.contract] = src;
      else console.warn("[contracts] 未知合约代码", leg.contract);
    }
  }
  for (const src of nearSpreadSources()) {
    if (!out[src.contract]) out[src.contract] = src;
  }
  return out;
}

export const CONTRACT_SOURCES: Record<string, ContractSource> = buildAll();


/** 需要向新浪请求的唯一行情代码（去重）。 */
export const UNIQUE_SYMBOLS = {
  lme: [...new Set(Object.values(CONTRACT_SOURCES).filter((s) => s.kind === "lme").map((s) => s.sourceSymbol))],
  cmx: [...new Set(Object.values(CONTRACT_SOURCES).filter((s) => s.kind === "cmx").map((s) => s.sourceSymbol))],
  domestic: [
    ...new Set(
      Object.values(CONTRACT_SOURCES).filter((s) => s.kind === "domestic").map((s) => s.sourceSymbol),
    ),
  ],
};

export function isProxyContract(contract: string): boolean {
  return CONTRACT_SOURCES[contract]?.kind === "proxy";
}
