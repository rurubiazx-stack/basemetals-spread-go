/**
 * 新浪财经返回文本的纯解析函数。
 * 只做解析与数值校验，不发起网络请求，便于单元测试。
 */

export interface ParsedQuote {
  price: number;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  openInterest: number | null;
  sourceTime: string | null;
}

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === "") return null;
  const v = Number(t);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

/** 成交量：有限且 >= 0 才有效 */
function vol(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === "") return null;
  const v = Number(t);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

/** 从 `var hq_str_XXX="...";` 文本中取出某个 symbol 的原始字段串 */
export function extractHqString(text: string, symbol: string): string | null {
  const m = text.match(new RegExp(`hq_str_${symbol}="([^"]*)"`));
  if (!m) return null;
  return m[1];
}

/**
 * 全球期货（LME hf_CAD / COMEX hf_HG）：
 * [0] 最新价, [2] 买价, [3] 卖价, [6] 时间, [12] 日期, [14] 本交易日累计成交量
 */
export function parseGlobalQuote(raw: string | null): ParsedQuote | null {
  if (!raw) return null;
  const f = raw.split(",");
  if (f.length < 13) return null;
  const price = num(f[0]);
  if (price === null) return null;
  const date = (f[12] ?? "").trim();
  const time = (f[6] ?? "").trim();
  return {
    price,
    bid: num(f[2]),
    ask: num(f[3]),
    volume: vol(f[14]),
    openInterest: vol(f[9]),
    sourceTime: time ? (date ? `${date} ${time}` : time) : null,
  };
}

/**
 * 国内期货实时快照（nf_合约）：
 * [6] 买价, [7] 卖价, [8] 最新价, [13] 持仓量, [14] 累计成交量, [18] 日期
 */
export function parseDomesticQuote(raw: string | null): ParsedQuote | null {
  if (!raw) return null;
  const f = raw.split(",");
  if (f.length < 19) return null;
  const price = num(f[8]) ?? num(f[5]);
  if (price === null) return null;
  return {
    price,
    bid: num(f[6]),
    ask: num(f[7]),
    volume: vol(f[14]),
    openInterest: vol(f[13]),
    sourceTime: (f[18] ?? "").trim() || null,
  };
}


/**
 * USD/CNH 即期（fx_susdcnh）：
 * [0] 时间, [1] 买价, [2] 卖价, [8] 最新价, [17] 日期。
 */
export function parseUsdCnhQuote(raw: string | null): ParsedQuote | null {
  if (!raw) return null;
  const f = raw.split(",");
  if (f.length < 9) return null;
  const time = (f[0] ?? "").trim();
  if (!time) return null;
  const bid = num(f[1]);
  const ask = num(f[2]);
  const last = num(f[8]);
  const price = bid !== null && ask !== null ? (bid + ask) / 2 : last;
  if (price === null || !Number.isFinite(price) || price <= 0) return null;
  const date = (f[17] ?? "").trim();
  return {
    price,
    bid,
    ask,
    volume: null,
    openInterest: null,
    sourceTime: date ? `${date} ${time}` : time,
  };
}
