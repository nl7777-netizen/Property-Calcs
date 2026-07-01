/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark, Activity, Settings, Sparkles, HelpCircle, FileText, Scale
} from 'lucide-react';

import { FinancialScenario, TaxYear, DynamicTaxConfig, SuburbData } from './types';
import {
  calculateNSWIncomeTax,
  calculateNSWStampDuty,
  simulateMortgagePayoff,
  NSW_SUBURBS,
  calculateFuturePurchaseSimulation
} from './utils/finance';

import HomeDashboard from './components/HomeDashboard';
import SettingsPanel from './components/SettingsPanel';
import PropertyExitPlanner from './components/PropertyExitPlanner';

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

  // Primary input states persisted via localStorage memory
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

  // Dynamic Scraped settings from express backend
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

  const [simulateFuturePurchase, setSimulateFuturePurchase] = useState(() => getSavedInput('simulateFuturePurchase', false));
  const [propertyInflationEnabled, setPropertyInflationEnabled] = useState(() => getSavedInput('propertyInflationEnabled', false));
  const [currentSimDate, setCurrentSimDate] = useState(() => getSavedInput('currentSimDate', '2026-06'));
  const [purchaseSimDate, setPurchaseSimDate] = useState(() => getSavedInput('purchaseSimDate', '2028-06'));
  const [monthlySavingsContribution, setMonthlySavingsContribution] = useState(() => getSavedInput('monthlySavingsContribution', 2500));
  const [savingsAnnualReturnRate, setSavingsAnnualReturnRate] = useState(() => getSavedInput('savingsAnnualReturnRate', 5.0));

  // Simplified Active tab: 'home' for Output, 'settings' for Input configuration, 'exit-planner' for Exit/Sale decision
  const [activeTab, setActiveTab] = useState<'home' | 'settings' | 'exit-planner'>('home');

  // Persistence triggers
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

  // Unified active inputs memory saving
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

  // HUD Top metrics memoization
  const topMetrics = useMemo(() => {
    if (propertyPrice <= 0) return { mortgageAmount: 0, acceleratedMonths: 0, minMonthlyPayment: 0 };
    
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
      monthlyExtraRepayment,
      interestFreeLoanActive,
      interestFreeLoanAmount,
      interestFreeLoanRepaymentYear,
      combinedNetMonthly
    );

    return {
      mortgageAmount,
      acceleratedMonths: simulation.monthsToPayoffAccelerated,
      minMonthlyPayment: simulation.standardMonthlyPayment
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

  // Setters for multiple inputs
  const handleUpdateFields = (fields: any) => {
    if (fields.propertyPrice !== undefined) setPropertyPrice(fields.propertyPrice);
    if (fields.isFirstHomeBuyer !== undefined) setIsFirstHomeBuyer(fields.isFirstHomeBuyer);
    if (fields.suburb !== undefined) setSuburb(fields.suburb);
    if (fields.customGrowthRate !== undefined) setCustomGrowthRate(fields.customGrowthRate);
    
    if (fields.salary1 !== undefined) setSalary1(fields.salary1);
    if (fields.salary2 !== undefined) setSalary2(fields.salary2);
    if (fields.taxYear !== undefined) setTaxYear(fields.taxYear);

    if (fields.cashAssets !== undefined) setCashAssets(fields.cashAssets);
    if (fields.sharesAssets !== undefined) setSharesAssets(fields.sharesAssets);
    if (fields.otherAssets !== undefined) setOtherAssets(fields.otherAssets);

    if (fields.interestFreeLoanActive !== undefined) setInterestFreeLoanActive(fields.interestFreeLoanActive);
    if (fields.interestFreeLoanAmount !== undefined) setInterestFreeLoanAmount(fields.interestFreeLoanAmount);
    if (fields.interestFreeLoanRepaymentYear !== undefined) setInterestFreeLoanRepaymentYear(fields.interestFreeLoanRepaymentYear);

    if (fields.mortgageTermYears !== undefined) setMortgageTermYears(fields.mortgageTermYears);
    if (fields.interestRatePrimary !== undefined) setInterestRatePrimary(fields.interestRatePrimary);
    if (fields.interestRateScenarioB !== undefined) setInterestRateScenarioB(fields.interestRateScenarioB);
    if (fields.interestRateScenarioC !== undefined) setInterestRateScenarioC(fields.interestRateScenarioC);

    if (fields.monthlyExpenses !== undefined) setMonthlyExpenses(fields.monthlyExpenses);
    if (fields.monthlyExtraRepayment !== undefined) setMonthlyExtraRepayment(fields.monthlyExtraRepayment);

    if (fields.existingPropertyValue !== undefined) setExistingPropertyValue(fields.existingPropertyValue);
    if (fields.existingPropertyLoan !== undefined) setExistingPropertyLoan(fields.existingPropertyLoan);
    if (fields.useExistingEquity !== undefined) setUseExistingEquity(fields.useExistingEquity);

    if (fields.simulateFuturePurchase !== undefined) setSimulateFuturePurchase(fields.simulateFuturePurchase);
    if (fields.propertyInflationEnabled !== undefined) setPropertyInflationEnabled(fields.propertyInflationEnabled);
    if (fields.currentSimDate !== undefined) setCurrentSimDate(fields.currentSimDate);
    if (fields.purchaseSimDate !== undefined) setPurchaseSimDate(fields.purchaseSimDate);
    if (fields.monthlySavingsContribution !== undefined) setMonthlySavingsContribution(fields.monthlySavingsContribution);
    if (fields.savingsAnnualReturnRate !== undefined) setSavingsAnnualReturnRate(fields.savingsAnnualReturnRate);
  };

  // Profile save
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

  // Profile Load
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
    setInterestRateScenarioB(s.interestRateScenarioB ?? 5.2);
    setInterestRateScenarioC(s.interestRateScenarioC ?? 7.0);
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
    
    // Auto-return to home screen to review the loaded metrics
    setActiveTab('home');
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(savedScenarios.filter(x => x.id !== id));
  };

  const handleImportSettings = (imported: any) => {
    if (imported.activeInputs) {
      handleUpdateFields(imported.activeInputs);
    }
    if (imported.savedScenarios) {
      setSavedScenarios(imported.savedScenarios);
    }
    if (imported.suburbsList) {
      setSuburbsList(imported.suburbsList);
    }
    if (imported.dynamicTaxConfig) {
      setDynamicTaxConfig(imported.dynamicTaxConfig);
    }
    
    // Auto-return to home output dashboard
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root">
      
      {/* Brand Header */}
      <header className="border-b border-slate-900 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-sky-500 rounded-xl text-slate-950 shadow-lg shadow-emerald-500/10">
              <Landmark className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
                Property Purchase Planner
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/40 font-mono">NSW Hub</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Interactive household salary, mortgage leverage, and capital gains simulator</p>
            </div>
          </div>

          {/* Quick HUD Metrics displayed permanently */}
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

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Simple Page-Switcher Tabs */}
        <div className="flex bg-slate-900/40 border border-slate-900 rounded-2xl p-1.5 max-w-xl" id="navigation-rail">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Home (Outputs & Analysis)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Planner Settings (Inputs)</span>
          </button>

          <button
            onClick={() => setActiveTab('exit-planner')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'exit-planner'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Property Exit Planner</span>
          </button>
        </div>

        {/* Dynamic Transition Canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {activeTab === 'home' ? (
              <HomeDashboard
                propertyPrice={propertyPrice}
                isFirstHomeBuyer={isFirstHomeBuyer}
                suburb={suburb}
                customGrowthRate={customGrowthRate}
                salary1={salary1}
                salary2={salary2}
                taxYear={taxYear}
                cashAssets={cashAssets}
                sharesAssets={sharesAssets}
                otherAssets={otherAssets}
                interestFreeLoanActive={interestFreeLoanActive}
                interestFreeLoanAmount={interestFreeLoanAmount}
                interestFreeLoanRepaymentYear={interestFreeLoanRepaymentYear}
                mortgageTermYears={mortgageTermYears}
                interestRatePrimary={interestRatePrimary}
                interestRateScenarioB={interestRateScenarioB}
                interestRateScenarioC={interestRateScenarioC}
                monthlyExpenses={monthlyExpenses}
                monthlyExtraRepayment={monthlyExtraRepayment}
                existingPropertyValue={existingPropertyValue}
                existingPropertyLoan={existingPropertyLoan}
                useExistingEquity={useExistingEquity}
                simulateFuturePurchase={simulateFuturePurchase}
                propertyInflationEnabled={propertyInflationEnabled}
                currentSimDate={currentSimDate}
                purchaseSimDate={purchaseSimDate}
                monthlySavingsContribution={monthlySavingsContribution}
                savingsAnnualReturnRate={savingsAnnualReturnRate}
                dynamicTaxConfig={dynamicTaxConfig}
                suburbsList={suburbsList}
                onUpdate={handleUpdateFields}
                onNavigateToSettings={() => setActiveTab('settings')}
              />
            ) : activeTab === 'settings' ? (
              <SettingsPanel
                propertyPrice={propertyPrice}
                isFirstHomeBuyer={isFirstHomeBuyer}
                suburb={suburb}
                customGrowthRate={customGrowthRate}
                salary1={salary1}
                salary2={salary2}
                taxYear={taxYear}
                cashAssets={cashAssets}
                sharesAssets={sharesAssets}
                otherAssets={otherAssets}
                existingPropertyValue={existingPropertyValue}
                existingPropertyLoan={existingPropertyLoan}
                useExistingEquity={useExistingEquity}
                interestFreeLoanActive={interestFreeLoanActive}
                interestFreeLoanAmount={interestFreeLoanAmount}
                interestFreeLoanRepaymentYear={interestFreeLoanRepaymentYear}
                mortgageTermYears={mortgageTermYears}
                interestRatePrimary={interestRatePrimary}
                interestRateScenarioB={interestRateScenarioB}
                interestRateScenarioC={interestRateScenarioC}
                monthlyExpenses={monthlyExpenses}
                monthlyExtraRepayment={monthlyExtraRepayment}
                simulateFuturePurchase={simulateFuturePurchase}
                propertyInflationEnabled={propertyInflationEnabled}
                currentSimDate={currentSimDate}
                purchaseSimDate={purchaseSimDate}
                monthlySavingsContribution={monthlySavingsContribution}
                savingsAnnualReturnRate={savingsAnnualReturnRate}
                dynamicTaxConfig={dynamicTaxConfig}
                suburbsList={suburbsList}
                savedScenarios={savedScenarios}
                onUpdate={handleUpdateFields}
                onSyncTaxConfig={(config) => setDynamicTaxConfig(config)}
                onAddSuburb={(newSub) => setSuburbsList((prev) => [...prev, newSub])}
                onSaveScenario={handleSaveScenario}
                onLoadScenario={handleLoadScenario}
                onDeleteScenario={handleDeleteScenario}
                onImportSettings={handleImportSettings}
              />
            ) : (
              <PropertyExitPlanner
                salary1={salary1}
                salary2={salary2}
                taxYear={taxYear}
                dynamicTaxConfig={dynamicTaxConfig}
                defaultPropertyValue={existingPropertyValue}
                defaultPropertyLoan={existingPropertyLoan}
                monthlyExpenses={monthlyExpenses}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-center text-[10px] text-slate-500 font-medium">
        <p>© 2026 Property Purchase Dashboard. Formulated under recent NSW stamp duty and Australian individual tax guidelines.</p>
      </footer>

    </div>
  );
}
