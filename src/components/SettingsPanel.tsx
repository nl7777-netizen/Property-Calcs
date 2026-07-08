/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, DollarSign, Calendar, Landmark, Percent, Sparkles, AlertCircle,
  MapPin, Home, Info, HelpCircle, Wallet, Settings, Timer, ChevronRight,
  TrendingUp, Activity, CheckSquare, Square, Trash2, Plus, Bookmark, Layers,
  Check, Copy, Share2, Download, Upload, FileJson, Laptop, Smartphone
} from 'lucide-react';
import { FinancialScenario, TaxYear, DynamicTaxConfig, SuburbData } from '../types';
import {
  calculateNSWIncomeTax,
  calculateNSWStampDuty,
  simulateMortgagePayoff,
  calculateFuturePurchaseSimulation
} from '../utils/finance';

interface SettingsPanelProps {
  // Property details
  propertyPrice: number;
  isFirstHomeBuyer: boolean;
  suburb: string;
  customGrowthRate: number;

  // Salaries
  salary1: number;
  salary2: number;
  taxYear: TaxYear;

  // Assets
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;

  // Existing property details
  existingPropertyValue: number;
  existingPropertyLoan: number;
  useExistingEquity: boolean;

  // Interest-Free Loan
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;

  // Mortgage parameters
  mortgageTermYears: number;
  interestRatePrimary: number;
  interestRateScenarioB: number;
  interestRateScenarioC: number;

  // Cashflow
  monthlyExpenses: number;
  monthlyExpensesWithParents: number;
  monthlyPropertyStrata: number;
  monthlyPropertyCouncil: number;
  monthlyPropertyInsurance: number;
  monthlyPropertyWater: number;
  monthlyPropertyUtilities: number;
  monthlyExtraRepayment: number;

  // Future Purchase Simulation
  simulateFuturePurchase: boolean;
  propertyInflationEnabled: boolean;
  currentSimDate: string;
  purchaseSimDate: string;
  monthlySavingsContribution: number;
  savingsAnnualReturnRate: number;

  dynamicTaxConfig?: DynamicTaxConfig;
  suburbsList: SuburbData[];

  // Callbacks
  onUpdate: (fields: any) => void;
  onSyncTaxConfig: (config: DynamicTaxConfig) => void;
  onAddSuburb: (newSuburb: SuburbData) => void;
}

