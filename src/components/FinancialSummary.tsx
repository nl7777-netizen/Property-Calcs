/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, AlertCircle, Sparkles, Compass, AlertTriangle, Coins, TrendingUp } from 'lucide-react';
import { simulateMortgagePayoff, projectPropertyGrowth } from '../utils/finance';

interface FinancialSummaryProps {
  grossHouseholdIncome: number;
  netHouseholdIncomeMonthly: number;
  mortgageAmount: number;
  interestRatePrimary: number;
  mortgageTermYears: number;
  monthlyExpenses: number;
  monthlyExtraRepayment: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;
}

export default function FinancialSummary({
  grossHouseholdIncome,
  netHouseholdIncomeMonthly,
  mortgageAmount,
  interestRatePrimary,
  mortgageTermYears,
  monthlyExpenses,
  monthlyExtraRepayment,
  interestFreeLoanActive,
  interestFreeLoanAmount,
  interestFreeLoanRepaymentYear,
}: FinancialSummaryProps) {

  // Minimum scheduled payment
  const minMortgagePayment = simulateMortgagePayoff(
    mortgageAmount,
    interestRatePrimary,
    mortgageTermYears,
    0, 0, false, 0, 0, 0
  ).standardMonthlyPayment;

  // Monthly breakdown of interest-free loan repayments
  const monthlyIFLRepayment = interestFreeLoanActive ? (interestFreeLoanRepaymentYear / 12) : 0;

  // Surplus calculation
  const leftoverCashflow = Math.max(
    0,
    netHouseholdIncomeMonthly - monthlyExpenses - minMortgagePayment - monthlyIFLRepayment
  );

  // 1. Debt-to-Income (DTI)
  // Mortgage loan / Gross household income
  const dti = grossHouseholdIncome > 0 ? (mortgageAmount / grossHouseholdIncome) : 0;
  
  let dtiRating = 'Excellent';
  let dtiColor = 'text-emerald-400 border-emerald-950 bg-emerald-950/20';
  if (dti >= 6) {
    dtiRating = 'High Risk';
    dtiColor = 'text-rose-400 border-rose-950 bg-rose-950/20';
  } else if (dti >= 4) {
    dtiRating = 'Tight Leverage';
    dtiColor = 'text-amber-400 border-amber-950 bg-amber-950/20';
  }

  // 2. Debt Service Ratio
  // Minimum mortgage payment / net monthly income
  const debtServiceRatio = netHouseholdIncomeMonthly > 0 ? (minMortgagePayment / netHouseholdIncomeMonthly) * 100 : 0;
  
  let dsRating = 'Comfortable';
  let dsColor = 'text-emerald-400 border-emerald-950 bg-emerald-950/20';
  if (debtServiceRatio >= 45) {
    dsRating = 'Mortgage Stress';
    dsColor = 'text-rose-400 border-rose-950 bg-rose-950/20';
  } else if (debtServiceRatio >= 30) {
    dsRating = 'Moderate Stress';
    dsColor = 'text-amber-400 border-amber-950 bg-amber-950/20';
  }

  // 3. Overall Viability Score
  let viabilityScore = 'Secure';
  let viabilityDescription = 'Your financials are stable. You have a robust surplus buffer and your debt ratios are within standard banking safety metrics. You are well-positioned to complete this purchase!';
  let viabilityTheme = 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400';
  let IconComponent = ShieldCheck;

  if (dti >= 6 || debtServiceRatio >= 45 || leftoverCashflow < 500) {
    viabilityScore = 'High Risk Warning';
    viabilityDescription = 'Your budget is highly leveraged. A minor interest rate increase or income fluctuation could cause major mortgage stress. Consider lowering your property purchase target, cutting living costs, or boosting your deposit.';
    viabilityTheme = 'border-rose-500/20 bg-rose-950/10 text-rose-400';
    IconComponent = AlertTriangle;
  } else if (dti >= 4.5 || debtServiceRatio >= 35 || leftoverCashflow < 1200) {
    viabilityScore = 'Caution / Tight';
    viabilityDescription = 'Your purchase is viable but budget constraints are tight. You have modest unallocated cashflow. Try avoiding unnecessary consumer debt, and allocate standard surplus to emergency buffers.';
    viabilityTheme = 'border-amber-500/20 bg-amber-950/10 text-amber-400';
    IconComponent = AlertCircle;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="financial-summary-card"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Financial Viability Overview</h2>
            <p className="text-xs text-slate-400">Detailed risk assessment and safety rating for your chosen scenario</p>
          </div>
        </div>
      </div>

      {mortgageAmount <= 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
          <Compass className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Please construct a property price structure above to generate report.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main Viability Alert Banner */}
          <div className={`border rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start ${viabilityTheme}`} id="viability-banner">
            <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                Scenario Viability: {viabilityScore}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {viabilityDescription}
              </p>
            </div>
          </div>

          {/* Three KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* DTI */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3" id="kpi-dti">
              <span className="block text-[10px] uppercase font-semibold text-slate-500">Debt-To-Income (DTI)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 font-mono">{dti.toFixed(1)}x</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dtiColor}`}>
                  {dtiRating}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Compares mortgage debt to annual gross household income. Banks flag warnings when DTI exceeds <strong className="text-slate-300 font-mono">6.0x</strong>.
              </p>
            </div>

            {/* Debt Service Ratio */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3" id="kpi-dsr">
              <span className="block text-[10px] uppercase font-semibold text-slate-500">Repayment Stress Ratio</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 font-mono">{debtServiceRatio.toFixed(1)}%</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dsColor}`}>
                  {dsRating}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Percentage of monthly net take-home salary consumed by minimum scheduled mortgage payment. Standard buffer limit is <strong className="text-slate-300 font-mono">30%</strong>.
              </p>
            </div>

            {/* Leftover Cushion */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3" id="kpi-buffer">
              <span className="block text-[10px] uppercase font-semibold text-slate-500">Net Surplus Buffer</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 font-mono">${Math.round(leftoverCashflow).toLocaleString()}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  leftoverCashflow >= 1500
                    ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20'
                    : leftoverCashflow >= 500
                    ? 'text-amber-400 border-amber-950 bg-amber-950/20'
                    : 'text-rose-400 border-rose-950 bg-rose-950/20'
                }`}>
                  {leftoverCashflow >= 1500 ? 'Comfortable' : leftoverCashflow >= 500 ? 'Moderate' : 'Stretched'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Monthly cash leftover after living expenses, mortgage P&I, and interest-free repayments. Crucial for emergency funding.
              </p>
            </div>

          </div>

          {/* Quick Stats Grid representing long-term metrics */}
          <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
            <div>
              <span className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Mortgage Interest Rate</span>
              <span className="text-sm font-semibold text-slate-300 font-mono">{interestRatePrimary}% P.A.</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Monthly Mortgage Payment</span>
              <span className="text-sm font-bold text-sky-400 font-mono">${Math.round(minMortgagePayment).toLocaleString()}</span>
            </div>
            {interestFreeLoanActive && (
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Interest-Free Loan</span>
                <span className="text-sm font-semibold text-sky-400 font-mono">${Math.round(interestFreeLoanAmount).toLocaleString()}</span>
              </div>
            )}
            <div>
              <span className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Target Extra Principal</span>
              <span className="text-sm font-semibold text-emerald-400 font-mono">+${monthlyExtraRepayment}/mo</span>
            </div>
          </div>

        </div>
      )}
    </motion.div>
  );
}
