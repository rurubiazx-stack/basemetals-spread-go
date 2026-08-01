import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { KpiBar } from "@/components/KpiBar";
import { FilterBar, type SortMode } from "@/components/FilterBar";
import { StrategyTable, type SortCol } from "@/components/StrategyTable";
import { STRATEGIES } from "@/data/strategies";
import { calculateAll, type StrategyResult } from "@/lib/calculateStrategies";
import { appendPoint } from "@/lib/spreadHistory";
import type { Group, Quote, QuotesResponse, StrategyState } from "@/types";

const TITLE = "SPREAD<GO> 实时价差监控看板";
const DESC = "有色金属跨市与内盘套利实时价差看板：167 条策略的价差、涨跌、成交量与腿明细一屏监控。";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SORT_MAP: Record<SortMode, { col: Exclude<SortCol, null>; dir: "asc" | "desc" }> = {
  "volume-desc": { col: "volume", dir: "desc" },
  "volume-asc": { col: "volume", dir: "asc" },
  "spread-desc": { col: "spread", dir: "desc" },
  "spread-asc": { col: "spread", dir: "asc" },
  "change-desc": { col: "change", dir: "desc" },
  "change-asc": { col: "change", dir: "asc" },
  "name-asc": { col: "name", dir: "asc" },
};

function Index() {
  const [states, setStates] = useState<Record<string, StrategyResult>>({});
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeGroup, setActiveGroup] = useState<Group | "all">("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("volume-desc");
  const [sortCol, setSortCol] = useState<SortCol>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const prevRef = useRef<Record<string, StrategyState>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/public/quotes", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as QuotesResponse;
      const next = calculateAll(STRATEGIES, data.quotes, prevRef.current);
      prevRef.current = next;
      const ts = Date.now();
      for (const s of STRATEGIES) {
        const st = next[s.id];
        if (st && st.status !== "DOWN") appendPoint(s.id, ts, st.spread);
      }
      setQuotes(data.quotes);
      setStates(next);
      setTick((t) => t + 1);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: STRATEGIES.length };
    for (const s of STRATEGIES) c[s.group] = (c[s.group] ?? 0) + 1;
    return c;
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = STRATEGIES.filter(
      (s) =>
        (activeGroup === "all" || s.group === activeGroup) &&
        (q === "" || s.name.toLowerCase().includes(q)),
    );
    if (sortCol) {
      const sign = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        if (sortCol === "name") return sign * a.name.localeCompare(b.name, "zh-Hans-CN");
        const av = (states[a.id]?.[sortCol] ?? null) as number | null;
        const bv = (states[b.id]?.[sortCol] ?? null) as number | null;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return sign * (av - bv);
      });
    }
    return list;
  }, [activeGroup, search, sortCol, sortDir, states]);

  const onSortMode = (m: SortMode) => {
    setSortMode(m);
    setSortCol(SORT_MAP[m].col);
    setSortDir(SORT_MAP[m].dir);
  };

  const onSortCol = (col: Exclude<SortCol, null>) => {
    const dir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : col === "name" ? "asc" : "desc";
    setSortCol(col);
    setSortDir(dir);
    const found = (Object.keys(SORT_MAP) as SortMode[]).find(
      (k) => SORT_MAP[k].col === col && SORT_MAP[k].dir === dir,
    );
    if (found) setSortMode(found);
  };

  return (
    <main className="sg">
      <DashboardHeader />
      <KpiBar strategies={STRATEGIES} states={states} quotes={quotes} />
      <FilterBar
        activeGroup={activeGroup}
        counts={counts}
        onGroup={setActiveGroup}
        search={search}
        onSearch={setSearch}
        sortMode={sortMode}
        onSort={onSortMode}
        autoRefresh={autoRefresh}
        onToggleRefresh={() => setAutoRefresh((v) => !v)}
      />
      <StrategyTable
        rows={rows}
        states={states}
        expandedId={expandedId}
        onExpand={setExpandedId}
        sortCol={sortCol}
        sortDir={sortDir}
        onSortCol={onSortCol}
        tick={tick}
      />
      <div className="sg-footer">
        <span>{error ? `行情获取失败：${error}` : `数据源 SINA · ${autoRefresh ? "5s 自动刷新" : "已暂停"}`}</span>
        <span>最后更新 {updatedAt ? new Date(updatedAt).toLocaleTimeString("zh-CN") : "—"}</span>
      </div>
    </main>
  );
}
