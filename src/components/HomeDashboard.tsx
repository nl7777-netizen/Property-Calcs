/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, ShieldCheck, AlertCircle, AlertTriangle, Coins, TrendingUp,
  MapPin, Home, Landmark, Calculator, ArrowRight, ShieldAlert,
  Sparkles, Calendar, DollarSign, Wallet, Percent, Timer, HelpCircle,
  FileText, ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { FinancialScenario, TaxYear, DynamicTaxConfig, SuburbData, GrowthProjectionPoint } from '../types';
import {
  calculateNSWIncomeTax,
  calculateNSWStampDuty,
  simulateMortgagePayoff,
  projectPropertyGrowth,
  calculateFuturePurchaseSimulation
} from '../utils/finance';

interface HomeDashboardProps {
  propertyPrice: number;
  isFirstHomeBuyer: boolean;
  suburb: string;
  customGrowthRate: number;
  salary1: number;
  salary2: number;
  taxYear: TaxYear;
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;
  mortgageTermYears: number;
  interestRatePrimary: number;
  interestRateScenarioB: number;
  interestRateScenarioC: number;
  monthlyExpenses: number;
  monthlyExtraRepayment: number;
  existingPropertyValue: number;
  existingPropertyLoan: number;
  useExistingEquity: boolean;
  simulateFuturePurchase: boolean;
  propertyInflationEnabled: boolean;
  currentSimDate: string;
  purchaseSimDate: string;
  monthlySavingsContribution: number;
  savingsAnnualReturnRate: number;
  dynamicTaxConfig?: DynamicTaxConfig;
  suburbsList: SuburbData[];
  onUpdate?: (fields: any) => void;
  onNavigateToSettings: () => void;
}

