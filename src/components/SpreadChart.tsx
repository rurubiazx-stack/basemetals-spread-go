import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSeries } from "@/lib/spreadHistory";
import { fmt } from "@/lib/format";

interface Props {
  strategyId: string;
  current: number | null;
  decimals?: number;
  /** 触发重算的刷新标记 */
  tick: number;
}

function hhmmss(t: number): string {
  return new Date(t).toLocaleTimeString("zh-CN", { hour12: false });
}

export function SpreadChart({ strategyId, current, decimals = 0, tick }: Props) {
  const data = useMemo(
    () => getSeries(strategyId).map((p) => ({ t: p.t, v: p.v })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strategyId, tick],
  );

  const color = (current ?? 0) < 0 ? "#FF3B30" : "#00FF66";
  const crossesZero = useMemo(() => {
    if (data.length === 0) return false;
    const min = Math.min(...data.map((d) => d.v));
    const max = Math.max(...data.map((d) => d.v));
    return min < 0 && max > 0;
  }, [data]);

  return (
    <div className="detail-section chart-section">
      <div className="chart-head">
        <div className="detail-title">实时价差走势</div>
        <div className="chart-meta">
          <span className={`spread-val ${current === null ? "na" : current > 0 ? "pos" : current < 0 ? "neg" : "zero"}`}>
            当前 {fmt(current, decimals)}
          </span>
          <span className="chart-tag">本次会话</span>
          <span className="chart-tag">数据点 {data.length}</span>
        </div>
      </div>
      <div className="chart-box">
        {data.length < 2 ? (
          <div className="chart-empty">正在积累实时价差数据…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#1C1C1C" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={hhmmss}
                stroke="#555"
                tick={{ fontSize: 10, fill: "#888" }}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#555"
                tick={{ fontSize: 10, fill: "#888" }}
                width={56}
                tickFormatter={(v: number) => fmt(v, decimals)}
              />
              {crossesZero && <ReferenceLine y={0} stroke="#333" />}
              <Tooltip
                contentStyle={{
                  background: "#111",
                  border: "1px solid #262626",
                  borderRadius: 4,
                  fontSize: 12,
                }}
                labelFormatter={(v) => hhmmss(Number(v))}
                formatter={(v: number | string) => [fmt(Number(v), decimals), "价差"]}
              />
              <Line
                type="linear"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
