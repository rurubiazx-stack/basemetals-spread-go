/**
 * 会话内实时价差历史缓冲（仅内存，不落库）。
 * 每条策略最多保留最近 360 个有效点（约 30 分钟 @ 5s）。
 */
export interface SpreadPoint {
  t: number;
  v: number;
}

export const MAX_POINTS = 360;

const buffers = new Map<string, SpreadPoint[]>();

export function appendPoint(id: string, t: number, v: number | null | undefined): void {
  if (v === null || v === undefined || !Number.isFinite(v)) return;
  let buf = buffers.get(id);
  if (!buf) {
    buf = [];
    buffers.set(id, buf);
  }
  const last = buf[buf.length - 1];
  if (last && last.t === t) return;
  buf.push({ t, v });
  if (buf.length > MAX_POINTS) buf.splice(0, buf.length - MAX_POINTS);
}

export function getSeries(id: string): SpreadPoint[] {
  return buffers.get(id) ?? [];
}
