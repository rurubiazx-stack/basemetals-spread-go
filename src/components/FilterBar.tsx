import type { Group } from "@/types";

export type SortMode =
  | "volume-desc"
  | "volume-asc"
  | "spread-desc"
  | "spread-asc"
  | "change-desc"
  | "change-asc"
  | "name-asc";

interface Props {
  activeGroup: Group | "all";
  counts: Record<string, number>;
  onGroup: (g: Group | "all") => void;
  search: string;
  onSearch: (v: string) => void;
  sortMode: SortMode;
  onSort: (v: SortMode) => void;
  autoRefresh: boolean;
  onToggleRefresh: () => void;
}

const GROUPS: { key: Group | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "cu", label: "铜" },
  { key: "al", label: "铝" },
  { key: "zn", label: "锌" },
  { key: "sn", label: "锡" },
  { key: "pb", label: "铅" },
  { key: "ni", label: "镍" },
  { key: "ss", label: "不锈钢" },
  { key: "lc", label: "碳酸锂" },
];

export function FilterBar({
  activeGroup,
  counts,
  onGroup,
  search,
  onSearch,
  sortMode,
  onSort,
  autoRefresh,
  onToggleRefresh,
}: Props) {
  return (
    <div className="sg-filter-bar">
      <div className="sg-filter-group">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className={`sg-filter-btn${activeGroup === g.key ? " active" : ""}`}
            onClick={() => onGroup(g.key)}
          >
            {g.label}
            <span className="sg-filter-count">({counts[g.key] ?? 0})</span>
          </button>
        ))}
      </div>
      <input
        className="sg-search"
        placeholder="搜索策略..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="sg-filter-right">
        <select
          className="sg-select"
          value={sortMode}
          onChange={(e) => onSort(e.target.value as SortMode)}
        >
          <option value="volume-desc">成交量 降序</option>
          <option value="volume-asc">成交量 升序</option>
          <option value="spread-desc">价差 降序</option>
          <option value="spread-asc">价差 升序</option>
          <option value="change-desc">涨跌 降序</option>
          <option value="change-asc">涨跌 升序</option>
          <option value="name-asc">名称 A-Z</option>
        </select>
        <button
          className={`sg-toggle${autoRefresh ? " active" : ""}`}
          onClick={onToggleRefresh}
        >
          {autoRefresh ? "自动刷新" : "已暂停"}
        </button>
      </div>
    </div>
  );
}
