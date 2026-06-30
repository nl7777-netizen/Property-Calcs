/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Timer, ArrowRight, DollarSign, PiggyBank, Sparkles, TrendingUp, AlertTriangle, Scale, Wallet, ShieldCheck } from 'lucide-react';
import { simulateMortgagePayoff, calculateNSWStampDuty } from '../utils/finance';

interface CashflowPayoffSimulatorProps {
  householdMonthlyNetIncome: number;
  mortgageAmount: number;
  interestRatePrimary: number;
  mortgageTermYears: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;
  monthlyExpenses: number;
  monthlyExtraRepayment: number;
  
  // Dynamic offset asset props
  propertyPrice: number;
  isFirstHomeBuyer: boolean;
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;
  existingPropertyValue: number;
  existingPropertyLoan: number;
  useExistingEquity: boolean;

  onUpdate: (fields: {
    monthlyExpenses?: number;
    monthlyExtraRepayment?: number;
  }) => void;
}

export default function CashflowPayoffSimulator({
  householdMonthlyNetIncome,
  mortgageAmount,
  interestRatePrimary,
  mortgageTermYears,
  interestFreeLoanActive,
  interestFreeLoanAmount,
  interestFreeLoanRepaymentYear,
  monthlyExpenses,
  monthlyExtraRepayment,
  
  // Offset asset props
  propertyPrice,
  isFirstHomeBuyer,
  cashAssets,
  sharesAssets,
  otherAssets,
  existingPropertyValue,
  existingPropertyLoan,
  useExistingEquity,

  onUpdate
}: CashflowPayoffSimulatorProps) {

  // Local state for choosing between using assets as deposit vs keeping them in offset account
  const [useOffsetStrategy, setUseOffsetStrategy] = React.useState<'deposit' | 'offset'>('offset');

  // Compute total available offset assets (savings + equity)
  const stampDuty = calculateNSWStampDuty(propertyPrice, isFirstHomeBuyer);
  const conveyancingFees = 2000;
  const totalCosts = propertyPrice + stampDuty + conveyancingFees;
  const existingEquity = useExistingEquity ? Math.max(0, existingPropertyValue - existingPropertyLoan) : 0;
  const totalOffsetAssets = cashAssets + sharesAssets + otherAssets + existingEquity;
  const appliedInterestFreeLoan = interestFreeLoanActive ? interestFreeLoanAmount : 0;

  // Initial Loan based on chosen strategy
  const initialLoan = useOffsetStrategy === 'offset'
    ? Math.max(0, totalCosts - appliedInterestFreeLoan)
    : Math.max(0, totalCosts - totalOffsetAssets - appliedInterestFreeLoan);

  const initialOffset = useOffsetStrategy === 'offset'
    ? totalOffsetAssets
    : 0;

  const minMortgagePayment = simulateMortgagePayoff(
    initialLoan,
    interestRatePrimary,
    mortgageTermYears,
    0, 0, false, 0, 0, 0, initialOffset
  ).standardMonthlyPayment;

  // Monthly breakdown of interest-free loan repayments
  const monthlyIFLRepayment = interestFreeLoanActive ? (interestFreeLoanRepaymentYear / 12) : 0;

  // Let's run the payoff simulation
  const {
    monthsToPayoffStandard,
    monthsToPayoffAccelerated,
    totalInterestStandard,
    totalInterestAccelerated,
  } = simulateMortgagePayoff(
    initialLoan,
    interestRatePrimary,
    mortgageTermYears,
    monthlyExpenses,
    monthlyExtraRepayment,
    interestFreeLoanActive,
    interestFreeLoanAmount,
    interestFreeLoanRepaymentYear,
    householdMonthlyNetIncome,
    initialOffset
  );

  const formatMonths = (totalMonths: number) => {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years === 0) return `${months} mo`;
    if (months === 0) return `${years} years`;
    return `${years} yrs ${months} mo`;
  };

  // Surplus calculation BEFORE any extra repayments
  const netCashflowLeftover = Math.max(
    0,
    householdMonthlyNetIncome - monthlyExpenses - minMortgagePayment - monthlyIFLRepayment
  );

  // Interest-free & Mortgage Principal Calculations
  const monthlyInterestRate = (interestRatePrimary / 100) / 12;
  const firstMonthInterest = Math.max(0, initialLoan - initialOffset) * monthlyInterestRate;
  const firstMonthPrincipal = Math.max(0, minMortgagePayment - firstMonthInterest);
  const averageMonthlyPrincipal = initialLoan / (mortgageTermYears * 12);

  // Maximum possible extra repayments is exactly your surplus unallocated cash
  // (Household Income - Living Expenses - Minimum Mortgage P&I - Interest-Free Loan Repayment)
  const maxPossibleExtra = Math.max(0, Math.round(netCashflowLeftover));

  // Interest savings
  const interestSavings = Math.max(0, totalInterestStandard - totalInterestAccelerated);
  const yearsSaved = Math.max(0, (monthsToPayoffStandard - monthsToPayoffAccelerated) / 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="cashflow-simulator"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Payoff Time & Cashflow Simulator</h2>
            <p className="text-xs text-slate-400">Simulate extra payments and see how early you can become debt-free</p>
          </div>
        </div>
      </div>

      {initialLoan <= 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
          <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Please configure assets and property price first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Offset Strategy Selection Segment */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  Payoff & Offset Strategy Selector
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Choose how your available assets (${totalOffsetAssets.toLocaleString()}) are structured against the purchase.
                </p>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setUseOffsetStrategy('deposit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    useOffsetStrategy === 'deposit'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Cash Deposit Mode
                </button>
                <button
                  type="button"
                  onClick={() => setUseOffsetStrategy('offset')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    useOffsetStrategy === 'offset'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  100% Offset Mode
                </button>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className={`p-3 rounded-lg border transition-all ${useOffsetStrategy === 'deposit' ? 'bg-slate-900/60 border-slate-700/60 text-slate-200' : 'opacity-40 text-slate-400'}`}>
                <span className="font-bold block text-[11px] text-slate-300 mb-1">🏦 Cash Deposit Mode</span>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Your assets are paid immediately as a deposit. Your initial loan starts smaller at <strong className="font-mono text-emerald-400">${initialLoan.toLocaleString()}</strong>, which lowers your minimum monthly payment to <strong className="font-mono text-emerald-400">${Math.round(minMortgagePayment).toLocaleString()}</strong>.
                </p>
              </div>
              <div className={`p-3 rounded-lg border transition-all ${useOffsetStrategy === 'offset' ? 'bg-slate-900/60 border-slate-700/60 text-slate-200' : 'opacity-40 text-slate-400'}`}>
                <span className="font-bold block text-[11px] text-slate-300 mb-1">🛡️ 100% Offset Account Mode</span>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  You borrow the full amount (<strong className="font-mono text-emerald-400">${initialLoan.toLocaleString()}</strong>) but keep your assets in a linked offset account. This keeps your funds 100% liquid while reducing interest identically. Your monthly surplus compounds in the offset account, accelerating your payoff!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Inputs Panel */}
            <div className="space-y-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cashflow Controls</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs text-slate-400 font-medium">Estimated Monthly Living Expenses</label>
                    <span className="text-xs text-slate-400 font-mono font-bold">${monthlyExpenses.toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                    <input
                      type="text"
                      id="input-monthly-expenses"
                      value={monthlyExpenses === 0 ? '' : monthlyExpenses.toLocaleString()}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                        onUpdate({ monthlyExpenses: val });
                      }}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-4 py-2 text-slate-100 font-mono text-sm outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="250"
                    value={monthlyExpenses}
                    onChange={(e) => onUpdate({ monthlyExpenses: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer mt-3"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div>
                      <label className="text-xs text-slate-400 font-medium block">Extra Monthly Principal Repayment</label>
                      <span className="text-[10px] text-slate-500">Max possible: ${maxPossibleExtra.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-emerald-400 font-mono font-bold block">+${monthlyExtraRepayment.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => onUpdate({ monthlyExtraRepayment: maxPossibleExtra })}
                        className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 underline cursor-pointer"
                      >
                        Set to Max Possible
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                    <input
                      type="text"
                      id="input-extra-repayment"
                      value={monthlyExtraRepayment === 0 ? '' : monthlyExtraRepayment.toLocaleString()}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                        onUpdate({ monthlyExtraRepayment: Math.min(val, maxPossibleExtra) });
                      }}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-4 py-2 text-slate-100 font-mono text-sm outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxPossibleExtra}
                    step="100"
                    value={Math.min(monthlyExtraRepayment, maxPossibleExtra)}
                    disabled={maxPossibleExtra <= 0}
                    onChange={(e) => onUpdate({ monthlyExtraRepayment: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer mt-3 disabled:opacity-40"
                  />
                  <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed">
                    * The maximum possible extra repayment is capped by your <strong className="text-slate-400 font-medium">Surplus Unallocated Cash</strong> (Net Income minus Living Expenses, Minimum Mortgage P&I, and Interest-Free Loan Repayments) to maintain a fully sustainable, cashflow-safe household budget.
                  </p>
                </div>
              </div>

              {/* Standard repayments portion breakdown card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-400" />
                  <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">Standard P&I Repayments Breakdown</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Minimum Monthly Payment</span>
                    <span className="text-slate-200 font-mono">${Math.round(minMortgagePayment).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">↳ Initial Month's Interest Portion</span>
                    <span className="text-rose-400 font-mono">${Math.round(firstMonthInterest).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">↳ Initial Month's Principal Portion</span>
                    <span className="text-emerald-400 font-mono">${Math.round(firstMonthPrincipal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-slate-800/60 text-[11px] pt-1 border-t border-dashed border-slate-800">
                    <span className="text-slate-500">↳ Average Monthly Principal Repayment</span>
                    <span className="text-emerald-400 font-mono">${Math.round(averageMonthlyPrincipal).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Income & Expense Breakdown Box */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Household Monthly Cashflow</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net Household Income</span>
                    <span className="text-slate-300 font-mono">+${Math.round(householdMonthlyNetIncome).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Living Expenses</span>
                    <span className="text-rose-400 font-mono">-${Math.round(monthlyExpenses).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Minimum Mortgage P&I</span>
                    <span className="text-rose-400 font-mono">-${Math.round(minMortgagePayment).toLocaleString()}</span>
                  </div>
                  {interestFreeLoanActive && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Interest-Free Loan Repayment</span>
                      <span className="text-rose-400 font-mono">-${Math.round(monthlyIFLRepayment).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-800/60 pt-2 font-semibold">
                    <span className="text-slate-300">Surplus Unallocated Cash</span>
                    <span className="text-emerald-400 font-mono">${Math.round(netCashflowLeftover).toLocaleString()}</span>
                  </div>
                </div>
                {netCashflowLeftover < monthlyExtraRepayment && (
                  <div className="bg-amber-950/10 border border-amber-900/20 p-2.5 rounded-lg flex items-start gap-1.5 text-[10px] text-amber-300">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Your target extra repayment is greater than your available surplus. The simulation will automatically scale extra repayments down to stay within your actual budget limits.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Results Comparison Panel */}
            <div className="flex flex-col justify-between space-y-5">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projection Timelines</h3>
                  {useOffsetStrategy === 'offset' && (
                    <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                      Offset Active (${totalOffsetAssets.toLocaleString()})
                    </span>
                  )}
                </div>

                {/* Staggered Timeline View */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-slate-400">Standard Schedule</span>
                      <span className="text-lg font-bold text-slate-300 font-mono">{formatMonths(monthsToPayoffStandard)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 w-full" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Accelerated Path
                      </span>
                      <span className="text-xl font-bold text-emerald-400 font-mono">{formatMonths(monthsToPayoffAccelerated)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${Math.max(10, (monthsToPayoffAccelerated / monthsToPayoffStandard) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Offset Account Dynamics Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <PiggyBank className="w-4 h-4 text-emerald-400" />
                  Linked Offset Account Growth
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Initial Offset Capital:</span>
                    <span className="font-semibold text-slate-200 font-mono">${initialOffset.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Monthly Surplus Savings Added:</span>
                    <span className="font-semibold text-emerald-400 font-mono">+${Math.round(netCashflowLeftover).toLocaleString()}/mo</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>This account directly reduces the interest charges on your home loan. Your funds remain fully accessible in cash.</span>
                  </div>
                </div>
              </div>

              {/* Major highlight box */}
              {yearsSaved > 0 && (
                <div className="bg-gradient-to-r from-emerald-950/20 to-slate-900/30 border border-emerald-500/10 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Accelerated Benefits</span>
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                      Become debt free <span className="text-emerald-400 font-mono">{yearsSaved.toFixed(1)} years</span> faster!
                    </h4>
                    <p className="text-xs text-slate-400">Directly bypasses future compounding interest charges.</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 uppercase font-mono">Interest Saved</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">${Math.round(interestSavings).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </motion.div>
  );
}
