import { Parser, type Expression } from "expr-eval";
import { STRATEGIES } from "@/data/strategies";
import type { StrategyConfig } from "@/types";

const parser = new Parser();

const compiled = new Map<string, Expression>();

/** 启动时预编译全部公式，解析失败立即报错。 */
export function compileFormulas(list: StrategyConfig[] = STRATEGIES): void {
  for (const s of list) {
    if (compiled.has(s.id)) continue;
    try {
      compiled.set(s.id, parser.parse(s.formula));
    } catch (e) {
      throw new Error(`策略 ${s.id} 公式解析失败: ${s.formula} (${(e as Error).message})`);
    }
  }
}

compileFormulas();

export function evaluateFormula(
  strategyId: string,
  formula: string,
  vars: Record<string, number>,
): number | null {
  let expr = compiled.get(strategyId);
  if (!expr) {
    expr = parser.parse(formula);
    compiled.set(strategyId, expr);
  }
  const value = expr.evaluate(vars);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}
