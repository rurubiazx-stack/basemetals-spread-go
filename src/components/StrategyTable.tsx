import { Fragment } from "react";
import type { StrategyConfig } from "@/types";
import type { StrategyResult } from "@/lib/calculateStrategies";
import { StrategyDetails } from "@/components/StrategyDetails";
import { GROUP_LABEL, fmt, fmtClock, fmtPct, fmtPrice, fmtSigned, fmtVolume } from "@/lib/format";

export type SortCol = "name" | "spread" | "change" | "changePct" | "volume" | null;

interface Props {
  rows: StrategyConfig[];
  states: Record<string, StrategyResult>;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  sortCol: SortCol;
  sortDir: "asc" | "desc";
  onSortCol: (col: Exclude<SortCol, null>) => void;
  tick: number;
}


function signClass(v: number | null | undefined) {
  if (v === null || v === undefined) return "na";
  if (v > 0) return "pos";
  if (v < 0) return "neg";
  return "zero";
}

export function StrategyTable({
  rows,
  states,
  expandedId,
  onExpand,
  sortCol,
  sortDir,
  onSortCol,
  tick,
}: Props) {
  const thClass = (col: Exclude<SortCol, null>) =>
    sortCol === col ? (sortDir === "asc" ? "sorted-asc" : "sorted-desc") : "";

  return (
    <div className="sg-table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }} className="col-left">
              #
            </th>
            <th className={`col-left ${thClass("name")}`} onClick={() => onSortCol("name")}>
              策略名
            </th>

            <th
              style={{ width: 130 }}
              className={`col-right ${thClass("spread")}`}
              onClick={() => onSortCol("spread")}
            >
              实时价差
            </th>
            <th
              style={{ width: 80 }}
              className={`col-right ${thClass("change")}`}
              onClick={() => onSortCol("change")}
            >
              涨跌
            </th>
            <th
              style={{ width: 70 }}
              className={`col-right hide-mobile-col ${thClass("changePct")}`}
              onClick={() => onSortCol("changePct")}
            >
              涨跌%
            </th>
            <th
              style={{ width: 90 }}
              className={`col-right ${thClass("volume")}`}
              onClick={() => onSortCol("volume")}
            >
              成交量
            </th>
            <th style={{ width: 90 }} className="col-right hide-mobile-col">
              A腿价
            </th>
            <th style={{ width: 90 }} className="col-right hide-mobile-col">
              B腿价
            </th>
            <th style={{ width: 80 }} className="col-center">
              状态
            </th>
            <th style={{ width: 70 }} className="col-left hide-mobile-col">
              更新
            </th>
            <th style={{ width: 40 }} className="col-center"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} style={{ textAlign: "center", padding: 48, color: "#555" }}>
                无匹配策略
              </td>
            </tr>
          )}
          {rows.map((s, i) => {
            const st = states[s.id];
            const expanded = expandedId === s.id;
            const status = st?.status ?? "DOWN";
            const flash = st?.flashDir ? ` flash-${st.flashDir}` : "";
            return (
              <Fragment key={s.id}>
                <tr
                  className={expanded ? "expanded" : ""}
                  onClick={() => onExpand(expanded ? null : s.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="col-left idx">{i + 1}</td>
                  <td className="col-left strat-name">{s.name}</td>
                  <td className={`col-right${flash}`}>
                    <span className={`spread-val ${signClass(st?.spread)}`}>
                      {fmt(st?.spread ?? null, 0)}
                    </span>
                  </td>
                  <td className="col-right">
                    <span className={`change-val ${signClass(st?.change)}`}>
                      {fmtSigned(st?.change ?? null, 0)}
                    </span>
                  </td>

                  <td className="col-right hide-mobile-col">
                    <span className={`change-val ${signClass(st?.changePct)}`}>
                      {fmtPct(st?.changePct ?? null)}
                    </span>
                  </td>
                  <td className="col-right">
                    <span className={`price-val${st?.volume == null ? " na" : ""}`}>
                      {fmtVolume(st?.volume ?? null)}
                    </span>
                  </td>
                  <td className="col-right hide-mobile-col">
                    <span className={`price-val${st?.legPrice?.A == null ? " na" : ""}`}>
                      {fmtPrice(st?.legPrice?.A ?? null)}
                    </span>
                  </td>
                  <td className="col-right hide-mobile-col">
                    <span className={`price-val${st?.legPrice?.B == null ? " na" : ""}`}>
                      {fmtPrice(st?.legPrice?.B ?? null)}
                    </span>
                  </td>
                  <td className="col-center">
                    <span
                      className={`status-dot ${status === "DOWN" ? "offline" : "online"}`}
                      title={status === "DOWN" ? "掉线" : status === "PROXY" ? "在线（UC 代理）" : "在线"}
                      aria-label={status === "DOWN" ? "掉线" : "在线"}
                    />

                  </td>
                  <td className="col-left hide-mobile-col">
                    <span className="updated-time">{fmtClock(st?.updatedAt ?? null)}</span>
                  </td>
                  <td className="col-center">
                    <span className="expand-toggle">{expanded ? "▲" : "▼"}</span>
                  </td>
                </tr>
                {expanded && (
                  <tr className="detail-row">
                    <td colSpan={11}>
                      <StrategyDetails strategy={s} state={st} tick={tick} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