export default function HomeDashboard({
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
  existingPropertyValue,
  existingPropertyLoan,
  useExistingEquity,
  simulateFuturePurchase,
  propertyInflationEnabled,
  currentSimDate,
  purchaseSimDate,
  monthlySavingsContribution,
  savingsAnnualReturnRate,
  dynamicTaxConfig,
  suburbsList,
  onUpdate,
  onNavigateToSettings
}: HomeDashboardProps) {
  const [chartTab, setChartTab] = useState<'chart' | 'table'>('chart');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // --- COMPREHENSIVE MATHS & LOGIC ON THE RECALCULATED INPUTS ---
  const calculatedValues = useMemo(() => {
    // Existing equity calculations
    const existingEquity = useExistingEquity ? Math.max(0, existingPropertyValue - existingPropertyLoan) : 0;

    // Current baseline metrics (without future timeline changes)
    const currentPropertyPrice = propertyPrice;
    const currentStampDuty = calculateNSWStampDuty(propertyPrice, isFirstHomeBuyer);
    const conveyancingFees = 2000;
    const currentTotalCosts = currentPropertyPrice + currentStampDuty + conveyancingFees;
    const currentTotalOffsetAssets = cashAssets + sharesAssets + otherAssets + existingEquity;
    const currentRequiredMortgage = Math.max(0, currentTotalCosts - currentTotalOffsetAssets - (interestFreeLoanActive ? interestFreeLoanAmount : 0));
    const currentDepositPercent = currentPropertyPrice > 0 ? (currentTotalOffsetAssets / currentPropertyPrice) * 100 : 0;
    const currentLmiApplicable = currentRequiredMortgage > 0 && currentDepositPercent < 20;

    let finalPropertyPrice = propertyPrice;
    let finalStampDuty = currentStampDuty;
    
    let finalTotalOffsetAssets = currentTotalOffsetAssets;
    
    let futureSimInfo = null;
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
      futureSimInfo = sim;
    }

    const totalCosts = finalPropertyPrice + finalStampDuty + conveyancingFees;
    const appliedInterestFreeLoan = interestFreeLoanActive ? interestFreeLoanAmount : 0;
    const mortgageAmount = Math.max(0, totalCosts - finalTotalOffsetAssets - appliedInterestFreeLoan);

    // After-tax household income
    const tax1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const tax2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    const combinedNetAnnual = tax1.netPay + tax2.netPay;
    const combinedNetMonthly = combinedNetAnnual / 12;

    // Standard vs Accelerated payoff simulation
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

    // Minimum mortgage payment
    const minMortgagePayment = simulation.standardMonthlyPayment;
    const monthlyIFLRepayment = interestFreeLoanActive ? (interestFreeLoanRepaymentYear / 12) : 0;
    const leftoverCashflow = Math.max(0, combinedNetMonthly - monthlyExpenses - minMortgagePayment - monthlyIFLRepayment);

    // Debt to Income (DTI)
    const dti = (salary1 + salary2) > 0 ? (mortgageAmount / (salary1 + salary2)) : 0;
    let dtiRating = 'Excellent';
    let dtiColor = 'text-emerald-400 border-emerald-950 bg-emerald-950/20';
    if (dti >= 6) {
      dtiRating = 'High Risk';
      dtiColor = 'text-rose-400 border-rose-950 bg-rose-950/20';
    } else if (dti >= 4.5) {
      dtiRating = 'Tight Leverage';
      dtiColor = 'text-amber-400 border-amber-950 bg-amber-950/20';
    }

    // Debt Service Ratio (Stress ratio)
    const debtServiceRatio = combinedNetMonthly > 0 ? (minMortgagePayment / combinedNetMonthly) * 100 : 0;
    let dsRating = 'Comfortable';
    let dsColor = 'text-emerald-400 border-emerald-950 bg-emerald-950/20';
    if (debtServiceRatio >= 45) {
      dsRating = 'Mortgage Stress';
      dsColor = 'text-rose-400 border-rose-950 bg-rose-950/20';
    } else if (debtServiceRatio >= 30) {
      dsRating = 'Moderate Stress';
      dsColor = 'text-amber-400 border-amber-950 bg-amber-950/20';
    }

    // Overall Viability Rating
    let viabilityScore = 'Secure';
    let viabilityDescription = 'Your financials are stable. You have a robust surplus buffer and your debt ratios are within standard banking safety metrics. You are well-positioned to complete this purchase!';
    let viabilityTheme = 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400';
    let IconComponent = ShieldCheck;

    if (mortgageAmount > 0 && (dti >= 6 || debtServiceRatio >= 45 || leftoverCashflow < 500)) {
      viabilityScore = 'High Risk Warning';
      viabilityDescription = 'Your budget is highly leveraged. A minor interest rate increase or income fluctuation could cause major mortgage stress. Consider lowering your property purchase target, cutting living costs, or boosting your deposit.';
      viabilityTheme = 'border-rose-500/20 bg-rose-950/10 text-rose-400';
      IconComponent = AlertTriangle;
    } else if (mortgageAmount > 0 && (dti >= 4.5 || debtServiceRatio >= 35 || leftoverCashflow < 1200)) {
      viabilityScore = 'Caution / Tight';
      viabilityDescription = 'Your purchase is viable but budget constraints are tight. You have modest unallocated cashflow. Try avoiding unnecessary consumer debt, and allocate standard surplus to emergency buffers.';
      viabilityTheme = 'border-amber-500/20 bg-amber-950/10 text-amber-400';
      IconComponent = AlertCircle;
    }

    // Suburb growth calculation
    const growthProjections = projectPropertyGrowth(
      finalPropertyPrice,
      customGrowthRate,
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

    // Selected suburb metadata
    const selectedSuburbObj = suburbsList.find(s => s.name.toLowerCase() === suburb.toLowerCase()) || {
      name: suburb,
      region: 'NSW Region',
      medianHousePrice: 1200000,
      historicalGrowthRate: customGrowthRate
    };

    // Deposit ratio
    const depositPercent = finalPropertyPrice > 0 ? (finalTotalOffsetAssets / finalPropertyPrice) * 100 : 0;
    const lmiApplicable = mortgageAmount > 0 && depositPercent < 20;

    return {
      finalPropertyPrice,
      finalStampDuty,
      conveyancingFees,
      totalCosts,
      finalTotalOffsetAssets,
      appliedInterestFreeLoan,
      mortgageAmount,
      currentPropertyPrice,
      currentStampDuty,
      currentTotalCosts,
      currentTotalOffsetAssets,
      currentRequiredMortgage,
      currentDepositPercent,
      currentLmiApplicable,
      tax1,
      tax2,
      combinedNetAnnual,
      combinedNetMonthly,
      simulation,
      leftoverCashflow,
      dti,
      dtiRating,
      dtiColor,
      debtServiceRatio,
      dsRating,
      dsColor,
      viabilityScore,
      viabilityDescription,
      viabilityTheme,
      IconComponent,
      growthProjections,
      selectedSuburbObj,
      depositPercent,
      lmiApplicable,
      futureSimInfo,
      existingEquity,
      monthlyIFLRepayment
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
    useExistingEquity,
    suburb,
    suburbsList
  ]);

  const {
    finalPropertyPrice,
    finalStampDuty,
    conveyancingFees,
    totalCosts,
    finalTotalOffsetAssets,
    appliedInterestFreeLoan,
    mortgageAmount,
    currentPropertyPrice,
    currentStampDuty,
    currentTotalCosts,
    currentTotalOffsetAssets,
    currentRequiredMortgage,
    currentDepositPercent,
    currentLmiApplicable,
    tax1,
    tax2,
    combinedNetAnnual,
    combinedNetMonthly,
    simulation,
    leftoverCashflow,
    dti,
    dtiRating,
    dtiColor,
    debtServiceRatio,
    dsRating,
    dsColor,
    viabilityScore,
    viabilityDescription,
    viabilityTheme,
    IconComponent,
    growthProjections,
    selectedSuburbObj,
    depositPercent,
    lmiApplicable,
    futureSimInfo,
    existingEquity,
    monthlyIFLRepayment
  } = calculatedValues;

  // --- SENSITIVITY CALCS ---
  const interestSensitivity = useMemo(() => {
    if (mortgageAmount <= 0) return [];
    
    const rates = [
      { key: 'Scenario B (Low)', rate: interestRateScenarioB },
      { key: 'Scenario A (Primary)', rate: interestRatePrimary },
      { key: 'Scenario C (High)', rate: interestRateScenarioC }
    ];

    return rates.map(rObj => {
      const sim = simulateMortgagePayoff(
        mortgageAmount,
        rObj.rate,
        mortgageTermYears,
        monthlyExpenses,
        monthlyExtraRepayment,
        interestFreeLoanActive,
        interestFreeLoanAmount,
        interestFreeLoanRepaymentYear,
        combinedNetMonthly
      );
      
      const primarySim = simulateMortgagePayoff(
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

      const interestDiff = sim.totalInterestStandard - primarySim.totalInterestStandard;

      return {
        label: rObj.key,
        rate: rObj.rate,
        monthlyPayment: sim.standardMonthlyPayment,
        totalInterest: sim.totalInterestStandard,
        acceleratedPayoffMonths: sim.monthsToPayoffAccelerated,
        interestDiff
      };
    });
  }, [
    mortgageAmount,
    interestRateScenarioB,
    interestRatePrimary,
    interestRateScenarioC,
    mortgageTermYears,
    monthlyExpenses,
    monthlyExtraRepayment,
    interestFreeLoanActive,
    interestFreeLoanAmount,
    interestFreeLoanRepaymentYear,
    combinedNetMonthly
  ]);

  // --- SVG GROWTH GRAPH PLOTTING ---
  const chartWidth = 600;
  const chartHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const drawableWidth = chartWidth - paddingLeft - paddingRight;
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    if (growthProjections.length === 0) return 1000000;
    const max = Math.max(...growthProjections.map(d => d.propertyValue));
    return max * 1.05;
  }, [growthProjections]);

  const getCoords = (year: number, val: number) => {
    const x = paddingLeft + (year / 30) * drawableWidth;
    const y = paddingTop + drawableHeight - (val / maxVal) * drawableHeight;
    return { x, y };
  };

  const getSvgPath = (key: 'propertyValue' | 'mortgageBalanceStandard' | 'mortgageBalanceAccelerated') => {
    if (growthProjections.length === 0) return '';
    return growthProjections
      .map((d, idx) => {
        const { x, y } = getCoords(d.year, d[key]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || growthProjections.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * chartWidth;
    const drawableX = svgX - paddingLeft;
    const percentage = drawableX / drawableWidth;
    const yearFloat = percentage * 30;
    const yearInt = Math.max(0, Math.min(30, Math.round(yearFloat)));
    setHoveredPointIndex(yearInt);
  };

  const activePoint = hoveredPointIndex !== null ? growthProjections[hoveredPointIndex] : null;

  return (
    <div className="space-y-6" id="home-dashboard-view">
      
      {/* 1. MASTER VIABILITY HERO OVERVIEW */}
      {propertyPrice <= 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center" id="empty-state-welcome">
          <Landmark className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-200">Welcome to Your Property Purchase Planner</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            Please navigate to the <span className="text-emerald-400 font-bold cursor-pointer underline hover:text-emerald-300" onClick={onNavigateToSettings}>Planner Settings</span> page to enter your household salaries, savings, property price, and other variables to generate your real-time viability score.
          </p>
          <button
            onClick={onNavigateToSettings}
            className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
          >
            <span>Configure Variables</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Main Viability Alert Banner */}
          <div className="bg-slate-950/45 border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="viability-overview-panel">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row gap-5 items-start">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-indigo-400 shadow-md">
                <Activity className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-100">Financial Viability Assessment</h2>
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${viabilityTheme}`}>
                    {viabilityScore}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Calculated using standard APRA stress standards, household debt ratios, and historical Sydney indices.
                </p>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/30 border border-slate-900/60 rounded-xl p-4 mt-3">
                  {viabilityDescription}
                </p>
              </div>
              <button
                onClick={onNavigateToSettings}
                className="text-[11px] text-emerald-400 font-semibold border border-emerald-950 bg-emerald-950/20 px-3 py-1.5 rounded-lg hover:bg-emerald-950/40 hover:text-emerald-300 transition-all shrink-0 cursor-pointer self-start flex items-center gap-1"
                title="Change numbers"
              >
                <span>Edit Variables</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Three Master KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              
              {/* Debt-To-Income (DTI) */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-2.5">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Debt-To-Income (DTI)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-100 font-mono">{dti.toFixed(1)}x</span>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${dtiColor}`}>
                    {dtiRating}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Mortgage balance relative to gross annual salary. Major banks flag higher risk ratios at <strong className="text-slate-300 font-mono">6.0x</strong>.
                </p>
              </div>

              {/* Debt Service Ratio (Stress ratio) */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-2.5">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Repayment Stress Ratio</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-100 font-mono">{debtServiceRatio.toFixed(1)}%</span>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${dsColor}`}>
                    {dsRating}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Minimum monthly principal & interest mortgage payments relative to combined net take-home salary. APRA ceiling guideline is <strong className="text-slate-300 font-mono">30%</strong>.
                </p>
              </div>

              {/* Net Surplus Cushion */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-2.5">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Monthly Surplus Cushion</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-100 font-mono">${Math.round(leftoverCashflow).toLocaleString()}</span>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
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
                  Unallocated monthly cash after mortgage payments, utility bills, living costs, and interest-free loan repayments. Crucial buffer!
                </p>
                {onUpdate && leftoverCashflow > 0 && monthlyExtraRepayment < Math.round(leftoverCashflow) && (
                  <button
                    onClick={() => onUpdate({ monthlyExtraRepayment: Math.round(leftoverCashflow) })}
                    className="w-full mt-1.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Apply Entire Surplus (${Math.round(leftoverCashflow).toLocaleString()}) as Extra Repayments
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* 2. MAIN REPORT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1: PURCHASE COSTS AND FUNDING ANALYSIS */}
            <div className="bg-slate-950/45 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6" id="acquisition-funding-panel">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    <Coins className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-sans">NSW Purchase Costs & Funding</h3>
                    <p className="text-[10px] text-slate-400">
                      {simulateFuturePurchase 
                        ? 'Side-by-side analysis: Current purchase vs Future simulated purchase' 
                        : 'Acquisition budget and initial deposit offsets'
                      }
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                  {isFirstHomeBuyer ? 'First Home Buyer (FHBAS)' : 'Standard NSW buyer'}
                </span>
              </div>

              {simulateFuturePurchase && (
                <div className="p-2.5 bg-indigo-950/15 border border-indigo-900/45 rounded-xl flex items-center justify-between text-[11px] text-indigo-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>
                      Future simulation is <strong>active</strong> for <strong className="text-indigo-200 font-mono">{purchaseSimDate}</strong> ({futureSimInfo?.monthsDiff} months away).
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Costs side */}
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline border-b border-slate-900/60 pb-1.5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acquisition Costs</h4>
                    {simulateFuturePurchase && (
                      <span className="text-[9px] text-indigo-400 font-bold font-mono">Current vs Future</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    {simulateFuturePurchase && futureSimInfo ? (
                      <>
                        <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                          <span className="col-span-5 text-slate-400">Property Price</span>
                          <span className="col-span-3 text-right text-slate-400 font-mono">${currentPropertyPrice.toLocaleString()}</span>
                          <span className="col-span-4 text-right font-bold text-indigo-300 font-mono">${futureSimInfo.futurePropertyPrice.toLocaleString()}</span>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                          <span className="col-span-5 text-slate-400 flex flex-wrap items-center gap-1">
                            NSW Stamp Duty
                          </span>
                          <span className="col-span-3 text-right text-slate-400 font-mono">
                            {currentStampDuty === 0 ? <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded">Exempt</span> : `$${currentStampDuty.toLocaleString()}`}
                          </span>
                          <span className="col-span-4 text-right font-bold text-indigo-300 font-mono">
                            {futureSimInfo.futureStampDuty === 0 ? <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded">Exempt</span> : `$${futureSimInfo.futureStampDuty.toLocaleString()}`}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                          <span className="col-span-5 text-slate-400">Conveyancing</span>
                          <span className="col-span-3 text-right text-slate-400 font-mono">$2,000</span>
                          <span className="col-span-4 text-right font-bold text-indigo-300 font-mono">$2,000</span>
                        </div>

                        <div className="grid grid-cols-12 gap-1.5 py-2.5 bg-slate-900/30 rounded-lg px-2 border border-slate-900 font-sans mt-2">
                          <span className="col-span-5 text-slate-300 font-bold">Total Capital</span>
                          <span className="col-span-3 text-right text-slate-400 font-bold font-mono">${currentTotalCosts.toLocaleString()}</span>
                          <span className="col-span-4 text-right text-indigo-200 font-extrabold font-mono text-[13px]">${futureSimInfo.futureTotalCosts.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center py-1 border-b border-slate-900">
                          <span className="text-slate-400">Property Price</span>
                          <span className="font-semibold text-slate-200 font-mono">${currentPropertyPrice.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-1 border-b border-slate-900">
                          <span className="text-slate-400 flex items-center gap-1">
                            NSW Stamp Duty
                            {currentStampDuty === 0 && <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded">Exempt</span>}
                          </span>
                          <span className="font-semibold text-slate-200 font-mono">${currentStampDuty.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-1 border-b border-slate-900">
                          <span className="text-slate-400">Conveyancing Fees</span>
                          <span className="font-semibold text-slate-200 font-mono">$2,000</span>
                        </div>

                        <div className="flex justify-between items-center py-2.5 bg-slate-900/30 rounded-lg px-2.5 border border-slate-900">
                          <span className="text-slate-300 font-bold">Total Capital Required</span>
                          <span className="text-slate-100 font-extrabold font-mono text-sm">${currentTotalCosts.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Funding Side */}
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline border-b border-slate-900/60 pb-1.5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deposit & Offsets</h4>
                    {simulateFuturePurchase && (
                      <span className="text-[9px] text-emerald-400 font-bold font-mono">Current vs Future</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    {simulateFuturePurchase && futureSimInfo ? (
                      <>
                        <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                          <span className="col-span-5 text-slate-400">Initial Asset Pool</span>
                          <span className="col-span-3 text-right text-slate-400 font-mono">${(cashAssets + sharesAssets + otherAssets).toLocaleString()}</span>
                          <span className="col-span-4 text-right text-slate-400 font-mono">-</span>
                        </div>

                        <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                          <span className="col-span-5 text-slate-400">Monthly Savings Added</span>
                          <span className="col-span-3 text-right text-slate-400 font-mono">-</span>
                          <span className="col-span-4 text-right font-bold text-emerald-400 font-mono">+${futureSimInfo.additionalSavingsFromContributions.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                          <div className="col-span-5">
                            <span className="text-slate-400">Compounded Growth</span>
                            {futureSimInfo.taxRateUsed !== undefined && (
                              <span className="block text-[9px] text-slate-500 font-normal">
                                After {Math.round(futureSimInfo.taxRateUsed * 100)}% lower-bracket tax
                              </span>
                            )}
                          </div>
                          <span className="col-span-3 text-right text-slate-400 font-mono">-</span>
                          <span className="col-span-4 text-right font-bold text-emerald-400 font-mono">+${futureSimInfo.compoundingGains.toLocaleString()}</span>
                        </div>

                        {futureSimInfo.compoundingGainsPreTax !== undefined && futureSimInfo.compoundingGainsPreTax > futureSimInfo.compoundingGains && (
                          <>
                            <div className="grid grid-cols-12 gap-1.5 py-0.5 text-[11px]">
                              <span className="col-span-5 text-slate-500 pl-3">└─ Pre-Tax Returns</span>
                              <span className="col-span-3 text-right text-slate-600 font-mono">-</span>
                              <span className="col-span-4 text-right text-slate-400 font-mono">+${futureSimInfo.compoundingGainsPreTax.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-12 gap-1.5 py-0.5 text-[11px] border-b border-slate-900/40">
                              <span className="col-span-5 text-slate-500 pl-3">└─ Annual Interest Tax</span>
                              <span className="col-span-3 text-right text-slate-600 font-mono">-</span>
                              <span className="col-span-4 text-right text-rose-400/80 font-mono">-${(futureSimInfo.taxPaidOnGains ?? 0).toLocaleString()}</span>
                            </div>
                          </>
                        )}

                        {useExistingEquity && existingPropertyValue > 0 && (
                          <div className="grid grid-cols-12 gap-1.5 py-1 border-b border-slate-900/40">
                            <span className="col-span-5 text-emerald-400 font-semibold">Available Equity</span>
                            <span className="col-span-3 text-right text-emerald-500 font-mono">${existingEquity.toLocaleString()}</span>
                            <span className="col-span-4 text-right font-bold text-emerald-400 font-mono">${existingEquity.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-12 gap-1.5 py-2.5 bg-slate-900/30 rounded-lg px-2 border border-slate-900 font-sans mt-2">
                          <span className="col-span-5 text-slate-300 font-bold">Total Funding Pool</span>
                          <span className="col-span-3 text-right text-slate-400 font-bold font-mono">${currentTotalOffsetAssets.toLocaleString()}</span>
                          <span className="col-span-4 text-right text-emerald-300 font-extrabold font-mono text-[13px]">${futureSimInfo.accruedAssets.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center py-1 border-b border-slate-900">
                          <span className="text-slate-400">Cash Savings Pool</span>
                          <span className="font-semibold text-slate-200 font-mono">${cashAssets.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-900">
                          <span className="text-slate-400">Share Portfolio Value</span>
                          <span className="font-semibold text-slate-200 font-mono">${sharesAssets.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-900">
                          <span className="text-slate-400">Other Declared Assets</span>
                          <span className="font-semibold text-slate-200 font-mono">${otherAssets.toLocaleString()}</span>
                        </div>

                        {useExistingEquity && existingPropertyValue > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-emerald-400 font-semibold">Available Home Equity</span>
                            <span className="font-semibold text-emerald-400 font-mono">${existingEquity.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-2.5 bg-slate-900/30 rounded-lg px-2.5 border border-slate-900">
                          <span className="text-slate-300 font-bold">Total Funding Offset</span>
                          <span className="text-slate-100 font-extrabold font-mono text-sm">${currentTotalOffsetAssets.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Deposit Ratio & LMI check */}
              {simulateFuturePurchase && futureSimInfo ? (
                <div className="p-3.5 rounded-xl border bg-slate-900/40 border-slate-900/80 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase font-bold">Current Deposit Ratio</span>
                      <span className="text-sm font-extrabold text-slate-300 font-mono">
                        {currentDepositPercent.toFixed(1)}% of Price
                      </span>
                      <span className={`block text-[9px] font-bold ${currentLmiApplicable ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {currentLmiApplicable ? 'Lenders Mortgage Insurance (LMI) applies' : '✓ LMI Exempt'}
                      </span>
                    </div>
                    <div className="border-l border-slate-900/80 pl-4">
                      <span className="block text-[9px] text-indigo-400 uppercase font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Future Deposit Ratio
                      </span>
                      <span className="text-sm font-black text-indigo-300 font-mono">
                        {depositPercent.toFixed(1)}% of Projected Price
                      </span>
                      <span className={`block text-[9px] font-bold ${lmiApplicable ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {lmiApplicable ? 'Lenders Mortgage Insurance (LMI) applies' : '✓ LMI Exempt'}
                      </span>
                    </div>
                  </div>
                  
                  {(currentLmiApplicable || lmiApplicable) && (
                    <div className="p-2 bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 rounded-lg leading-relaxed">
                      <strong>Lenders Mortgage Insurance (LMI) Premium Notice:</strong> Deposit is below <span className="font-mono">20%</span> in {currentLmiApplicable && lmiApplicable ? 'both scenarios' : currentLmiApplicable ? 'the current scenario' : 'the future scenario'}. Standard retail banks will add structural LMI premium insurance to the initial loan.
                    </div>
                  )}
                  {(!currentLmiApplicable && !lmiApplicable) && (
                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 rounded-lg">
                      ✓ <strong>LMI Exempt:</strong> Initial deposit exceeds the 20% limit in both current and simulated purchase dates. Safe tier!
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-900/40 border-slate-900">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Initial Deposit LVR Ratio</span>
                    <span className="text-sm font-extrabold text-slate-200 font-mono">
                      {depositPercent.toFixed(1)}% of Property Price
                    </span>
                  </div>
                  {lmiApplicable ? (
                    <div className="p-2 bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 rounded-lg max-w-xs">
                      <strong>Lenders Mortgage Insurance (LMI):</strong> Your deposit is less than <span className="font-mono">20%</span>. Standard banks will apply LMI premiums.
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 rounded-lg">
                      ✓ <strong>LMI Exempt:</strong> Deposit exceeds 20%. Safe lending territory.
                    </div>
                  )}
                </div>
              )}

              {/* Net Required Mortgage */}
              {simulateFuturePurchase && futureSimInfo ? (
                <div className="p-4 bg-gradient-to-r from-indigo-950/20 to-slate-900/35 border border-indigo-500/10 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Required Mortgage Loan Comparison</span>
                    <span className="text-[9px] text-slate-500 font-semibold font-mono">Interest Rate: {interestRatePrimary}% P.A.</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Purchase Mortgage</span>
                      <span className="text-lg font-bold text-slate-400 font-mono">${currentRequiredMortgage.toLocaleString()}</span>
                      <span className="block text-[9px] text-slate-500 font-mono">At current market valuations</span>
                    </div>

                    <div className="border-l border-slate-900/80 pl-4">
                      <span className="block text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Future Mortgage Required
                      </span>
                      <span className="text-xl font-black text-indigo-400 font-mono">${futureSimInfo.futureMortgageAmount.toLocaleString()}</span>
                      <span className="block text-[9px] text-indigo-500/85 font-mono">
                        {futureSimInfo.futureMortgageAmount < currentRequiredMortgage 
                          ? `Saved $${(currentRequiredMortgage - futureSimInfo.futureMortgageAmount).toLocaleString()} off final loan principal!` 
                          : `Requires $${(futureSimInfo.futureMortgageAmount - currentRequiredMortgage).toLocaleString()} more due to projected property price growth`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-sky-950/20 to-slate-900/30 border border-sky-500/10 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Required Mortgage Loan</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-sky-400 font-mono">${mortgageAmount.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 font-mono">at {interestRatePrimary}% P.A.</span>
                    </div>
                  </div>

                  {interestFreeLoanActive && (
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500">Interest-Free Co-Loan</span>
                      <span className="text-sm font-bold text-slate-300 font-mono">${interestFreeLoanAmount.toLocaleString()}</span>
                      <span className="block text-[9px] text-sky-400 font-mono">-${Math.round(monthlyIFLRepayment)}/mo repayment</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* COLUMN 2: REPAYMENT & EXTRA PAYOFF TIMELINE */}
            <div className="bg-slate-950/45 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6" id="repayments-timeline-panel">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
                    <Timer className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Repayment & Extra Payoff Timeline</h3>
                    <p className="text-[10px] text-slate-400">Compounding impact of extra overpayments and offset accounts</p>
                  </div>
                </div>
              </div>

              {/* Top Row: Payments Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-900/45 border border-slate-900 rounded-xl p-3">
                  <span className="block text-[9px] text-slate-500 uppercase font-semibold">Weekly</span>
                  <span className="text-sm font-bold text-slate-300 font-mono">
                    ${Math.round(simulation.standardMonthlyPayment * 12 / 52).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-900/45 border border-slate-900 rounded-xl p-3">
                  <span className="block text-[9px] text-slate-500 uppercase font-semibold">Fortnightly</span>
                  <span className="text-sm font-bold text-slate-300 font-mono">
                    ${Math.round(simulation.standardMonthlyPayment * 12 / 26).toLocaleString()}
                  </span>
                </div>
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
                  <span className="block text-[9px] text-sky-400 uppercase font-bold">Monthly P&I</span>
                  <span className="text-sm font-black text-sky-400 font-mono">
                    ${Math.round(simulation.standardMonthlyPayment).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Accelerated payoff highlights */}
              <div className="space-y-4">
                <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">Standard Payoff Duration</span>
                    <span className="text-lg font-bold text-slate-400 font-mono">
                      {(simulation.monthsToPayoffStandard / 12).toFixed(1)} Years
                    </span>
                    <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                      Interest: ${simulation.totalInterestStandard.toLocaleString()}
                    </span>
                  </div>

                  <div className="border-l border-slate-900 pl-4">
                    <span className="block text-[9px] text-emerald-500 uppercase font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" /> Accelerated Payoff
                    </span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {(simulation.monthsToPayoffAccelerated / 12).toFixed(1)} Years
                    </span>
                    <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                      Interest: ${simulation.totalInterestAccelerated.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Big Wins Summary */}
                {simulation.monthsToPayoffStandard - simulation.monthsToPayoffAccelerated > 0 && (
                  <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">Interest Savings Win!</span>
                      <p className="text-[11px] text-slate-400">
                        By paying an extra <strong className="text-slate-200 font-mono">+${monthlyExtraRepayment}/mo</strong> and compounding surplus in your offset account, you pay off your home early!
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black text-emerald-400 font-mono">
                        +{((simulation.monthsToPayoffStandard - simulation.monthsToPayoffAccelerated) / 12).toFixed(1)} Yrs
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Saved | Save ${(simulation.totalInterestStandard - simulation.totalInterestAccelerated).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly living expenses reminder */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Monthly Living Costs</span>
                  <span className="font-semibold text-slate-300 font-mono">${monthlyExpenses.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Target Extra Repayment</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-emerald-400 font-mono">+${monthlyExtraRepayment.toLocaleString()}/mo</span>
                    {onUpdate && leftoverCashflow > 0 && monthlyExtraRepayment < Math.round(leftoverCashflow) && (
                      <button
                        onClick={() => onUpdate({ monthlyExtraRepayment: Math.round(leftoverCashflow) })}
                        className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer text-left"
                      >
                        Set to Max Possible
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* 3. FUTURE GOAL SIMULATION (RENDERED ONLY IF ACTIVE) */}
          {simulateFuturePurchase && futureSimInfo && (
            <div className="bg-gradient-to-tr from-indigo-950/20 to-slate-950/45 border border-indigo-500/10 rounded-2xl p-6 shadow-xl space-y-4" id="future-simulation-dashboard-card">
              <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Future Purchase Simulation Timeline</h3>
                  <p className="text-xs text-slate-400">Projected metrics for buying on deferred date: <span className="text-indigo-400 font-semibold font-mono">{purchaseSimDate}</span> ({futureSimInfo.monthsDiff} months away)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center md:text-left">
                <div className="bg-slate-900/35 border border-slate-900 rounded-xl p-3.5">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Inflated Property Cost</span>
                  <span className="text-base font-bold text-slate-300 font-mono">${futureSimInfo.futurePropertyPrice.toLocaleString()}</span>
                  <span className="block text-[9px] text-rose-400 font-mono">+{((futureSimInfo.futurePropertyPrice - propertyPrice) / propertyPrice * 100).toFixed(1)}% inflation</span>
                </div>

                <div className="bg-slate-900/35 border border-slate-900 rounded-xl p-3.5">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Accrued Savings Pool</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">${futureSimInfo.accruedAssets.toLocaleString()}</span>
                  <span className="block text-[9px] text-emerald-500 font-mono">+${(futureSimInfo.accruedAssets - (cashAssets + sharesAssets + otherAssets + existingEquity)).toLocaleString()} growth</span>
                </div>

                <div className="bg-slate-900/35 border border-slate-900 rounded-xl p-3.5">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Compounding Interest Gains</span>
                  <span className="text-base font-bold text-slate-300 font-mono">${futureSimInfo.compoundingGains.toLocaleString()}</span>
                  <span className="block text-[9px] text-slate-500 font-mono">at {savingsAnnualReturnRate}% return rate</span>
                </div>

                <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5">
                  <span className="block text-[10px] text-indigo-300 uppercase font-bold mb-1">Future Required Mortgage</span>
                  <span className="text-base font-black text-indigo-400 font-mono">${futureSimInfo.futureMortgageAmount.toLocaleString()}</span>
                  <span className="block text-[9px] text-indigo-400 font-mono">Based on future values</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/50 border border-slate-900 rounded-lg text-[11px] text-slate-400 leading-normal flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <strong>Simulation Insight:</strong> Over the next <span className="font-semibold text-slate-200 font-mono">{futureSimInfo.monthsDiff} months</span>, you contribute a total of <strong className="text-emerald-400 font-mono">${futureSimInfo.additionalSavingsFromContributions.toLocaleString()}</strong> to savings (+${monthlySavingsContribution}/mo). Property inflation {propertyInflationEnabled ? `adds $${(futureSimInfo.futurePropertyPrice - propertyPrice).toLocaleString()} to the purchase target.` : 'has been disabled; target price remains static.'}
                </div>
                {onUpdate && Math.max(0, Math.round(combinedNetMonthly - monthlyExpenses)) > 0 && monthlySavingsContribution < Math.max(0, Math.round(combinedNetMonthly - monthlyExpenses)) && (
                  <button
                    onClick={() => onUpdate({ monthlySavingsContribution: Math.max(0, Math.round(combinedNetMonthly - monthlyExpenses)) })}
                    className="py-1.5 px-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 self-start md:self-center font-sans"
                  >
                    Set Savings to Max (${Math.max(0, Math.round(combinedNetMonthly - monthlyExpenses)).toLocaleString()}/mo)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. SENSITIVITY RATE SCENARIOS COMPARISON */}
          {mortgageAmount > 0 && (
            <div className="bg-slate-950/45 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-4" id="interest-rates-sensitivity-panel">
              <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
                <Landmark className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Interest Rate Sensitivity Analysis</h3>
                  <p className="text-xs text-slate-400">See how rate fluctuations directly impact your repayments and total lifetime interest cost</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {interestSensitivity.map((scenario, idx) => {
                  const isPrimary = idx === 1;
                  return (
                    <div
                      key={scenario.label}
                      className={`border rounded-xl p-4 space-y-3 relative ${
                        isPrimary
                          ? 'bg-indigo-950/10 border-indigo-500/20 shadow-md'
                          : 'bg-slate-900/30 border-slate-900'
                      }`}
                    >
                      {isPrimary && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold text-indigo-400 uppercase tracking-wider px-2 py-0.5 bg-indigo-950 border border-indigo-900/40 rounded-full">
                          Active Loan Rate
                        </span>
                      )}

                      <div className="space-y-0.5">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">{scenario.label}</span>
                        <span className="text-xl font-black text-slate-100 font-mono">{scenario.rate}% P.A.</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-400">Monthly Mortgage</span>
                          <strong className="text-sky-400 font-mono">${Math.round(scenario.monthlyPayment).toLocaleString()}</strong>
                        </div>

                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-400">Total Lifetime Interest</span>
                          <span className="font-semibold font-mono text-slate-300">${scenario.totalInterest.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between pt-1 font-mono text-[11px]">
                          <span className="text-slate-400">Relative Difference</span>
                          {scenario.interestDiff === 0 ? (
                            <span className="text-slate-400 font-medium">—</span>
                          ) : scenario.interestDiff < 0 ? (
                            <span className="text-emerald-400 font-bold">
                              -${Math.abs(scenario.interestDiff).toLocaleString()} interest
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold">
                              +${scenario.interestDiff.toLocaleString()} interest
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. 30-YEAR CAPITAL GROWTH PROJECTIONS GRAPH / TABLE */}
          <div className="bg-slate-950/45 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6" id="growth-projections-panel">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Compounding Suburb Growth Curve</h3>
                  <p className="text-xs text-slate-400">Projected capital gains compounding vs mortgage principal amortization over 30 years</p>
                </div>
              </div>

              {/* Selector */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1" id="growth-tab-buttons">
                <button
                  onClick={() => setChartTab('chart')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    chartTab === 'chart'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Growth Chart
                </button>
                <button
                  onClick={() => setChartTab('table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    chartTab === 'table'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Data Table
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Suburb Metadata Column */}
              <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suburb Analytics Profile</span>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">{selectedSuburbObj.name}</span>
                  </div>

                  <div className="space-y-2 border-t border-slate-900 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Metro Region</span>
                      <span className="font-medium text-slate-200">{selectedSuburbObj.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Historical Average Growth</span>
                      <span className="font-bold text-emerald-400 font-mono">{selectedSuburbObj.historicalGrowthRate}% P.A.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Custom Projection Rate</span>
                      <span className="font-bold text-sky-400 font-mono">{customGrowthRate.toFixed(1)}% P.A.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-lg text-[11px] text-slate-400 leading-normal space-y-2">
                    <p>
                      Sydney and NSW properties exhibit compounding capital growth. Under current capital growth rates, your property value is projected to reach <strong className="text-emerald-400 font-mono">${Math.round(growthProjections[30]?.propertyValue || 0).toLocaleString()}</strong> by Year 30.
                    </p>
                    <p className="border-t border-slate-900 pt-2 italic text-[10px] text-slate-500">
                      Primary Place of Residence (PPOR) properties are fully exempt from Capital Gains Tax (CGT) in Australia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Chart / Table Column */}
              <div className="lg:col-span-2">
                {chartTab === 'chart' ? (
                  <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-4 space-y-4">
                    
                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400 font-medium">Timeline Chart (Hover to inspect value)</span>
                      <div className="flex items-center gap-3 font-semibold text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                          <span>Property Value</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-slate-500 rounded-full" />
                          <span>Standard Loan</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-sky-400 rounded-full" />
                          <span>Accelerated Loan</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG Chart */}
                    <div className="relative w-full aspect-[2/1] min-h-[200px]">
                      <svg
                        ref={svgRef}
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="w-full h-full select-none"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1.0].map((perc, idx) => {
                          const val = maxVal * perc;
                          const y = getCoords(0, val).y;
                          return (
                            <g key={idx} className="opacity-20">
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={chartWidth - paddingRight}
                                y2={y}
                                stroke="#475569"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                              />
                              <text
                                x={paddingLeft - 8}
                                y={y + 3}
                                fill="#94a3b8"
                                fontSize="9"
                                textAnchor="end"
                                className="font-mono"
                              >
                                ${(val / 1000000).toFixed(1)}M
                              </text>
                            </g>
                          );
                        })}

                        {/* Years x-axis ticks */}
                        {[0, 5, 10, 15, 20, 25, 30].map(yr => {
                          const x = getCoords(yr, 0).x;
                          return (
                            <g key={yr} className="opacity-20">
                              <line
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={chartHeight - paddingBottom}
                                stroke="#475569"
                                strokeWidth="1"
                              />
                              <text
                                x={x}
                                y={chartHeight - paddingBottom + 14}
                                fill="#94a3b8"
                                fontSize="9"
                                textAnchor="middle"
                                className="font-mono"
                              >
                                Yr {yr}
                              </text>
                            </g>
                          );
                        })}

                        {/* Plotted Paths */}
                        {growthProjections.length > 0 && (
                          <>
                            {/* Property value */}
                            <path
                              d={getSvgPath('propertyValue')}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            {/* Standard mortgage */}
                            <path
                              d={getSvgPath('mortgageBalanceStandard')}
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeDasharray="4 2"
                              strokeLinecap="round"
                            />
                            {/* Accelerated mortgage */}
                            <path
                              d={getSvgPath('mortgageBalanceAccelerated')}
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />

                            {/* Active Point Hover Ticks */}
                            {activePoint && (
                              <>
                                <line
                                  x1={getCoords(activePoint.year, 0).x}
                                  y1={paddingTop}
                                  x2={getCoords(activePoint.year, 0).x}
                                  y2={chartHeight - paddingBottom}
                                  stroke="#06b6d4"
                                  strokeWidth="1.5"
                                  opacity="0.5"
                                />
                                <circle
                                  cx={getCoords(activePoint.year, activePoint.propertyValue).x}
                                  cy={getCoords(activePoint.year, activePoint.propertyValue).y}
                                  r="4"
                                  fill="#10b981"
                                  stroke="#020617"
                                  strokeWidth="1.5"
                                />
                                <circle
                                  cx={getCoords(activePoint.year, activePoint.mortgageBalanceStandard).x}
                                  cy={getCoords(activePoint.year, activePoint.mortgageBalanceStandard).y}
                                  r="4"
                                  fill="#64748b"
                                  stroke="#020617"
                                  strokeWidth="1.5"
                                />
                                <circle
                                  cx={getCoords(activePoint.year, activePoint.mortgageBalanceAccelerated).x}
                                  cy={getCoords(activePoint.year, activePoint.mortgageBalanceAccelerated).y}
                                  r="4"
                                  fill="#06b6d4"
                                  stroke="#020617"
                                  strokeWidth="1.5"
                                />
                              </>
                            )}
                          </>
                        )}
                      </svg>
                    </div>

                    {/* Hover HUD Display */}
                    <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="block text-[8px] uppercase text-slate-500 font-bold">Timeline Point</span>
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          {activePoint ? `Year ${activePoint.year}` : 'Hover above graph'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase text-slate-500 font-bold">Projected Valuation</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {activePoint ? `$${activePoint.propertyValue.toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase text-slate-500 font-bold">Standard Equity</span>
                        <span className="text-xs font-bold text-slate-300 font-mono">
                          {activePoint ? `$${activePoint.equityStandard.toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase text-slate-500 font-bold">Accelerated Equity</span>
                        <span className="text-xs font-black text-sky-400 font-mono">
                          {activePoint ? `$${activePoint.equityAccelerated.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Data Table View */
                  <div className="bg-slate-900/20 border border-slate-900 rounded-xl overflow-hidden max-h-[310px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-900">
                          <th className="p-2.5">Year</th>
                          <th className="p-2.5">Property Value</th>
                          <th className="p-2.5">Standard Loan Balance</th>
                          <th className="p-2.5">Accelerated Loan Balance</th>
                          <th className="p-2.5">Accelerated Equity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 font-mono text-slate-300">
                        {growthProjections
                          .filter(p => p.year % 2 === 0 || p.year === 1 || p.year === 30)
                          .map(p => (
                            <tr key={p.year} className="hover:bg-slate-900/40">
                              <td className="p-2.5 text-slate-400 font-bold">Yr {p.year}</td>
                              <td className="p-2.5 text-emerald-400 font-semibold">${p.propertyValue.toLocaleString()}</td>
                              <td className="p-2.5 text-slate-500">${p.mortgageBalanceStandard.toLocaleString()}</td>
                              <td className="p-2.5 text-sky-400">${p.mortgageBalanceAccelerated.toLocaleString()}</td>
                              <td className="p-2.5 text-slate-200 font-bold">${p.equityAccelerated.toLocaleString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 6. INCOME & TAX SUMMARY DETAILS */}
          <div className="bg-slate-950/45 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-4" id="income-tax-outputs-panel">
            <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Household Income & ATO Tax Calculation</h3>
                <p className="text-xs text-slate-400">After-tax disposable income breakdown under <span className="text-emerald-400 font-semibold">ATO Tax Year {taxYear}</span> guidelines</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Salary 1 */}
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300 uppercase">Primary Income (Salary 1)</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
                    Marginal: {tax1.marginalRate}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-slate-500 font-sans">Gross Salary:</span>
                    <span className="text-slate-300 font-semibold">${salary1.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-slate-500 font-sans">Income Tax:</span>
                    <span className="text-rose-400/80">${tax1.incomeTax.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-slate-500 font-sans">Medicare Levy:</span>
                    <span className="text-rose-400/80">${tax1.medicareLevy.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-emerald-400 font-semibold font-sans">Net Take-home:</span>
                    <span className="text-emerald-400 font-bold">${tax1.netPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Salary 2 */}
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300 uppercase">Spouse Income (Salary 2)</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
                    Marginal: {tax2.marginalRate}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-slate-500 font-sans">Gross Salary:</span>
                    <span className="text-slate-300 font-semibold">${salary2.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-slate-500 font-sans">Income Tax:</span>
                    <span className="text-rose-400/80">${tax2.incomeTax.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-slate-500 font-sans">Medicare Levy:</span>
                    <span className="text-rose-400/80">${tax2.medicareLevy.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1.5 flex justify-between">
                    <span className="text-emerald-400 font-semibold font-sans">Net Take-home:</span>
                    <span className="text-emerald-400 font-bold">${tax2.netPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Combined Row */}
            <div className="bg-gradient-to-r from-emerald-950/15 to-slate-900/40 border border-emerald-500/10 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-400">Combined Disposable Cash</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-100 font-mono">${combinedNetAnnual.toLocaleString()}/yr</span>
                  <span className="text-slate-400">after tax</span>
                </div>
              </div>

              <div className="flex gap-6 text-right font-mono">
                <div>
                  <span className="block text-[9px] text-slate-500 font-sans uppercase">Combined Monthly</span>
                  <span className="text-sm font-semibold text-slate-200">${Math.round(combinedNetMonthly).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-sans uppercase">Combined Fortnightly</span>
                  <span className="text-sm font-semibold text-slate-200">${Math.round(combinedNetAnnual / 26).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-sans uppercase">Effective Tax Rate</span>
                  <span className="text-sm font-semibold text-amber-400">
                    { (salary1 + salary2) > 0 ? (((tax1.incomeTax + tax1.medicareLevy + tax2.incomeTax + tax2.medicareLevy) / (salary1 + salary2)) * 100).toFixed(1) : '0' }%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
