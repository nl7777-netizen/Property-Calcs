/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign, Landmark, TrendingUp, Users, Wallet, Timer, Activity,
  Bookmark, ShieldAlert, Sparkles, HelpCircle, FileText, ArrowUpRight
} from 'lucide-react';

import { FinancialScenario, TaxYear, DynamicTaxConfig, SuburbData } from './types';
import {
  calculateNSWIncomeTax,
  calculateNSWStampDuty,
  simulateMortgagePayoff,
  NSW_SUBURBS,
  calculateFuturePurchaseSimulation,
  getMonthsBetweenDates
} from './utils/finance';

// Component imports
import SalaryCalculator from './components/SalaryCalculator';
import AssetOffsetCalculator from './components/AssetOffsetCalculator';
import MortgageRateComparison from './components/MortgageRateComparison';
import CashflowPayoffSimulator from './components/CashflowPayoffSimulator';
import SuburbGrowthVisualizer from './components/SuburbGrowthVisualizer';
import FinancialSummary from './components/FinancialSummary';
import SavedScenarios from './components/SavedScenarios';
import FutureSimulationSettings from './components/FutureSimulationSettings';
import SettingsSync from './components/SettingsSync';

const LOCAL_STORAGE_KEY = 'property_dashboard_scenarios';

export default function App() {
  // Load saved scenarios from localStorage on startup
  const [savedScenarios, setSavedScenarios] = useState<FinancialScenario[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Helper to load current planning inputs from localStorage
  const getSavedInput = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem('property_dashboard_active_inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch {}
    return defaultValue;
  };

  // Default values for the primary planning scenario, now backed by localStorage memory
  const [propertyPrice, setPropertyPrice] = useState(() => getSavedInput('propertyPrice', 1200000));
  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(() => getSavedInput('isFirstHomeBuyer', true));
  const [suburb, setSuburb] = useState(() => getSavedInput('suburb', 'Parramatta'));
  const [customGrowthRate, setCustomGrowthRate] = useState(() => getSavedInput('customGrowthRate', 5.4));
  
  const [salary1, setSalary1] = useState(() => getSavedInput('salary1', 115000));
  const [salary2, setSalary2] = useState(() => getSavedInput('salary2', 95000));
  const [taxYear, setTaxYear] = useState<TaxYear>(() => getSavedInput('taxYear', '2025-26'));

  const [cashAssets, setCashAssets] = useState(() => getSavedInput('cashAssets', 180000));
  const [sharesAssets, setSharesAssets] = useState(() => getSavedInput('sharesAssets', 45000));
  const [otherAssets, setOtherAssets] = useState(() => getSavedInput('otherAssets', 15000));

  const [interestFreeLoanActive, setInterestFreeLoanActive] = useState(() => getSavedInput('interestFreeLoanActive', false));
  const [interestFreeLoanAmount, setInterestFreeLoanAmount] = useState(() => getSavedInput('interestFreeLoanAmount', 30000));
  const [interestFreeLoanRepaymentYear, setInterestFreeLoanRepaymentYear] = useState(() => getSavedInput('interestFreeLoanRepaymentYear', 5000));

  const [mortgageTermYears, setMortgageTermYears] = useState(() => getSavedInput('mortgageTermYears', 30));
  const [interestRatePrimary, setInterestRatePrimary] = useState(() => getSavedInput('interestRatePrimary', 6.1));
  const [interestRateScenarioB, setInterestRateScenarioB] = useState(() => getSavedInput('interestRateScenarioB', 5.2));
  const [interestRateScenarioC, setInterestRateScenarioC] = useState(() => getSavedInput('interestRateScenarioC', 7.0));

  const [monthlyExpenses, setMonthlyExpenses] = useState(() => getSavedInput('monthlyExpenses', 3800));
  const [monthlyExtraRepayment, setMonthlyExtraRepayment] = useState(() => getSavedInput('monthlyExtraRepayment', 600));

  const [existingPropertyValue, setExistingPropertyValue] = useState(() => getSavedInput('existingPropertyValue', 0));
  const [existingPropertyLoan, setExistingPropertyLoan] = useState(() => getSavedInput('existingPropertyLoan', 0));
  const [useExistingEquity, setUseExistingEquity] = useState(() => getSavedInput('useExistingEquity', true));

  // New Full-Stack Features State
  const [dynamicTaxConfig, setDynamicTaxConfig] = useState<DynamicTaxConfig | undefined>(() => {
    try {
      const stored = localStorage.getItem('property_dashboard_dynamic_tax_config');
      return stored ? JSON.parse(stored) : undefined;
    } catch {
      return undefined;
    }
  });

  const [suburbsList, setSuburbsList] = useState<SuburbData[]>(() => {
    try {
      const stored = localStorage.getItem('property_dashboard_suburbs_list');
      return stored ? JSON.parse(stored) : NSW_SUBURBS;
    } catch {
      return NSW_SUBURBS;
    }
  });

  const [simulateFuturePurchase, setSimulateFuturePurchase] = useState(false);
  const [propertyInflationEnabled, setPropertyInflationEnabled] = useState(() => getSavedInput('propertyInflationEnabled', false));
  const [currentSimDate, setCurrentSimDate] = useState('2026-06');
  const [purchaseSimDate, setPurchaseSimDate] = useState('2028-06');
  const [monthlySavingsContribution, setMonthlySavingsContribution] = useState(2500);
  const [savingsAnnualReturnRate, setSavingsAnnualReturnRate] = useState(5.0);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'income' | 'assets' | 'mortgage' | 'cashflow' | 'growth' | 'saved'>('income');

  // Sync state changes with localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedScenarios));
  }, [savedScenarios]);

  useEffect(() => {
    localStorage.setItem('property_dashboard_suburbs_list', JSON.stringify(suburbsList));
  }, [suburbsList]);

  useEffect(() => {
    if (dynamicTaxConfig) {
      localStorage.setItem('property_dashboard_dynamic_tax_config', JSON.stringify(dynamicTaxConfig));
    }
  }, [dynamicTaxConfig]);

  // Unified memory persistence for all planning inputs
  useEffect(() => {
    const inputs = {
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
      existingPropertyValue,
      existingPropertyLoan,
      useExistingEquity
    };
    localStorage.setItem('property_dashboard_active_inputs', JSON.stringify(inputs));
  }, [
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
    existingPropertyValue,
    existingPropertyLoan,
    useExistingEquity
  ]);

  // Combined metrics memoized to drive the instant-feedback top dashboard header
  const topMetrics = useMemo(() => {
    let finalPropertyPrice = propertyPrice;
    let finalStampDuty = calculateNSWStampDuty(propertyPrice, isFirstHomeBuyer);
    const conveyancingFees = 2000;
    
    // Calculated existing property equity
    const existingEquity = useExistingEquity ? Math.max(0, existingPropertyValue - existingPropertyLoan) : 0;
    let finalTotalOffsetAssets = cashAssets + sharesAssets + otherAssets + existingEquity;
    
    // Future purchase simulation dynamics
    let futureSimInfo = null;
    if (simulateFuturePurchase) {
      const sim = calculateFuturePurchaseSimulation({
        propertyPrice,
        customGrowthRate: propertyInflationEnabled ? customGrowthRate : 0,
        isFirstHomeBuyer,
        cashAssets: cashAssets + existingEquity, // include existing equity in future savings compounding/start balance!
        sharesAssets,
        otherAssets,
        currentSimDate,
        purchaseSimDate,
        monthlySavingsContribution,
        savingsAnnualReturnRate,
        interestFreeLoanActive,
        interestFreeLoanAmount
      });
      finalPropertyPrice = sim.futurePropertyPrice;
      finalStampDuty = sim.futureStampDuty;
      finalTotalOffsetAssets = sim.accruedAssets;
      futureSimInfo = sim;
    }

    const totalCosts = finalPropertyPrice + finalStampDuty + conveyancingFees;
    
    // 3. Interest free loan offset
    const appliedInterestFreeLoan = interestFreeLoanActive ? interestFreeLoanAmount : 0;
    
    // 4. Required mortgage principal
    const mortgageAmount = Math.max(0, totalCosts - finalTotalOffsetAssets - appliedInterestFreeLoan);

    // 5. Salaries net monthly income with dynamic tax configuration support
    const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    const combinedNetAnnual = taxBreakdown1.netPay + taxBreakdown2.netPay;
    const combinedNetMonthly = combinedNetAnnual / 12;

    // 6. Payoff Simulator standard vs accelerated
    const simulation = simulateMortgagePayoff(
      mortgageAmount,
      interestRatePrimary,
      mortgageTermYears,
      monthlyExpenses,
      monthlyExtraRepayment,
      interestFreeLoanActive,
      interestFreeLoanAmount,
      interestFreeLoanRepaymentYear,
      combinedNetMonthly
    );

    return {
      mortgageAmount,
      combinedNetMonthly,
      stampDuty: finalStampDuty,
      acceleratedMonths: simulation.monthsToPayoffAccelerated,
      minMonthlyPayment: simulation.standardMonthlyPayment,
      futureSimInfo,
      finalPropertyPrice,
      finalTotalOffsetAssets,
    };
  }, [
    propertyPrice,
    isFirstHomeBuyer,
    cashAssets,
    sharesAssets,
    otherAssets,
    interestFreeLoanActive,
    interestFreeLoanAmount,
    salary1,
    salary2,
    taxYear,
    dynamicTaxConfig,
    mortgageTermYears,
    interestRatePrimary,
    monthlyExpenses,
    monthlyExtraRepayment,
    interestFreeLoanRepaymentYear,
    simulateFuturePurchase,
    propertyInflationEnabled,
    currentSimDate,
    purchaseSimDate,
    monthlySavingsContribution,
    savingsAnnualReturnRate,
    customGrowthRate,
    existingPropertyValue,
    existingPropertyLoan,
    useExistingEquity
  ]);

  // Save Scenario handler
  const handleSaveScenario = (name: string) => {
    const newScenario: FinancialScenario = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: new Date().toISOString(),
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
      existingPropertyValue,
      existingPropertyLoan,
      useExistingEquity
    };

    setSavedScenarios([...savedScenarios, newScenario]);
  };

  // Load Scenario handler
  const handleLoadScenario = (s: FinancialScenario) => {
    setPropertyPrice(s.propertyPrice);
    setIsFirstHomeBuyer(s.isFirstHomeBuyer);
    setSuburb(s.suburb);
    setCustomGrowthRate(s.customGrowthRate);
    setSalary1(s.salary1);
    setSalary2(s.salary2);
    setTaxYear(s.taxYear);
    setCashAssets(s.cashAssets);
    setSharesAssets(s.sharesAssets);
    setOtherAssets(s.otherAssets);
    setInterestFreeLoanActive(s.interestFreeLoanActive);
    setInterestFreeLoanAmount(s.interestFreeLoanAmount);
    setInterestFreeLoanRepaymentYear(s.interestFreeLoanRepaymentYear);
    setMortgageTermYears(s.mortgageTermYears);
    setInterestRatePrimary(s.interestRatePrimary);
    setInterestRateScenarioB(s.interestRateScenarioB);
    setInterestRateScenarioC(s.interestRateScenarioC);
    setMonthlyExpenses(s.monthlyExpenses);
    setMonthlyExtraRepayment(s.monthlyExtraRepayment);
    setSimulateFuturePurchase(s.simulateFuturePurchase ?? false);
    setPropertyInflationEnabled(s.propertyInflationEnabled ?? false);
    setCurrentSimDate(s.currentSimDate ?? '2026-06');
    setPurchaseSimDate(s.purchaseSimDate ?? '2028-06');
    setMonthlySavingsContribution(s.monthlySavingsContribution ?? 2500);
    setSavingsAnnualReturnRate(s.savingsAnnualReturnRate ?? 5.0);
    setExistingPropertyValue(s.existingPropertyValue ?? 0);
    setExistingPropertyLoan(s.existingPropertyLoan ?? 0);
    setUseExistingEquity(s.useExistingEquity ?? true);
  };

  // Delete Scenario handler
  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(savedScenarios.filter(x => x.id !== id));
  };

  // Import entire settings package (scenarios, inputs, custom suburbs, custom taxes)
  const handleImportSettings = (imported: {
    activeInputs: any;
    savedScenarios: FinancialScenario[];
    suburbsList?: SuburbData[];
    dynamicTaxConfig?: DynamicTaxConfig;
  }) => {
    // 1. Restore Active Inputs if present
    if (imported.activeInputs) {
      const s = imported.activeInputs;
      if (s.propertyPrice !== undefined) setPropertyPrice(s.propertyPrice);
      if (s.isFirstHomeBuyer !== undefined) setIsFirstHomeBuyer(s.isFirstHomeBuyer);
      if (s.suburb !== undefined) setSuburb(s.suburb);
      if (s.customGrowthRate !== undefined) setCustomGrowthRate(s.customGrowthRate);
      if (s.salary1 !== undefined) setSalary1(s.salary1);
      if (s.salary2 !== undefined) setSalary2(s.salary2);
      if (s.taxYear !== undefined) setTaxYear(s.taxYear);
      if (s.cashAssets !== undefined) setCashAssets(s.cashAssets);
      if (s.sharesAssets !== undefined) setSharesAssets(s.sharesAssets);
      if (s.otherAssets !== undefined) setOtherAssets(s.otherAssets);
      if (s.interestFreeLoanActive !== undefined) setInterestFreeLoanActive(s.interestFreeLoanActive);
      if (s.interestFreeLoanAmount !== undefined) setInterestFreeLoanAmount(s.interestFreeLoanAmount);
      if (s.interestFreeLoanRepaymentYear !== undefined) setInterestFreeLoanRepaymentYear(s.interestFreeLoanRepaymentYear);
      if (s.mortgageTermYears !== undefined) setMortgageTermYears(s.mortgageTermYears);
      if (s.interestRatePrimary !== undefined) setInterestRatePrimary(s.interestRatePrimary);
      if (s.interestRateScenarioB !== undefined) setInterestRateScenarioB(s.interestRateScenarioB);
      if (s.interestRateScenarioC !== undefined) setInterestRateScenarioC(s.interestRateScenarioC);
      if (s.monthlyExpenses !== undefined) setMonthlyExpenses(s.monthlyExpenses);
      if (s.monthlyExtraRepayment !== undefined) setMonthlyExtraRepayment(s.monthlyExtraRepayment);
      if (s.simulateFuturePurchase !== undefined) setSimulateFuturePurchase(s.simulateFuturePurchase);
      if (s.propertyInflationEnabled !== undefined) setPropertyInflationEnabled(s.propertyInflationEnabled);
      if (s.currentSimDate !== undefined) setCurrentSimDate(s.currentSimDate);
      if (s.purchaseSimDate !== undefined) setPurchaseSimDate(s.purchaseSimDate);
      if (s.monthlySavingsContribution !== undefined) setMonthlySavingsContribution(s.monthlySavingsContribution);
      if (s.savingsAnnualReturnRate !== undefined) setSavingsAnnualReturnRate(s.savingsAnnualReturnRate);
      if (s.existingPropertyValue !== undefined) setExistingPropertyValue(s.existingPropertyValue);
      if (s.existingPropertyLoan !== undefined) setExistingPropertyLoan(s.existingPropertyLoan);
      if (s.useExistingEquity !== undefined) setUseExistingEquity(s.useExistingEquity);
    }

    // 2. Restore Saved Scenarios list
    if (imported.savedScenarios) {
      setSavedScenarios(imported.savedScenarios);
    }

    // 3. Restore custom Suburbs list if present
    if (imported.suburbsList) {
      setSuburbsList(imported.suburbsList);
    }

    // 4. Restore Dynamic Tax config if present
    if (imported.dynamicTaxConfig) {
      setDynamicTaxConfig(imported.dynamicTaxConfig);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root">
      
      {/* Top Professional Brand Header */}
      <header className="border-b border-slate-900 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-sky-500 rounded-xl text-slate-950 shadow-lg shadow-emerald-500/10">
              <Landmark className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
                Property Purchase Planner
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/40 font-mono">NSW Hub</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Interactive household salary, mortgage leverage, and capital gains simulator</p>
            </div>
          </div>

          {/* Quick Metrics HUD */}
          {topMetrics.mortgageAmount > 0 && (
            <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 border border-slate-800/60 rounded-xl p-2.5 px-4 font-mono text-xs">
              <div className="border-r border-slate-800/80 pr-4">
                <span className="block text-[9px] text-slate-500 uppercase font-sans font-semibold">Net Mortgage</span>
                <span className="text-sky-400 font-bold">${topMetrics.mortgageAmount.toLocaleString()}</span>
              </div>
              <div className="border-r border-slate-800/80 pr-4">
                <span className="block text-[9px] text-slate-500 uppercase font-sans font-semibold">Accelerated Payoff</span>
                <span className="text-emerald-400 font-bold">
                  {Math.floor(topMetrics.acceleratedMonths / 12)} Yrs {topMetrics.acceleratedMonths % 12} Mo
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-sans font-semibold">Mortgage P&I</span>
                <span className="text-slate-300 font-bold">${Math.round(topMetrics.minMonthlyPayment).toLocaleString()}/mo</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex overflow-x-auto bg-slate-900/40 border border-slate-900 rounded-2xl p-1.5 scrollbar-none" id="navigation-rail">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'income'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Household Income</span>
          </button>
          
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'assets'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>2. Costs & Offset Assets</span>
          </button>
          
          <button
            onClick={() => setActiveTab('mortgage')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'mortgage'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>3. Rate Scenarios</span>
          </button>
          
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'cashflow'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>4. Payoff Simulator</span>
          </button>
          
          <button
            onClick={() => setActiveTab('growth')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'growth'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>5. Capital Growth</span>
          </button>
          
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'saved'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>6. Saved & Device Sync</span>
          </button>
        </div>

        {/* Interactive Content area with animated transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {activeTab === 'income' && (
              <SalaryCalculator
                salary1={salary1}
                salary2={salary2}
                taxYear={taxYear}
                dynamicTaxConfig={dynamicTaxConfig}
                onUpdate={(fields) => {
                  if (fields.salary1 !== undefined) setSalary1(fields.salary1);
                  if (fields.salary2 !== undefined) setSalary2(fields.salary2);
                  if (fields.taxYear !== undefined) setTaxYear(fields.taxYear);
                }}
                onSyncTaxConfig={(config) => setDynamicTaxConfig(config)}
              />
            )}

            {activeTab === 'assets' && (
              <AssetOffsetCalculator
                propertyPrice={propertyPrice}
                isFirstHomeBuyer={isFirstHomeBuyer}
                cashAssets={cashAssets}
                sharesAssets={sharesAssets}
                otherAssets={otherAssets}
                interestFreeLoanActive={interestFreeLoanActive}
                interestFreeLoanAmount={interestFreeLoanAmount}
                interestFreeLoanRepaymentYear={interestFreeLoanRepaymentYear}
                existingPropertyValue={existingPropertyValue}
                existingPropertyLoan={existingPropertyLoan}
                useExistingEquity={useExistingEquity}
                futureSimActive={simulateFuturePurchase}
                futureSimInfo={topMetrics.futureSimInfo}
                onUpdate={(fields) => {
                  if (fields.propertyPrice !== undefined) setPropertyPrice(fields.propertyPrice);
                  if (fields.isFirstHomeBuyer !== undefined) setIsFirstHomeBuyer(fields.isFirstHomeBuyer);
                  if (fields.cashAssets !== undefined) setCashAssets(fields.cashAssets);
                  if (fields.sharesAssets !== undefined) setSharesAssets(fields.sharesAssets);
                  if (fields.otherAssets !== undefined) setOtherAssets(fields.otherAssets);
                  if (fields.interestFreeLoanActive !== undefined) setInterestFreeLoanActive(fields.interestFreeLoanActive);
                  if (fields.interestFreeLoanAmount !== undefined) setInterestFreeLoanAmount(fields.interestFreeLoanAmount);
                  if (fields.interestFreeLoanRepaymentYear !== undefined) setInterestFreeLoanRepaymentYear(fields.interestFreeLoanRepaymentYear);
                  if (fields.existingPropertyValue !== undefined) setExistingPropertyValue(fields.existingPropertyValue);
                  if (fields.existingPropertyLoan !== undefined) setExistingPropertyLoan(fields.existingPropertyLoan);
                  if (fields.useExistingEquity !== undefined) setUseExistingEquity(fields.useExistingEquity);
                }}
              />
            )}

            {activeTab === 'mortgage' && (
              <MortgageRateComparison
                mortgageAmount={topMetrics.mortgageAmount}
                mortgageTermYears={mortgageTermYears}
                interestRatePrimary={interestRatePrimary}
                interestRateScenarioB={interestRateScenarioB}
                interestRateScenarioC={interestRateScenarioC}
                onUpdate={(fields) => {
                  if (fields.mortgageTermYears !== undefined) setMortgageTermYears(fields.mortgageTermYears);
                  if (fields.interestRatePrimary !== undefined) setInterestRatePrimary(fields.interestRatePrimary);
                  if (fields.interestRateScenarioB !== undefined) setInterestRateScenarioB(fields.interestRateScenarioB);
                  if (fields.interestRateScenarioC !== undefined) setInterestRateScenarioC(fields.interestRateScenarioC);
                }}
              />
            )}

            {activeTab === 'cashflow' && (
              <div className="space-y-6">
                <FutureSimulationSettings
                  propertyPrice={propertyPrice}
                  customGrowthRate={customGrowthRate}
                  isFirstHomeBuyer={isFirstHomeBuyer}
                  cashAssets={cashAssets}
                  sharesAssets={sharesAssets}
                  otherAssets={otherAssets}
                  interestFreeLoanActive={interestFreeLoanActive}
                  interestFreeLoanAmount={interestFreeLoanAmount}
                  householdMonthlyNetIncome={topMetrics.combinedNetMonthly}
                  monthlyExpenses={monthlyExpenses}
                  simulateFuturePurchase={simulateFuturePurchase}
                  propertyInflationEnabled={propertyInflationEnabled}
                  currentSimDate={currentSimDate}
                  purchaseSimDate={purchaseSimDate}
                  monthlySavingsContribution={monthlySavingsContribution}
                  savingsAnnualReturnRate={savingsAnnualReturnRate}
                  onUpdate={(fields) => {
                    if (fields.simulateFuturePurchase !== undefined) setSimulateFuturePurchase(fields.simulateFuturePurchase);
                    if (fields.propertyInflationEnabled !== undefined) setPropertyInflationEnabled(fields.propertyInflationEnabled);
                    if (fields.currentSimDate !== undefined) setCurrentSimDate(fields.currentSimDate);
                    if (fields.purchaseSimDate !== undefined) setPurchaseSimDate(fields.purchaseSimDate);
                    if (fields.monthlySavingsContribution !== undefined) setMonthlySavingsContribution(fields.monthlySavingsContribution);
                    if (fields.savingsAnnualReturnRate !== undefined) setSavingsAnnualReturnRate(fields.savingsAnnualReturnRate);
                  }}
                />
                <CashflowPayoffSimulator
                  householdMonthlyNetIncome={topMetrics.combinedNetMonthly}
                  mortgageAmount={topMetrics.mortgageAmount}
                  interestRatePrimary={interestRatePrimary}
                  mortgageTermYears={mortgageTermYears}
                  interestFreeLoanActive={interestFreeLoanActive}
                  interestFreeLoanAmount={interestFreeLoanAmount}
                  interestFreeLoanRepaymentYear={interestFreeLoanRepaymentYear}
                  monthlyExpenses={monthlyExpenses}
                  monthlyExtraRepayment={monthlyExtraRepayment}
                  
                  propertyPrice={simulateFuturePurchase ? topMetrics.finalPropertyPrice : propertyPrice}
                  isFirstHomeBuyer={isFirstHomeBuyer}
                  cashAssets={simulateFuturePurchase ? topMetrics.finalTotalOffsetAssets : cashAssets}
                  sharesAssets={simulateFuturePurchase ? 0 : sharesAssets}
                  otherAssets={simulateFuturePurchase ? 0 : otherAssets}
                  existingPropertyValue={simulateFuturePurchase ? 0 : existingPropertyValue}
                  existingPropertyLoan={simulateFuturePurchase ? 0 : existingPropertyLoan}
                  useExistingEquity={simulateFuturePurchase ? false : useExistingEquity}

                  onUpdate={(fields) => {
                    if (fields.monthlyExpenses !== undefined) setMonthlyExpenses(fields.monthlyExpenses);
                    if (fields.monthlyExtraRepayment !== undefined) setMonthlyExtraRepayment(fields.monthlyExtraRepayment);
                  }}
                />
              </div>
            )}

            {activeTab === 'growth' && (
              <SuburbGrowthVisualizer
                propertyPrice={simulateFuturePurchase && topMetrics.finalPropertyPrice ? topMetrics.finalPropertyPrice : propertyPrice}
                mortgageAmount={topMetrics.mortgageAmount}
                interestRatePrimary={interestRatePrimary}
                mortgageTermYears={mortgageTermYears}
                monthlyExpenses={monthlyExpenses}
                monthlyExtraRepayment={monthlyExtraRepayment}
                interestFreeLoanActive={interestFreeLoanActive}
                interestFreeLoanAmount={interestFreeLoanAmount}
                interestFreeLoanRepaymentYear={interestFreeLoanRepaymentYear}
                householdMonthlyNetIncome={topMetrics.combinedNetMonthly}
                suburb={suburb}
                customGrowthRate={customGrowthRate}
                suburbsList={suburbsList}
                onUpdate={(fields) => {
                  if (fields.suburb !== undefined) setSuburb(fields.suburb);
                  if (fields.customGrowthRate !== undefined) setCustomGrowthRate(fields.customGrowthRate);
                }}
                onAddSuburb={(newSub) => setSuburbsList((prev) => [...prev, newSub])}
              />
            )}

            {activeTab === 'saved' && (
              <div className="space-y-6">
                <SavedScenarios
                  currentScenario={{
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
                    currentSimDate,
                    purchaseSimDate,
                    monthlySavingsContribution,
                    savingsAnnualReturnRate
                  }}
                  savedScenarios={savedScenarios}
                  onSave={handleSaveScenario}
                  onLoad={handleLoadScenario}
                  onDelete={handleDeleteScenario}
                />
                <SettingsSync
                  currentInputs={{
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
                    existingPropertyValue,
                    existingPropertyLoan,
                    useExistingEquity
                  }}
                  savedScenarios={savedScenarios}
                  suburbsList={suburbsList}
                  dynamicTaxConfig={dynamicTaxConfig}
                  onImport={handleImportSettings}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Live Master Viability Card - permanently rendered below active workspace */}
        {propertyPrice > 0 && (
          <FinancialSummary
            grossHouseholdIncome={salary1 + salary2}
            netHouseholdIncomeMonthly={topMetrics.combinedNetMonthly}
            mortgageAmount={topMetrics.mortgageAmount}
            interestRatePrimary={interestRatePrimary}
            mortgageTermYears={mortgageTermYears}
            monthlyExpenses={monthlyExpenses}
            monthlyExtraRepayment={monthlyExtraRepayment}
            interestFreeLoanActive={interestFreeLoanActive}
            interestFreeLoanAmount={interestFreeLoanAmount}
            interestFreeLoanRepaymentYear={interestFreeLoanRepaymentYear}
          />
        )}

      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-center text-[10px] text-slate-500 font-medium">
        <p>© 2026 Property Purchase Dashboard. Formulated under recent NSW stamp duty and Australian individual tax guidelines.</p>
      </footer>

    </div>
  );
}
