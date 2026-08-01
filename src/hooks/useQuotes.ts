import { useCallback, useEffect, useRef, useState } from "react";
import type { QuotesResponse } from "@/types";

export const QUOTES_ENDPOINT = "/api/public/quotes";
const POLL_MS = 5000;

export interface UseQuotesResult {
  data: QuotesResponse | null;
  lastSuccessAt: number | null;
  error: string | null;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
}

/** 5 秒轮询自有 quotes 接口；请求不重叠，暂停时不发起新请求。 */
export function useQuotes(): UseQuotesResult {
  const [data, setData] = useState<QuotesResponse | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(QUOTES_ENDPOINT, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as QuotesResponse;
      setData(json);
      setLastSuccessAt(Date.now());
      setError(null);
    } catch (e) {
      console.error("[quotes] 请求失败", (e as Error).message);
      setError("行情服务暂不可用");
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const toggleAutoRefresh = useCallback(() => setAutoRefresh((v) => !v), []);

  return { data, lastSuccessAt, error, autoRefresh, toggleAutoRefresh };
}
