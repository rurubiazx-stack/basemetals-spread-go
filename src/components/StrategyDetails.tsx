import type { StrategyConfig } from "@/types";
import type { StrategyResult } from "@/lib/calculateStrategies";
import { UC_PROXY_LABEL } from "@/data/contracts";
import { fmtPrice, fmtVolume } from "@/lib/format";
import { SpreadChart } from "@/components/SpreadChart";

interface Props {
  strategy: StrategyConfig;
  state: StrategyResult | undefined;
  tick: number;
}

export function StrategyDetails({ strategy, state, tick }: Props) {
  const legs = state?.legs ?? [];
  const hasProxy = legs.some((l) => l.isProxy);

  return (
    <div className="detail-content">
      <SpreadChart
        strategyId={strategy.id}
        current={state?.spread ?? null}
        decimals={0}
        tick={tick}
      />
      <div className="detail-section legs-section">
        <div className="detail-title">腿明细</div>
        <div className="leg-scroll">
          <div className="leg-table">
            <div className="leg-cell leg-header">腿</div>
            <div className="leg-cell leg-header">合约</div>
            <div className="leg-cell leg-header">方向</div>
            <div className="leg-cell leg-header">手数</div>
            <div className="leg-cell leg-header">实时价格</div>
            <div className="leg-cell leg-header">成交量</div>
            {strategy.legs.map((leg) => {
              const view = legs.find((l) => l.slot === leg.slot);
              return (
                <FragmentRow
                  key={leg.slot}
                  slot={leg.slot}
                  contract={leg.contract}
                  dir={leg.dir}
                  lots={leg.lots}
                  price={view?.price ?? null}
                  volume={view?.volume ?? null}
                  isProxy={!!view?.isProxy}
                />
              );
            })}
          </div>
        </div>
        {hasProxy && <div className="detail-note">{UC_PROXY_LABEL}</div>}
      </div>
    </div>
  );
}

function FragmentRow({
  slot,
  contract,
  dir,
  lots,
  price,
  volume,
  isProxy,
}: {
  slot: string;
  contract: string;
  dir: string;
  lots: number;
  price: number | null;
  volume: number | null;
  isProxy: boolean;
}) {
  return (
    <>
      <div className="leg-cell">{slot}</div>
      <div className="leg-cell">
        {contract}
        {isProxy && <span className="leg-tag proxy">PROXY</span>}
      </div>
      <div className="leg-cell">{dir}</div>
      <div className="leg-cell">{lots}</div>
      <div className={`leg-cell${price === null ? " price-val na" : ""}`}>{fmtPrice(price)}</div>
      <div className={`leg-cell${volume === null ? " price-val na" : ""}`}>{fmtVolume(volume)}</div>
    </>
  );
}
