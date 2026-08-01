export function fmt(value: number | null, decimals: number): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtSigned(value: number | null, decimals: number): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const s = fmt(Math.abs(value), decimals);
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${s}`;
}

export function fmtPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function fmtPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const decimals = Math.abs(value) < 100 ? 4 : 0;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtClock(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
}

export function fmtDateTime(ts: number | null): string {
  if (!ts) return "--";
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString("zh-CN", { hour12: false })}`;
}

export const GROUP_LABEL: Record<string, string> = {
  cu: "铜",
  al: "铝",
  zn: "锌",
  sn: "锡",
  pb: "铅",
  ni: "镍",
  ss: "不锈钢",
  lc: "碳酸锂",
};

/** 成交量：整数 + 千分位；无实时成交量显示 -- */
export function fmtVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return Math.round(value).toLocaleString("en-US");
}