export default function SettingsPanel({
  propertyPrice,
  isFirstHomeBuyer,
  suburb,
  customGrowthRate,
  salary1,
  salary2,
  taxYear,
  cashAssets,
  sharesAssets,
  otherAssets,
  existingPropertyValue,
  existingPropertyLoan,
  useExistingEquity,
  interestFreeLoanActive,
  interestFreeLoanAmount,
  interestFreeLoanRepaymentYear,
  mortgageTermYears,
  interestRatePrimary,
  interestRateScenarioB,
  interestRateScenarioC,
  monthlyExpenses,
  monthlyExpensesWithParents,
  monthlyPropertyStrata,
  monthlyPropertyCouncil,
  monthlyPropertyInsurance,
  monthlyPropertyWater,
  monthlyPropertyUtilities,
  monthlyExtraRepayment,
  simulateFuturePurchase,
  propertyInflationEnabled,
  currentSimDate,
  purchaseSimDate,
  monthlySavingsContribution,
  savingsAnnualReturnRate,
  dynamicTaxConfig,
  suburbsList,
  onUpdate,
  onSyncTaxConfig,
  onAddSuburb
}: SettingsPanelProps) {
  const [activeConfigTab, setActiveConfigTab] = useState<'budget' | 'property'>('budget');
  const [isSyncingTax, setIsSyncingTax] = useState(false);
  const [taxSyncError, setTaxSyncError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingSuburb, setIsSearchingSuburb] = useState(false);
  const [suburbSearchError, setSuburbSearchError] = useState<string | null>(null);

  // Local input states for debouncing to prevent typing lag and infinite recalculation loops
  const [localExpensesStr, setLocalExpensesStr] = useState(() => monthlyExpenses === 0 ? '' : monthlyExpenses.toLocaleString());
  const [localExpensesWithParentsStr, setLocalExpensesWithParentsStr] = useState(() => monthlyExpensesWithParents === 0 ? '' : monthlyExpensesWithParents.toLocaleString());

  // Keep local states in sync when props change from the outside (e.g. loading a scenario)
  React.useEffect(() => {
    setLocalExpensesStr(monthlyExpenses === 0 ? '' : monthlyExpenses.toLocaleString());
  }, [monthlyExpenses]);

  React.useEffect(() => {
    setLocalExpensesWithParentsStr(monthlyExpensesWithParents === 0 ? '' : monthlyExpensesWithParents.toLocaleString());
  }, [monthlyExpensesWithParents]);

  // Debounce updates to the parent component for monthlyExpenses (Pure Lifestyle)
  React.useEffect(() => {
    const val = parseFloat(localExpensesStr.replace(/[^0-9.]/g, '')) || 0;
    if (val === monthlyExpenses) return;

    const handler = setTimeout(() => {
      onUpdate({ monthlyExpenses: val });
    }, 400);

    return () => clearTimeout(handler);
  }, [localExpensesStr, onUpdate, monthlyExpenses]);

  // Debounce updates to the parent component for monthlyExpensesWithParents
  React.useEffect(() => {
    const val = parseFloat(localExpensesWithParentsStr.replace(/[^0-9.]/g, '')) || 0;
    if (val === monthlyExpensesWithParents) return;

    const handler = setTimeout(() => {
      onUpdate({ monthlyExpensesWithParents: val });
    }, 400);

    return () => clearTimeout(handler);
  }, [localExpensesWithParentsStr, onUpdate, monthlyExpensesWithParents]);

  // Dynamic max extra repayments calculation
  const maxPossibleExtra = React.useMemo(() => {
    let finalPropertyPrice = propertyPrice;
    let finalStampDuty = calculateNSWStampDuty(propertyPrice, isFirstHomeBuyer);
    const conveyancingFees = 2000;
    
    const existingEquity = useExistingEquity ? Math.max(0, existingPropertyValue - existingPropertyLoan) : 0;
    let finalTotalOffsetAssets = cashAssets + sharesAssets + otherAssets + existingEquity;
    
    if (simulateFuturePurchase) {
      const sim = calculateFuturePurchaseSimulation({
        propertyPrice,
        customGrowthRate: propertyInflationEnabled ? customGrowthRate : 0,
        isFirstHomeBuyer,
        cashAssets: cashAssets,
        sharesAssets,
        otherAssets,
        currentSimDate,
        purchaseSimDate,
        monthlySavingsContribution,
        savingsAnnualReturnRate,
        interestFreeLoanActive,
        interestFreeLoanAmount,
        existingPropertyValue,
        existingPropertyLoan,
        useExistingEquity,
        salary1,
        salary2,
        taxYear,
        dynamicTaxConfig
      });
      finalPropertyPrice = sim.futurePropertyPrice;
      finalStampDuty = sim.futureStampDuty;
      finalTotalOffsetAssets = sim.accruedAssets;
    }

    const totalCosts = finalPropertyPrice + finalStampDuty + conveyancingFees;
    const appliedInterestFreeLoan = interestFreeLoanActive ? interestFreeLoanAmount : 0;
    const mortgageAmount = Math.max(0, totalCosts - finalTotalOffsetAssets - appliedInterestFreeLoan);

    const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    const combinedNetAnnual = taxBreakdown1.netPay + taxBreakdown2.netPay;
    const combinedNetMonthly = combinedNetAnnual / 12;

    const totalExpenses = monthlyExpenses + (monthlyPropertyStrata || 0) + (monthlyPropertyCouncil || 0) + (monthlyPropertyInsurance || 0) + (monthlyPropertyUtilities || 0);

    const simulation = simulateMortgagePayoff(
      mortgageAmount,
      interestRatePrimary,
      mortgageTermYears,
      totalExpenses,
      0, // calculate standard payoff with 0 extra repayment to get standard payment
      interestFreeLoanActive,
      interestFreeLoanAmount,
      interestFreeLoanRepaymentYear,
      combinedNetMonthly
    );

    const minMortgagePayment = simulation.standardMonthlyPayment;
    const monthlyIFLRepayment = interestFreeLoanActive ? (interestFreeLoanRepaymentYear / 12) : 0;
    const leftoverCashflow = Math.max(0, combinedNetMonthly - totalExpenses - minMortgagePayment - monthlyIFLRepayment);

    return Math.max(0, Math.round(leftoverCashflow));
  }, [
    propertyPrice,
    isFirstHomeBuyer,
    customGrowthRate,
    salary1,
    salary2,
    taxYear,
    cashAssets,
    sharesAssets,
    otherAssets,
    interestFreeLoanActive,
    interestFreeLoanAmount,
    interestFreeLoanRepaymentYear,
    mortgageTermYears,
    interestRatePrimary,
    monthlyExpenses,
    monthlyPropertyStrata,
    monthlyPropertyCouncil,
    monthlyPropertyInsurance,
    monthlyPropertyUtilities,
    existingPropertyValue,
    existingPropertyLoan,
    useExistingEquity,
    simulateFuturePurchase,
    propertyInflationEnabled,
    currentSimDate,
    purchaseSimDate,
    monthlySavingsContribution,
    savingsAnnualReturnRate,
    dynamicTaxConfig
  ]);

  // Max possible savings contribution based on monthly household net income minus expenses
  const maxPossibleSavings = React.useMemo(() => {
    const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    const combinedNetAnnual = taxBreakdown1.netPay + taxBreakdown2.netPay;
    const combinedNetMonthly = combinedNetAnnual / 12;
    return Math.max(0, Math.round(combinedNetMonthly - monthlyExpenses));
  }, [salary1, salary2, taxYear, dynamicTaxConfig, monthlyExpenses]);

  // ATO tax scraping sync
  const handleSyncTax = async () => {
    setIsSyncingTax(true);
    setTaxSyncError(null);
    try {
      const res = await fetch('/api/sync-tax-year');
      if (!res.ok) {
        throw new Error('Tax rate syncing service is temporarily offline.');
      }
      const data = await res.json();
      if (data && data.financialYear) {
        onSyncTaxConfig(data);
        onUpdate({ taxYear: data.financialYear });
      } else {
        throw new Error('Could not find latest ATO tax bracket schemas.');
      }
    } catch (err: any) {
      console.error(err);
      setTaxSyncError(err.message || 'Scrape failed');
    } finally {
      setIsSyncingTax(false);
    }
  };

  // Suburb insight scraping search
  const handleSearchSuburb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingSuburb(true);
    setSuburbSearchError(null);
    try {
      const res = await fetch('/api/suburb-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb: searchQuery.trim() })
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve metrics for the specified suburb.');
      }
      const data = await res.json();
      if (data && data.name && data.historicalGrowthRate !== undefined) {
        onAddSuburb(data);
        onUpdate({
          suburb: data.name,
          customGrowthRate: data.historicalGrowthRate
        });
        setSearchQuery('');
      } else {
        throw new Error('Received unexpected suburb insights layout.');
      }
    } catch (err: any) {
      console.error(err);
      setSuburbSearchError(err.message || 'Suburb query failed');
    } finally {
      setIsSearchingSuburb(false);
    }
  };

  const handleSuburbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const found = suburbsList.find(s => s.name === selectedName);
    if (found) {
      onUpdate({
        suburb: found.name,
        customGrowthRate: found.historicalGrowthRate
      });
    }
  };

  return (
    <div className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="settings-panel-view">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Sub-tab selection */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Planner Settings & Profiles</h2>
            <p className="text-xs text-slate-400">Configure financial parameters, manage saved scenarios, and share wireless codes</p>
          </div>
        </div>

        {/* Configuration sections tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0" id="config-subtabs">
          <button
            onClick={() => setActiveConfigTab('budget')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeConfigTab === 'budget'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Income & Budget
          </button>
          <button
            onClick={() => setActiveConfigTab('property')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeConfigTab === 'property'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Property & Loans
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeConfigTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.12 }}
          className="space-y-6"
        >
          
          {/* TAB 1: INCOME & BUDGET CONFIGS */}
          {activeConfigTab === 'budget' && (
            <div className="space-y-6" id="tab-budget-configs">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Household Salary Inputs */}
                <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" /> 1. Household Salaries (Annual Gross)
                    </h3>
                    
                    <button
                      onClick={handleSyncTax}
                      disabled={isSyncingTax}
                      className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 cursor-pointer hover:text-emerald-300"
                    >
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      <span>{isSyncingTax ? 'Syncing...' : 'Sync ATO Rates'}</span>
                    </button>
                  </div>

                  {taxSyncError && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg">
                      {taxSyncError}
                    </div>
                  )}

                  {dynamicTaxConfig && (
                    <div className="p-2.5 bg-emerald-950/10 border border-emerald-500/20 text-emerald-300 text-[10px] rounded-lg">
                      ✓ Active Synced Brackets loaded for <span className="font-semibold">{dynamicTaxConfig.financialYear}</span>.
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Salary 1 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400 font-medium">Primary Salary (Salary 1)</label>
                        <span className="text-xs text-slate-200 font-mono font-bold">${salary1.toLocaleString()}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <input
                          type="text"
                          value={salary1 === 0 ? '' : salary1.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            onUpdate({ salary1: parseFloat(raw) || 0 });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Salary 2 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400 font-medium">Partner Salary (Salary 2)</label>
                        <span className="text-xs text-slate-200 font-mono font-bold">${salary2.toLocaleString()}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <input
                          type="text"
                          value={salary2 === 0 ? '' : salary2.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            onUpdate({ salary2: parseFloat(raw) || 0 });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Tax Year selection */}
                    <div className="grid grid-cols-3 gap-2 pt-2 items-center">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">ATO Period:</span>
                      {['2023-24', '2025-26'].map(yr => (
                        <button
                          key={yr}
                          onClick={() => onUpdate({ taxYear: yr })}
                          className={`py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            taxYear === yr
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          FY {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Liquid Savings & Assets */}
                <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                    <Wallet className="w-4 h-4 text-emerald-400" /> 2. Liquid Savings & Offset Assets
                  </h3>

                  <div className="space-y-4">
                    {/* Cash */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cash Savings Pool (Primary Deposit)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <input
                          type="text"
                          value={cashAssets === 0 ? '' : cashAssets.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            onUpdate({ cashAssets: parseFloat(raw) || 0 });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Shares */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Share Portfolio Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <input
                          type="text"
                          value={sharesAssets === 0 ? '' : sharesAssets.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            onUpdate({ sharesAssets: parseFloat(raw) || 0 });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Other assets */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Other Assets (Vehicle, precious metals, etc)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <input
                          type="text"
                          value={otherAssets === 0 ? '' : otherAssets.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            onUpdate({ otherAssets: parseFloat(raw) || 0 });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Monthly living budget & overpayments */}
              <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                  <Timer className="w-4 h-4 text-emerald-400" /> 3. Monthly Living Expenses & Target Overpayments
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Living expenses */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs text-slate-400 font-medium">Monthly Living Expenses (Pure Lifestyle Only)</label>
                      <span className="text-xs text-slate-200 font-mono font-bold">${monthlyExpenses.toLocaleString()}/mo</span>
                    </div>
                    <div className="relative mb-4">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                      <input
                        type="text"
                        value={localExpensesStr}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setLocalExpensesStr(raw === '' ? '' : parseInt(raw, 10).toLocaleString());
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                      />
                    </div>

                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs text-slate-400 font-medium">Reduced Expenses (Live with Parents - Scenarios A & C)</label>
                      <span className="text-xs text-slate-200 font-mono font-bold">${monthlyExpensesWithParents.toLocaleString()}/mo</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                      <input
                        type="text"
                        value={localExpensesWithParentsStr}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setLocalExpensesWithParentsStr(raw === '' ? '' : parseInt(raw, 10).toLocaleString());
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                      />
                    </div>

                    <div className="bg-slate-950/65 border border-amber-500/15 rounded-xl p-3.5 space-y-2 mt-4">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wider font-mono">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Avoid Double-Counting Costs</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                        To prevent double counting in the **Property Exit Planner (Scenario B & C)**, please exclude any mortgage interest, strata, council rates, insurance, and utilities from this input box. These property holding costs are automatically calculated and subtracted dynamically in the simulation based on the Property details.
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-slate-800/40 text-[9px] font-sans">
                        <div>
                          <span className="block text-emerald-400 font-bold mb-0.5">✅ INCLUDE HERE:</span>
                          <ul className="list-disc pl-3 space-y-0.5 text-slate-500">
                            <li>Groceries & Dining</li>
                            <li>Transport & Fuel</li>
                            <li>Personal Shopping</li>
                            <li>Entertainment & Gym</li>
                            <li>Health & Subscriptions</li>
                          </ul>
                        </div>
                        <div>
                          <span className="block text-rose-400 font-bold mb-0.5">❌ EXCLUDE HERE:</span>
                          <ul className="list-disc pl-3 space-y-0.5 text-slate-500">
                            <li>Mortgage Payments</li>
                            <li>Strata & Council Rates</li>
                            <li>Home Insurance</li>
                            <li>Detailed Utilities</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overpayments */}
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-col">
                        <label className="text-xs text-slate-400 font-medium">Target Extra Monthly Repayment</label>
                        <span className="text-[10px] text-slate-500 font-medium">Max possible surplus: ${maxPossibleExtra.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-emerald-400 font-mono font-bold">+${monthlyExtraRepayment.toLocaleString()}/mo</span>
                        {maxPossibleExtra > 0 && monthlyExtraRepayment < maxPossibleExtra && (
                          <button
                            type="button"
                            onClick={() => onUpdate({ monthlyExtraRepayment: maxPossibleExtra })}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors cursor-pointer mt-0.5"
                          >
                            Set to Max Possible
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                      <input
                        type="text"
                        value={monthlyExtraRepayment === 0 ? '' : monthlyExtraRepayment.toLocaleString()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          onUpdate({ monthlyExtraRepayment: parseFloat(raw) || 0 });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                      />
                    </div>
                  </div>

                </div>

                {/* Separated Property Expenses Section */}
                <div className="border-t border-slate-900/60 pt-4 mt-2">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Separated Property Holding & Running Costs (Target Home)
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Strata */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Strata Levy (/mo)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">$</span>
                        <input
                          type="number"
                          value={monthlyPropertyStrata === 0 ? '' : monthlyPropertyStrata}
                          onChange={(e) => onUpdate({ monthlyPropertyStrata: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-5 pr-2 py-1.5 text-[11px] text-slate-200 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Council Rates */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Council Rates (/mo)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">$</span>
                        <input
                          type="number"
                          value={monthlyPropertyCouncil === 0 ? '' : monthlyPropertyCouncil}
                          onChange={(e) => onUpdate({ monthlyPropertyCouncil: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-5 pr-2 py-1.5 text-[11px] text-slate-200 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Home Insurance (/mo)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">$</span>
                        <input
                          type="number"
                          value={monthlyPropertyInsurance === 0 ? '' : monthlyPropertyInsurance}
                          onChange={(e) => onUpdate({ monthlyPropertyInsurance: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-5 pr-2 py-1.5 text-[11px] text-slate-200 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Water Rates */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Water Rates (/mo)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">$</span>
                        <input
                          type="number"
                          value={monthlyPropertyWater === 0 ? '' : monthlyPropertyWater}
                          onChange={(e) => onUpdate({ monthlyPropertyWater: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-5 pr-2 py-1.5 text-[11px] text-slate-200 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Utilities */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Power & Internet (/mo)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">$</span>
                        <input
                          type="number"
                          value={monthlyPropertyUtilities === 0 ? '' : monthlyPropertyUtilities}
                          onChange={(e) => onUpdate({ monthlyPropertyUtilities: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-5 pr-2 py-1.5 text-[11px] text-slate-200 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-emerald-950/10 border border-emerald-500/15 rounded-xl p-3 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      <strong>Consolidated Outgoings:</strong> Combining pure lifestyle costs and separate property maintenance/utility expenses yields your total monthly household commitment (excluding mortgage).
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right border-r border-slate-800 pr-3">
                        <span className="block text-[9px] text-slate-500 font-semibold uppercase">Pure Lifestyle</span>
                        <span className="text-xs text-slate-300 font-mono font-bold">${monthlyExpenses.toLocaleString()}/mo</span>
                      </div>
                      <div className="text-right border-r border-slate-800 pr-3">
                        <span className="block text-[9px] text-slate-500 font-semibold uppercase">Property & Utilities</span>
                        <span className="text-xs text-slate-300 font-mono font-bold">${(monthlyPropertyStrata + monthlyPropertyCouncil + monthlyPropertyInsurance + monthlyPropertyWater + monthlyPropertyUtilities).toLocaleString()}/mo</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] text-emerald-400 font-extrabold uppercase">Total Outgoings</span>
                        <span className="text-sm text-emerald-400 font-mono font-black">${(monthlyExpenses + monthlyPropertyStrata + monthlyPropertyCouncil + monthlyPropertyInsurance + monthlyPropertyWater + monthlyPropertyUtilities).toLocaleString()}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PROPERTY & LOANS CONFIGS */}
          {activeConfigTab === 'property' && (
            <div className="space-y-6" id="tab-property-configs">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Target Property details */}
                <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                    <Home className="w-4 h-4 text-emerald-400" /> 1. Target Property Price & Location Profile
                  </h3>

                  <div className="space-y-4">
                    {/* Price */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400 font-medium">Target Purchase Price</label>
                        <span className="text-xs text-slate-200 font-mono font-bold">${propertyPrice.toLocaleString()}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <input
                          type="text"
                          value={propertyPrice === 0 ? '' : propertyPrice.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            onUpdate({ propertyPrice: parseFloat(raw) || 0 });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-100 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* First Home buyer toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-900 opacity-70">
                      <div>
                        <span className="block text-xs font-bold text-slate-300">First Home Buyer Status (NSW FHBAS)</span>
                        <span className="text-[10px] text-slate-500 leading-normal block max-w-sm">
                          FHBAS is strictly disabled. Stamp Duty is calculated strictly on the $1.48M paper price.
                        </span>
                      </div>
                      
                      <button
                        disabled
                        className="px-3 py-1 text-xs font-bold rounded bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed"
                      >
                        Disabled
                      </button>
                    </div>

                    {/* Suburb drop-down selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">NSW Suburb Area</label>
                        <select
                          value={suburb}
                          onChange={handleSuburbChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:border-emerald-500 transition-all outline-none"
                        >
                          {suburbsList.map(s => (
                            <option key={s.name} value={s.name}>
                              {s.name} ({s.region})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom suburb growth input */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs text-slate-400 font-medium">Projection Growth Rate</label>
                          <span className="text-xs font-bold text-emerald-400 font-mono">{customGrowthRate}%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={customGrowthRate}
                            onChange={(e) => onUpdate({ customGrowthRate: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-3 pr-7 py-1.5 text-xs text-slate-100 outline-none font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Suburb Gemini insights search */}
                    <form onSubmit={handleSearchSuburb} className="p-3 bg-slate-900/40 rounded-lg border border-slate-900 space-y-2">
                      <label className="block text-[10px] text-slate-400 uppercase font-bold">Query Suburb Metrics (Gemini AI Scraper)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Redfern, Redland, Parramatta"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-slate-200 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isSearchingSuburb}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded px-3 py-1 disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {isSearchingSuburb ? 'Searching...' : 'Scrape'}
                        </button>
                      </div>
                      {suburbSearchError && (
                        <p className="text-[10px] text-rose-400">{suburbSearchError}</p>
                      )}
                    </form>
                  </div>
                </div>

                {/* Mortgage Structure & Alternative Rates */}
                <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                    <Landmark className="w-4 h-4 text-emerald-400" /> 2. Mortgage parameters & Scenario Rates
                  </h3>

                  <div className="space-y-4">
                    {/* Term */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs text-slate-400 font-medium">Mortgage Term (Duration)</label>
                        <span className="text-xs font-bold text-slate-200 font-mono">{mortgageTermYears} Years</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={mortgageTermYears}
                          onChange={(e) => onUpdate({ mortgageTermYears: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg pl-3 pr-12 py-1.5 text-xs text-slate-100 outline-none font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">Years</span>
                      </div>
                    </div>

                    {/* Interest rates */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Alternative Rate B (Low %)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={interestRateScenarioB}
                          onChange={(e) => onUpdate({ interestRateScenarioB: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-emerald-400 mb-1">Primary Rate (%)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={interestRatePrimary}
                          onChange={(e) => onUpdate({ interestRatePrimary: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-bold font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Alternative Rate C (High %)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={interestRateScenarioC}
                          onChange={(e) => onUpdate({ interestRateScenarioC: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                        />
                      </div>
                    </div>

                    {/* Existing property equity config */}
                    <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-bold text-slate-300">Utilize Existing Property Equity</span>
                          <span className="text-[10px] text-slate-500 leading-normal block max-w-sm">Use net value of existing home for deposit.</span>
                        </div>
                        <button
                          onClick={() => onUpdate({ useExistingEquity: !useExistingEquity })}
                          className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                            useExistingEquity
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                              : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-400'
                          }`}
                        >
                          {useExistingEquity ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {useExistingEquity && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">Existing Property Value</label>
                            <input
                              type="number"
                              value={existingPropertyValue}
                              onChange={(e) => onUpdate({ existingPropertyValue: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">Outstanding Loan Balance</label>
                            <input
                              type="number"
                              value={existingPropertyLoan}
                              onChange={(e) => onUpdate({ existingPropertyLoan: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Interest-Free Loan options & Future Simulation Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Interest Free Loan */}
                <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-400" /> Interest-Free Loan Options
                    </h3>
                    <button
                      onClick={() => onUpdate({ interestFreeLoanActive: !interestFreeLoanActive })}
                      className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                        interestFreeLoanActive
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-400'
                      }`}
                    >
                      {interestFreeLoanActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {interestFreeLoanActive && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Interest-Free Co-Loan Principal</label>
                        <input
                          type="number"
                          value={interestFreeLoanAmount}
                          onChange={(e) => onUpdate({ interestFreeLoanAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Yearly Repayment Installment</label>
                        <input
                          type="number"
                          value={interestFreeLoanRepaymentYear}
                          onChange={(e) => onUpdate({ interestFreeLoanRepaymentYear: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Future purchase simulator */}
                <div className="bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" /> Future Purchase Simulation Planner
                    </h3>
                    <button
                      onClick={() => onUpdate({ simulateFuturePurchase: !simulateFuturePurchase })}
                      className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                        simulateFuturePurchase
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-400'
                      }`}
                    >
                      {simulateFuturePurchase ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {simulateFuturePurchase && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Current Date (YYYY-MM)</label>
                          <input
                            type="text"
                            value={currentSimDate}
                            onChange={(e) => onUpdate({ currentSimDate: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Purchase Date (YYYY-MM)</label>
                          <input
                            type="text"
                            value={purchaseSimDate}
                            onChange={(e) => onUpdate({ purchaseSimDate: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <label className="block text-[10px] text-slate-400">Monthly Savings Contribution ($)</label>
                            {maxPossibleSavings > 0 && monthlySavingsContribution < maxPossibleSavings && (
                              <button
                                type="button"
                                onClick={() => onUpdate({ monthlySavingsContribution: maxPossibleSavings })}
                                className="text-[9px] font-bold text-amber-500 hover:text-amber-400 underline cursor-pointer transition-all"
                              >
                                Set to Max Possible (${maxPossibleSavings.toLocaleString()})
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            value={monthlySavingsContribution}
                            onChange={(e) => onUpdate({ monthlySavingsContribution: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Savings Compound Return (% PA)</label>
                          <input
                            type="number"
                            value={savingsAnnualReturnRate}
                            onChange={(e) => onUpdate({ savingsAnnualReturnRate: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-900 text-xs">
                        <span className="text-slate-400">Apply Growth/Inflation to Target Property Price</span>
                        <button
                          onClick={() => onUpdate({ propertyInflationEnabled: !propertyInflationEnabled })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                            propertyInflationEnabled ? 'bg-indigo-950 border border-indigo-900/40 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          {propertyInflationEnabled ? 'Inflating' : 'Static'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}



        </motion.div>
      </AnimatePresence>

    </div>
  );
}
