import { useMemo } from "react";
import type { Quote, StrategyConfig } from "@/types";
import type { StrategyResult } from "@/lib/calculateStrategies";
import { NEAR_SPREADS } from "@/data/contracts";
import { fmt } from "@/lib/format";

interface Props {
  strategies: StrategyConfig[];
  states: Record<string, StrategyResult>;
  quotes: Record<string, Quote>;
}

/** 顶部三个跨市场常用价差，直接镜像现有策略结果 */
const MIRROR_SPREADS: { label: string; strategyName: string }[] = [
  { label: "CMX0-LME3M", strategyName: "LME3M-COMEX0(CU,无成本)" },
  { label: "LME3M-CU", strategyName: "CAD3M-CU09(P+50,UC09,lvl)-120" },
  { label: "LME3M-SN0", strategyName: "LmeSn3M-Sn2609-UC09(p650, lvl)-120" },
];

function signClass(v: number | null) {
  if (v === null) return "na";
  if (v > 0) return "pos";
  if (v < 0) return "neg";
  return "zero";
}

export function KpiBar({ strategies, states, quotes }: Props) {
  const active = strategies.filter((s) => states[s.id] && states[s.id].status !== "DOWN");
  const down = strategies.filter((s) => !states[s.id] || states[s.id].status === "DOWN");

  const items = useMemo(() => {
    const list: { label: string; value: number | null; decimals: number }[] = [];

    for (const m of MIRROR_SPREADS) {
      const s = strategies.find((x) => x.name === m.strategyName);
      const st = s ? states[s.id] : undefined;
      const value = st && st.status !== "DOWN" ? st.spread : null;
      list.push({ label: m.label, value, decimals: 1 });
    }

    for (const p of NEAR_SPREADS) {
      const q0 = quotes[p.front];
      const q1 = quotes[p.back];
      const ok =
        q0?.available &&
        q1?.available &&
        typeof q0.price === "number" &&
        typeof q1.price === "number";
      const value = ok ? (q0.price as number) - (q1.price as number) : null;
      list.push({
        label: p.label,
        value: value !== null && Number.isFinite(value) ? value : null,
        decimals: 0,
      });
    }
    return list;
  }, [strategies, states, quotes]);


  return (
    <div className="sg-kpi-bar">
      <div className="sg-kpi-card">
        <div className="sg-kpi-label">在线策略</div>
        <div className="sg-kpi-value mono">{active.length}</div>
        <div className="sg-kpi-sub">/ {strategies.length} 总计</div>
      </div>
      <div className={`sg-kpi-card ${down.length > 0 ? "down" : ""}`}>
        <div className="sg-kpi-label">掉线策略</div>
        <div className="sg-kpi-value mono">{down.length}</div>
        <div className="sg-kpi-sub">API DOWN</div>
      </div>
      <div className="sg-kpi-card sg-common">
        <div className="sg-kpi-label">常用价差</div>
        <div className="sg-common-grid">
          {items.map((it) => (
            <div key={it.label} className="sg-common-card">
              <div className="sg-common-name">
                <span
                  className={`status-dot ${it.value === null ? "offline" : "online"}`}
                  aria-label={it.value === null ? "掉线" : "在线"}
                />
                {it.label}
              </div>
              <div className={`sg-common-val spread-val ${signClass(it.value)}`}>
                {fmt(it.value, it.decimals)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
