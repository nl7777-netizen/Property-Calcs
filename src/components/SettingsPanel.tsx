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

    const simulation = simulateMortgagePayoff(
      mortgageAmount,
      interestRatePrimary,
      mortgageTermYears,
      monthlyExpenses,
      0, // calculate standard payoff with 0 extra repayment to get standard payment
      interestFreeLoanActive,
      interestFreeLoanAmount,
      interestFreeLoanRepaymentYear,
      combinedNetMonthly
    );

    const minMortgagePayment = simulation.standardMonthlyPayment;
    const monthlyIFLRepayment = interestFreeLoanActive ? (interestFreeLoanRepaymentYear / 12) : 0;
    const leftoverCashflow = Math.max(0, combinedNetMonthly - monthlyExpenses - minMortgagePayment - monthlyIFLRepayment);

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
                      <input
                        type="range"
                        min="0"
                        max="350000"
                        step="5000"
                        value={salary1}
                        onChange={(e) => onUpdate({ salary1: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 h-1 mt-2.5 bg-slate-950 rounded"
                      />
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
                      <input
                        type="range"
                        min="0"
                        max="350000"
                        step="5000"
                        value={salary2}
                        onChange={(e) => onUpdate({ salary2: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 h-1 mt-2.5 bg-slate-950 rounded"
                      />
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-slate-400 font-medium">Monthly Living Expenses (Excluding Rent/Mortgage)</label>
                      <span className="text-xs text-slate-200 font-mono font-bold">${monthlyExpenses.toLocaleString()}/mo</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="12000"
                      step="100"
                      value={monthlyExpenses}
                      onChange={(e) => onUpdate({ monthlyExpenses: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>Frugal ($1,000)</span>
                      <span>High Cost ($12,000)</span>
                    </div>
                  </div>

                  {/* Overpayments */}
                  <div>
                    <div className="flex justify-between items-start mb-1">
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
                    <input
                      type="range"
                      min="0"
                      max={Math.max(5000, maxPossibleExtra)}
                      step="100"
                      value={Math.min(monthlyExtraRepayment, Math.max(5000, maxPossibleExtra))}
                      onChange={(e) => onUpdate({ monthlyExtraRepayment: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>None ($0)</span>
                      <span>Aggressive (${Math.max(5000, maxPossibleExtra).toLocaleString()})</span>
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
                      <input
                        type="range"
                        min="200000"
                        max="6500000"
                        step="25000"
                        value={propertyPrice}
                        onChange={(e) => onUpdate({ propertyPrice: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 h-1 mt-2.5 bg-slate-950 rounded"
                      />
                    </div>

                    {/* First Home buyer toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-900">
                      <div>
                        <span className="block text-xs font-bold text-slate-300">First Home Buyer Status (NSW FHBAS)</span>
                        <span className="text-[10px] text-slate-500 leading-normal block max-w-sm">
                          Grants stamp duty exemption under $800k, and sliding-scale concession under $1M.
                        </span>
                      </div>
                      
                      <button
                        onClick={() => onUpdate({ isFirstHomeBuyer: !isFirstHomeBuyer })}
                        className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                          isFirstHomeBuyer
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-400'
                        }`}
                      >
                        {isFirstHomeBuyer ? 'Active' : 'Inactive'}
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

                      {/* Custom suburb growth slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs text-slate-400">Projection Growth Rate</label>
                          <span className="text-xs font-bold text-emerald-400 font-mono">{customGrowthRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          step="0.1"
                          value={customGrowthRate}
                          onChange={(e) => onUpdate({ customGrowthRate: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 bg-slate-950 rounded mt-2"
                        />
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
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400">Mortgage Term (Duration)</label>
                        <span className="text-xs font-bold text-slate-200 font-mono">{mortgageTermYears} Years</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="35"
                        step="1"
                        value={mortgageTermYears}
                        onChange={(e) => onUpdate({ mortgageTermYears: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 h-1 bg-slate-950 rounded cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                        <span>10 Yrs</span>
                        <span>35 Yrs</span>
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
