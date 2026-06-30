import React from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Sparkles, TrendingUp, PiggyBank, ArrowRight, Hourglass } from 'lucide-react';
import { calculateFuturePurchaseSimulation } from '../utils/finance';

interface FutureSimulationSettingsProps {
  propertyPrice: number;
  customGrowthRate: number;
  isFirstHomeBuyer: boolean;
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  householdMonthlyNetIncome: number;
  monthlyExpenses: number;

  simulateFuturePurchase: boolean;
  propertyInflationEnabled: boolean;
  currentSimDate: string;
  purchaseSimDate: string;
  monthlySavingsContribution: number;
  savingsAnnualReturnRate: number;

  onUpdate: (fields: {
    simulateFuturePurchase?: boolean;
    propertyInflationEnabled?: boolean;
    currentSimDate?: string;
    purchaseSimDate?: string;
    monthlySavingsContribution?: number;
    savingsAnnualReturnRate?: number;
  }) => void;
}

export default function FutureSimulationSettings({
  propertyPrice,
  customGrowthRate,
  isFirstHomeBuyer,
  cashAssets,
  sharesAssets,
  otherAssets,
  interestFreeLoanActive,
  interestFreeLoanAmount,
  householdMonthlyNetIncome,
  monthlyExpenses,
  simulateFuturePurchase,
  propertyInflationEnabled,
  currentSimDate,
  purchaseSimDate,
  monthlySavingsContribution,
  savingsAnnualReturnRate,
  onUpdate
}: FutureSimulationSettingsProps) {
  
  // Calculate max possible savings based on net income minus expenses
  const maxPossibleSavings = Math.max(0, Math.round(householdMonthlyNetIncome - monthlyExpenses));
  const maxSliderSavings = Math.max(15000, maxPossibleSavings);

  // Calculate results if active
  const simResult = calculateFuturePurchaseSimulation({
    propertyPrice,
    customGrowthRate: propertyInflationEnabled ? customGrowthRate : 0,
    isFirstHomeBuyer,
    cashAssets,
    sharesAssets,
    otherAssets,
    currentSimDate,
    purchaseSimDate,
    monthlySavingsContribution,
    savingsAnnualReturnRate,
    interestFreeLoanActive,
    interestFreeLoanAmount
  });

  const handleToggle = () => {
    onUpdate({ simulateFuturePurchase: !simulateFuturePurchase });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="future-simulation"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Future Purchase Simulation</h2>
            <p className="text-xs text-slate-400">Model savings growth and property inflation before buying</p>
          </div>
        </div>

        {/* Toggle Simulation Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Enable Simulation</span>
          <button
            onClick={handleToggle}
            id="toggle-future-sim"
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
              simulateFuturePurchase ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-all ${
                simulateFuturePurchase ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {!simulateFuturePurchase ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>Toggle future purchase simulation to calculate savings accrued before your simulated purchase date.</p>
          <p className="text-xs text-slate-600 mt-2">Useful for modeling goals like: "Buying in June 2028 with $2,000/mo extra savings."</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Simulation Parameters Left Panel */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulation Timeline & Rates</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Current Date</label>
                  <input
                    type="month"
                    value={currentSimDate}
                    onChange={(e) => onUpdate({ currentSimDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-amber-500/50 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Future Purchase Date</label>
                  <input
                    type="month"
                    value={purchaseSimDate}
                    onChange={(e) => onUpdate({ purchaseSimDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-amber-500/50 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Optional Property Price Inflation Toggle */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold text-slate-300">Property Price Inflation</span>
                  <span className="block text-[10px] text-slate-500 leading-normal">
                    Model future property price growth at <strong className="text-amber-500/90 font-mono">{customGrowthRate.toFixed(1)}%</strong> p.a.
                  </span>
                </div>
                <button
                  type="button"
                  id="toggle-property-inflation"
                  onClick={() => onUpdate({ propertyInflationEnabled: !propertyInflationEnabled })}
                  className={`w-10 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-all shrink-0 ${
                    propertyInflationEnabled ? 'bg-amber-500/95' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-slate-950 w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${
                      propertyInflationEnabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <label className="text-xs text-slate-400 font-medium block">Monthly Savings Contribution</label>
                    <span className="text-[10px] text-slate-500">Max possible: ${maxPossibleSavings.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-amber-400 font-mono font-bold block">${monthlySavingsContribution.toLocaleString()}/mo</span>
                    <button
                      type="button"
                      onClick={() => onUpdate({ monthlySavingsContribution: maxPossibleSavings })}
                      className="text-[9px] font-bold text-amber-500 hover:text-amber-400 underline cursor-pointer"
                    >
                      Set to Max Possible
                    </button>
                  </div>
                </div>
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                  <input
                    type="text"
                    id="input-monthly-savings"
                    value={monthlySavingsContribution === 0 ? '' : monthlySavingsContribution.toLocaleString()}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                      onUpdate({ monthlySavingsContribution: Math.min(val, maxPossibleSavings) });
                    }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-4 py-2 text-slate-100 font-mono text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxSliderSavings}
                  step="250"
                  value={Math.min(monthlySavingsContribution, maxSliderSavings)}
                  onChange={(e) => onUpdate({ monthlySavingsContribution: parseFloat(e.target.value) || 0 })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs text-slate-400 font-medium">Annual Return Rate on Assets</label>
                  <span className="text-xs text-amber-400 font-mono font-bold">{savingsAnnualReturnRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.1"
                  value={savingsAnnualReturnRate}
                  onChange={(e) => onUpdate({ savingsAnnualReturnRate: parseFloat(e.target.value) || 0 })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Simulated Live Projection Right Panel */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider flex items-center gap-1 mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Simulation Dynamics ({simResult.monthsDiff} Months)
                </span>

                <div className="space-y-4">
                  {/* Property Price Change */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      Property Price Inflation:
                    </span>
                    <span className="font-semibold text-slate-200 font-mono flex items-center gap-1">
                      ${propertyPrice.toLocaleString()}
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-rose-400">${simResult.futurePropertyPrice.toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Stamp Duty Impact */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Future Stamp Duty:</span>
                    <span className="font-semibold text-rose-400 font-mono">${simResult.futureStampDuty.toLocaleString()}</span>
                  </div>

                  {/* Accrued Savings */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                      Future Offset Asset Pool:
                    </span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      ${simResult.accruedAssets.toLocaleString()}
                    </span>
                  </div>

                  {/* Breakdown of contributions */}
                  <div className="pl-5 border-l border-slate-800 text-[10px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Accrued Contributions:</span>
                      <span className="font-mono">+${simResult.additionalSavingsFromContributions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investment Returns Gain:</span>
                      <span className="font-mono">+${simResult.compoundingGains.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Required Loan comparison */}
              <div className="border-t border-slate-800/80 pt-4 mt-4">
                <span className="block text-[10px] text-slate-500 uppercase">Simulated Mortgage Required</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-bold text-slate-200 font-mono">
                    ${simResult.futureMortgageAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    (Originally: ${Math.round(Math.max(0, propertyPrice - (cashAssets + sharesAssets + otherAssets) - (interestFreeLoanActive ? interestFreeLoanAmount : 0))).toLocaleString()})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Big Summary Alert */}
          <div className="bg-amber-950/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start">
            <Hourglass className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-amber-400 block mb-1">Timeline Strategy Insight</span>
              <p className="text-slate-300 leading-relaxed">
                By deferring the purchase to <strong className="text-amber-300">{purchaseSimDate}</strong>, you will accrue{' '}
                <strong className="text-emerald-400 font-mono">${simResult.additionalSavingsFromContributions.toLocaleString()}</strong> in net savings contributions plus{' '}
                <strong className="text-emerald-400 font-mono">${simResult.compoundingGains.toLocaleString()}</strong> in compounding returns.
                {propertyInflationEnabled ? (
                  <>
                    {' '}However, historical property inflation is projected to increase the target property purchase value by{' '}
                    <strong className="text-rose-400 font-mono">${(simResult.futurePropertyPrice - propertyPrice).toLocaleString()}</strong>.
                  </>
                ) : (
                  <>
                    {' '}Property price inflation modeling is currently disabled, so the target purchase price remains flat at{' '}
                    <strong className="text-slate-300 font-mono">${propertyPrice.toLocaleString()}</strong>.
                  </>
                )}
                {simResult.futureMortgageAmount < Math.max(0, propertyPrice - (cashAssets + sharesAssets + otherAssets) - (interestFreeLoanActive ? interestFreeLoanAmount : 0)) ? (
                  <span className="text-emerald-400"> This strategy reduces your final required mortgage, improving your overall loan payoff speed!</span>
                ) : (
                  <span className="text-amber-300"> Property growth is currently outstripping your savings rate. Consider increasing contributions, targeting conservative locations, or enabling inflation modeling.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
