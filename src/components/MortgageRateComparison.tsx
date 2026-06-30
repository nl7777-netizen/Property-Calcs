/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Landmark, ArrowRight, ArrowUpRight, HelpCircle, AlertCircle, Percent } from 'lucide-react';
import { calculateMortgagePayment } from '../utils/finance';

interface MortgageRateComparisonProps {
  mortgageAmount: number;
  mortgageTermYears: number;
  interestRatePrimary: number;
  interestRateScenarioB: number;
  interestRateScenarioC: number;
  onUpdate: (fields: {
    mortgageTermYears?: number;
    interestRatePrimary?: number;
    interestRateScenarioB?: number;
    interestRateScenarioC?: number;
  }) => void;
}

export default function MortgageRateComparison({
  mortgageAmount,
  mortgageTermYears,
  interestRatePrimary,
  interestRateScenarioB,
  interestRateScenarioC,
  onUpdate
}: MortgageRateComparisonProps) {

  // Payment calculations for all 3 scenarios
  const paymentA = calculateMortgagePayment(mortgageAmount, interestRatePrimary, mortgageTermYears);
  const paymentB = calculateMortgagePayment(mortgageAmount, interestRateScenarioB, mortgageTermYears);
  const paymentC = calculateMortgagePayment(mortgageAmount, interestRateScenarioC, mortgageTermYears);

  // Total payments over the loan lifetime
  const totalPaidA = paymentA * mortgageTermYears * 12;
  const totalPaidB = paymentB * mortgageTermYears * 12;
  const totalPaidC = paymentC * mortgageTermYears * 12;

  // Total interest paid over the lifetime
  const interestA = Math.max(0, totalPaidA - mortgageAmount);
  const interestB = Math.max(0, totalPaidB - mortgageAmount);
  const interestC = Math.max(0, totalPaidC - mortgageAmount);

  // Calculate potential savings (A vs B, C vs A)
  const savingsAvsB = Math.max(0, interestA - interestB);
  const costCvsA = Math.max(0, interestC - interestA);

  const renderScenarioCard = (
    label: string,
    rate: number,
    rateKey: 'interestRatePrimary' | 'interestRateScenarioB' | 'interestRateScenarioC',
    payment: number,
    interest: number,
    bgColor: string,
    borderColor: string,
    accentColor: string
  ) => {
    const totalPayments = payment * mortgageTermYears * 12;
    const interestRatio = totalPayments > 0 ? (interest / totalPayments) * 100 : 0;
    const principalRatio = 100 - interestRatio;

    return (
      <div className={`bg-slate-900/40 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between`} id={`scenario-card-${rateKey}`}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${bgColor} ${accentColor} border ${borderColor}`}>
              {label}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.05"
                min="1"
                max="15"
                value={rate}
                onChange={(e) => onUpdate({ [rateKey]: parseFloat(e.target.value) || 0 })}
                className="w-16 bg-slate-950 border border-slate-800 rounded-md px-1.5 py-1 text-slate-100 font-mono text-xs text-center outline-none focus:border-sky-500/50"
              />
              <span className="text-xs text-slate-500 font-medium">%</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Monthly P&I Payment</span>
              <span className="text-2xl font-bold text-slate-100 font-mono">${payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-800/50 py-2.5">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Fortnightly</span>
                <span className="font-semibold text-slate-300 font-mono">${Math.round((payment * 12) / 26).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Weekly</span>
                <span className="font-semibold text-slate-300 font-mono">${Math.round((payment * 12) / 52).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] text-slate-500 uppercase">Lifetime Interest Cost</span>
              <span className={`text-lg font-bold font-mono ${accentColor}`}>${Math.round(interest).toLocaleString()}</span>
            </div>

            {totalPayments > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Principal: {principalRatio.toFixed(0)}%</span>
                  <span>Interest: {interestRatio.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                  <div className="h-full bg-slate-400" style={{ width: `${principalRatio}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${interestRatio}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="mortgage-comparison"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Interest Rate Comparison</h2>
            <p className="text-xs text-slate-400">Compare scheduled repayments and overall costs side-by-side</p>
          </div>
        </div>

        {/* Loan Term Selector */}
        <div className="flex items-center gap-3" id="loan-term-selector">
          <label className="text-xs text-slate-400 font-semibold uppercase">Loan Term:</label>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <input
              type="range"
              min="10"
              max="40"
              step="5"
              value={mortgageTermYears}
              onChange={(e) => onUpdate({ mortgageTermYears: parseInt(e.target.value) || 30 })}
              className="accent-amber-500 w-24 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-100 font-mono w-16 text-center">{mortgageTermYears} years</span>
          </div>
        </div>
      </div>

      {mortgageAmount <= 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Please enter a property price and offset assets to view mortgage rates.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {renderScenarioCard(
              'Scenario Low',
              interestRateScenarioB,
              'interestRateScenarioB',
              paymentB,
              interestB,
              'bg-emerald-950/40',
              'border-emerald-900/30',
              'text-emerald-400'
            )}

            {renderScenarioCard(
              'Scenario Primary',
              interestRatePrimary,
              'interestRatePrimary',
              paymentA,
              interestA,
              'bg-sky-950/40',
              'border-sky-900/30',
              'text-sky-400'
            )}

            {renderScenarioCard(
              'Scenario High',
              interestRateScenarioC,
              'interestRateScenarioC',
              paymentC,
              interestC,
              'bg-rose-950/40',
              'border-rose-900/30',
              'text-rose-400'
            )}
          </div>

          {/* Quick analysis comparing primary vs others */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-emerald-500 mb-1">Low Interest Scenario Benefit</span>
                <p className="text-xs text-slate-400">
                  Reducing rate from <span className="font-semibold text-slate-200 font-mono">{interestRatePrimary}%</span> to <span className="font-semibold text-slate-200 font-mono">{interestRateScenarioB}%</span> saves:
                </p>
              </div>
              <div className="text-right">
                <span className="block text-xl font-bold text-emerald-400 font-mono">+${Math.round(savingsAvsB).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">over lifetime</span>
              </div>
            </div>

            <div className="bg-rose-950/10 border border-rose-900/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-rose-400 mb-1">High Interest Scenario Risk</span>
                <p className="text-xs text-slate-400">
                  Increasing rate from <span className="font-semibold text-slate-200 font-mono">{interestRatePrimary}%</span> to <span className="font-semibold text-slate-200 font-mono">{interestRateScenarioC}%</span> costs:
                </p>
              </div>
              <div className="text-right">
                <span className="block text-xl font-bold text-rose-400 font-mono">-${Math.round(costCvsA).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">over lifetime</span>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
