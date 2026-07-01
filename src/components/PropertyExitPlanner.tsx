import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Percent, ShieldCheck, Info,
  Scale, ArrowRight, Home, Coins, HelpCircle, ChevronRight, Activity, Sparkles, Building, AlertCircle
} from 'lucide-react';
import { calculateNSWIncomeTax } from '../utils/finance';
import { TaxYear, DynamicTaxConfig } from '../types';

interface PropertyExitPlannerProps {
  salary1: number;
  salary2: number;
  taxYear: TaxYear;
  dynamicTaxConfig?: DynamicTaxConfig;
  defaultPropertyValue?: number;
  defaultPropertyLoan?: number;
  monthlyExpenses?: number;
}

const getSavedExitPlannerInput = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem('property_dashboard_exit_planner_inputs');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[key] !== undefined) return parsed[key];
    }
  } catch {}
  return defaultValue;
};

export default function PropertyExitPlanner({
  salary1,
  salary2,
  taxYear,
  dynamicTaxConfig,
  defaultPropertyValue = 600000,
  defaultPropertyLoan = 400000,
  monthlyExpenses = 3800
}: PropertyExitPlannerProps) {
  // Input States
  const [originalPurchasePrice, setOriginalPurchasePrice] = useState(() => getSavedExitPlannerInput('originalPurchasePrice', 450000));
  const [currentPropertyValue, setCurrentPropertyValue] = useState(() => getSavedExitPlannerInput('currentPropertyValue', defaultPropertyValue > 0 ? defaultPropertyValue : 600000));
  const [currentMortgageBalance, setCurrentMortgageBalance] = useState(() => getSavedExitPlannerInput('currentMortgageBalance', defaultPropertyLoan > 0 ? defaultPropertyLoan : 400000));
  
  const [isPrimaryResidence, setIsPrimaryResidence] = useState(() => getSavedExitPlannerInput('isPrimaryResidence', true));
  const [heldForMoreThan12Months, setHeldForMoreThan12Months] = useState(() => getSavedExitPlannerInput('heldForMoreThan12Months', true));

  // Exit Fees
  const [agentCommissionPercent, setAgentCommissionPercent] = useState(() => getSavedExitPlannerInput('agentCommissionPercent', 2.0));
  const [marketingCosts, setMarketingCosts] = useState(() => getSavedExitPlannerInput('marketingCosts', 3000));
  const [conveyancingFees, setConveyancingFees] = useState(() => getSavedExitPlannerInput('conveyancingFees', 1500));
  const [otherExitFees, setOtherExitFees] = useState(() => getSavedExitPlannerInput('otherExitFees', 1000));

  // Future Holding Period
  const [holdingPeriodMonths, setHoldingPeriodMonths] = useState(() => getSavedExitPlannerInput('holdingPeriodMonths', 24)); // 2 years
  const [futurePropertyValueOption, setFuturePropertyValueOption] = useState<'growth' | 'fixed'>(() => getSavedExitPlannerInput('futurePropertyValueOption', 'growth'));
  const [futurePropertyGrowthRate, setFuturePropertyGrowthRate] = useState(() => getSavedExitPlannerInput('futurePropertyGrowthRate', 5.0)); // 5% annual growth
  const [futurePropertyValueFixed, setFuturePropertyValueFixed] = useState(() => getSavedExitPlannerInput('futurePropertyValueFixed', 660000));

  // Mortgage & Expenses during holding
  const [mortgageInterestRate, setMortgageInterestRate] = useState(() => getSavedExitPlannerInput('mortgageInterestRate', 6.1));
  const [mortgageRepaymentType, setMortgageRepaymentType] = useState<'pi' | 'io' | 'max_cashflow'>(() => getSavedExitPlannerInput('mortgageRepaymentType', 'pi'));
  const [mortgageRemainingTermYears, setMortgageRemainingTermYears] = useState(() => getSavedExitPlannerInput('mortgageRemainingTermYears', 25));
  const [annualHoldingCosts, setAnnualHoldingCosts] = useState(() => getSavedExitPlannerInput('annualHoldingCosts', 5000)); // Rates, body corp, water, insurance, maintenance

  // Rental income during holding
  const [isRentedOut, setIsRentedOut] = useState(() => getSavedExitPlannerInput('isRentedOut', false));
  const [weeklyRent, setWeeklyRent] = useState(() => getSavedExitPlannerInput('weeklyRent', 550));
  const [agentManagementPercent, setAgentManagementPercent] = useState(() => getSavedExitPlannerInput('agentManagementPercent', 7.0));

  // Reinvestment details
  const [reinvestmentReturnRate, setReinvestmentReturnRate] = useState(() => getSavedExitPlannerInput('reinvestmentReturnRate', 5.0));
  const [taxRateSelection, setTaxRateSelection] = useState<'lower' | 'higher' | 'custom' | 'none'>(() => getSavedExitPlannerInput('taxRateSelection', 'lower'));
  const [customTaxRate, setCustomTaxRate] = useState(() => getSavedExitPlannerInput('customTaxRate', 32.5));

  // Save changes to localStorage
  useEffect(() => {
    const inputs = {
      originalPurchasePrice,
      currentPropertyValue,
      currentMortgageBalance,
      isPrimaryResidence,
      heldForMoreThan12Months,
      agentCommissionPercent,
      marketingCosts,
      conveyancingFees,
      otherExitFees,
      holdingPeriodMonths,
      futurePropertyValueOption,
      futurePropertyGrowthRate,
      futurePropertyValueFixed,
      mortgageInterestRate,
      mortgageRepaymentType,
      mortgageRemainingTermYears,
      annualHoldingCosts,
      isRentedOut,
      weeklyRent,
      agentManagementPercent,
      reinvestmentReturnRate,
      taxRateSelection,
      customTaxRate
    };
    localStorage.setItem('property_dashboard_exit_planner_inputs', JSON.stringify(inputs));
  }, [
    originalPurchasePrice,
    currentPropertyValue,
    currentMortgageBalance,
    isPrimaryResidence,
    heldForMoreThan12Months,
    agentCommissionPercent,
    marketingCosts,
    conveyancingFees,
    otherExitFees,
    holdingPeriodMonths,
    futurePropertyValueOption,
    futurePropertyGrowthRate,
    futurePropertyValueFixed,
    mortgageInterestRate,
    mortgageRepaymentType,
    mortgageRemainingTermYears,
    annualHoldingCosts,
    isRentedOut,
    weeklyRent,
    agentManagementPercent,
    reinvestmentReturnRate,
    taxRateSelection,
    customTaxRate
  ]);

  // Info Modal states
  const [showCGTInfo, setShowCGTInfo] = useState(false);
  const [showOppCostInfo, setShowOppCostInfo] = useState(false);

  // Calculate household surplus cashflow from backend data
  const householdSurplus = useMemo(() => {
    const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    const netMonthly1 = taxBreakdown1.netPay / 12;
    const netMonthly2 = taxBreakdown2.netPay / 12;
    const combinedNetMonthly = netMonthly1 + netMonthly2;
    return Math.max(0, combinedNetMonthly - monthlyExpenses);
  }, [salary1, salary2, taxYear, dynamicTaxConfig, monthlyExpenses]);

  // Calculate tax rates
  const taxRates = useMemo(() => {
    const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    
    const rate1 = taxBreakdown1.marginalRate + (salary1 > 24276 ? 2.0 : 0);
    const rate2 = taxBreakdown2.marginalRate + (salary2 > 24276 ? 2.0 : 0);
    
    const lowerRate = Math.min(rate1, rate2);
    const higherRate = Math.max(rate1, rate2);

    let activeRate = 0;
    if (taxRateSelection === 'lower') activeRate = lowerRate / 100;
    else if (taxRateSelection === 'higher') activeRate = higherRate / 100;
    else if (taxRateSelection === 'custom') activeRate = customTaxRate / 100;
    else activeRate = 0;

    return {
      lowerRate,
      higherRate,
      activeRate,
      salary1Name: `Salary 1 ($${salary1.toLocaleString()})`,
      salary2Name: `Salary 2 ($${salary2.toLocaleString()})`
    };
  }, [salary1, salary2, taxYear, dynamicTaxConfig, taxRateSelection, customTaxRate]);

  // Derived Values
  const futurePropertyValue = useMemo(() => {
    if (futurePropertyValueOption === 'fixed') {
      return futurePropertyValueFixed;
    }
    const years = holdingPeriodMonths / 12;
    return Math.round(currentPropertyValue * Math.pow(1 + futurePropertyGrowthRate / 100, years));
  }, [futurePropertyValueOption, futurePropertyValueFixed, currentPropertyValue, futurePropertyGrowthRate, holdingPeriodMonths]);

  // Main Simulation calculation
  const simResults = useMemo(() => {
    const N = holdingPeriodMonths;
    const years = N / 12;
    const taxRate = taxRates.activeRate;

    // --- SCENARIO A: SELL NOW AND REINVEST ---
    const agentFeeNow = currentPropertyValue * (agentCommissionPercent / 100);
    const totalFeesNow = agentFeeNow + marketingCosts + conveyancingFees + otherExitFees;
    
    // CGT Now
    let cgtNow = 0;
    let capitalGainNow = 0;
    if (!isPrimaryResidence) {
      capitalGainNow = currentPropertyValue - originalPurchasePrice - totalFeesNow;
      if (capitalGainNow > 0) {
        const taxableGainNow = heldForMoreThan12Months ? capitalGainNow * 0.5 : capitalGainNow;
        cgtNow = taxableGainNow * taxRate;
      }
    }

    const netCashProceedsNow = Math.max(0, currentPropertyValue - currentMortgageBalance - totalFeesNow - cgtNow);

    // Compound growth of net cash proceeds
    const r_pre = (reinvestmentReturnRate / 100) / 12;
    const r_post = r_pre * (1 - taxRate);
    
    const endingInitialCashA = netCashProceedsNow * Math.pow(1 + r_post, N);
    const totalInterestGainedA_pretax = netCashProceedsNow * (Math.pow(1 + r_pre, N) - 1);
    const totalInterestGainedA_posttax = endingInitialCashA - netCashProceedsNow;
    const taxPaidOnInterestA = Math.max(0, totalInterestGainedA_pretax - totalInterestGainedA_posttax);

    // --- SCENARIO B: HOLD AND SELL LATER ---
    // Month-by-month simulation of mortgage amortization and holding costs
    let balance = currentMortgageBalance;
    const monthlyRate = (mortgageInterestRate / 100) / 12;
    const totalTermMonths = mortgageRemainingTermYears * 12;
    
    // Constant P&I payment if applicable
    let piMonthlyPayment = 0;
    if (mortgageRepaymentType === 'pi' && totalTermMonths > 0 && monthlyRate > 0) {
      piMonthlyPayment = currentMortgageBalance * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalTermMonths)) / 
        (Math.pow(1 + monthlyRate, totalTermMonths) - 1);
    }

    let totalInterestPaidB = 0;
    let totalMortgagePaymentsB = 0;
    let totalHoldingExpensesB = 0;
    let totalGrossRentB = 0;
    let totalManagementFeesB = 0;
    let totalNetRentCashB = 0;
    let totalTaxImpactB = 0;
    let totalCashOutflowsB = 0;

    const monthlyHoldingCost = annualHoldingCosts / 12;
    const monthlyGrossRent = isRentedOut ? (weeklyRent * 52) / 12 : 0;
    const monthlyManagementFee = monthlyGrossRent * (agentManagementPercent / 100);
    const monthlyNetRentCash = monthlyGrossRent - monthlyManagementFee;

    // Simulation array for charts
    const monthlyTimeline: Array<{
      month: number;
      wealthA: number;
      wealthB: number;
      mortgageBalance: number;
    }> = [];

    let accumulatedCashFlowSavingsCompounded = 0;

    for (let m = 1; m <= N; m++) {
      const interest_m = balance * monthlyRate;
      let payment_m = 0;

      if (mortgageRepaymentType === 'pi') {
        payment_m = piMonthlyPayment;
      } else if (mortgageRepaymentType === 'max_cashflow') {
        const netRentalSurplus_m = monthlyNetRentCash - monthlyHoldingCost;
        const availableMaxCashflow = householdSurplus + netRentalSurplus_m;
        // Pay the interest plus all available cashflow surplus, but at least cover interest
        payment_m = Math.max(interest_m, availableMaxCashflow);
      } else {
        payment_m = interest_m; // Interest only
      }

      const principal_paid_m = Math.min(balance, Math.max(0, payment_m - interest_m));
      payment_m = interest_m + principal_paid_m; // Recalculate payment if balance is fully paid down
      balance = balance - principal_paid_m;

      totalInterestPaidB += interest_m;
      totalMortgagePaymentsB += payment_m;
      totalHoldingExpensesB += monthlyHoldingCost;

      let taxImpact_m = 0;
      if (isRentedOut) {
        totalGrossRentB += monthlyGrossRent;
        totalManagementFeesB += monthlyManagementFee;
        totalNetRentCashB += monthlyNetRentCash;

        // Negative Gearing or Positive rent taxable profit
        // Rent - Interest - holding costs - management fees
        const taxableProfit_m = monthlyNetRentCash - interest_m - monthlyHoldingCost;
        taxImpact_m = taxableProfit_m * taxRate; // If negative, this is a tax reduction (refund)
        totalTaxImpactB += taxImpact_m;
      }

      // Out of pocket cash spent this month to hold the property
      // Mortgage Payment + Holding Cost - Rent + Tax Paid (or - Tax Saved)
      const cashOutflow_m = payment_m + monthlyHoldingCost - monthlyNetRentCash + taxImpact_m;
      totalCashOutflowsB += cashOutflow_m;

      // Scenario A savings compounding:
      // If the user sells now, they SAVE this monthly cash outflow and invest it at r_post!
      if (m > 0) {
        accumulatedCashFlowSavingsCompounded = (accumulatedCashFlowSavingsCompounded + cashOutflow_m) * (1 + r_post);
      }

      // Record snapshot
      const currentWealthA_snap = (netCashProceedsNow * Math.pow(1 + r_post, m)) + accumulatedCashFlowSavingsCompounded;
      
      // Wealth B snapshot: current simulated property value at month m minus mortgage balance minus exit fees & CGT (pro-rated)
      const propVal_m = currentPropertyValue * Math.pow(1 + (futurePropertyValueOption === 'growth' ? futurePropertyGrowthRate : (futurePropertyValueFixed / currentPropertyValue - 1) * 100) / 100, m / 12);
      const agentFee_m = propVal_m * (agentCommissionPercent / 100);
      const fees_m = agentFee_m + marketingCosts + conveyancingFees + otherExitFees;
      let cgt_m = 0;
      if (!isPrimaryResidence) {
        const gain_m = propVal_m - originalPurchasePrice - fees_m;
        if (gain_m > 0) {
          cgt_m = (heldForMoreThan12Months ? gain_m * 0.5 : gain_m) * taxRate;
        }
      }
      const netCashLater_snap = Math.max(0, propVal_m - balance - fees_m - cgt_m);

      monthlyTimeline.push({
        month: m,
        wealthA: Math.round(currentWealthA_snap),
        wealthB: Math.round(netCashLater_snap),
        mortgageBalance: Math.round(balance)
      });
    }

    const futureMortgageBalance = balance;

    // Exit costs later
    const agentFeeLater = futurePropertyValue * (agentCommissionPercent / 100);
    const totalFeesLater = agentFeeLater + marketingCosts + conveyancingFees + otherExitFees;

    // CGT Later
    let cgtLater = 0;
    let capitalGainLater = 0;
    if (!isPrimaryResidence) {
      capitalGainLater = futurePropertyValue - originalPurchasePrice - totalFeesLater;
      if (capitalGainLater > 0) {
        const taxableGainLater = heldForMoreThan12Months ? capitalGainLater * 0.5 : capitalGainLater;
        cgtLater = taxableGainLater * taxRate;
      }
    }

    const netCashProceedsLater = Math.max(0, futurePropertyValue - futureMortgageBalance - totalFeesLater - cgtLater);

    // Final Comparison Wealth values at end of period
    const totalWealthA = endingInitialCashA + accumulatedCashFlowSavingsCompounded;
    const totalWealthB = netCashProceedsLater;
    
    const netDifference = Math.abs(totalWealthA - totalWealthB);
    const isASuperior = totalWealthA > totalWealthB;

    return {
      agentFeeNow,
      totalFeesNow,
      cgtNow,
      capitalGainNow,
      netCashProceedsNow,
      endingInitialCashA,
      totalInterestGainedA_pretax,
      totalInterestGainedA_posttax,
      taxPaidOnInterestA,
      accumulatedCashFlowSavingsCompounded,

      totalInterestPaidB,
      totalMortgagePaymentsB,
      totalHoldingExpensesB,
      totalGrossRentB,
      totalManagementFeesB,
      totalTaxImpactB,
      totalCashOutflowsB,
      futureMortgageBalance,
      agentFeeLater,
      totalFeesLater,
      cgtLater,
      capitalGainLater,
      netCashProceedsLater,

      totalWealthA,
      totalWealthB,
      netDifference,
      isASuperior,
      monthlyTimeline
    };
  }, [
    currentPropertyValue, currentMortgageBalance, originalPurchasePrice, isPrimaryResidence, heldForMoreThan12Months,
    agentCommissionPercent, marketingCosts, conveyancingFees, otherExitFees, holdingPeriodMonths,
    futurePropertyValueOption, futurePropertyGrowthRate, futurePropertyValueFixed,
    mortgageInterestRate, mortgageRepaymentType, mortgageRemainingTermYears, annualHoldingCosts,
    isRentedOut, weeklyRent, agentManagementPercent, reinvestmentReturnRate, taxRates,
    salary1, salary2, taxYear, dynamicTaxConfig, monthlyExpenses, householdSurplus
  ]);

  return (
    <div className="space-y-6" id="property-exit-planner">
      {/* Overview Intro Card */}
      <div className="bg-slate-900/60 border border-slate-900 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-5 justify-between items-start md:items-center">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            Property Exit Decision Planner (Sell Now vs. Hold & Sell Later)
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            Compare selling your current property today and reinvesting the net cash proceeds into a High-Yield Savings Account (HYSA) versus holding the property, servicing the mortgage and rates (optionally collecting rental income with negative gearing tax offsets), and selling at a projected future valuation.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => {
              setIsPrimaryResidence(true);
              setOriginalPurchasePrice(450000);
              setCurrentPropertyValue(defaultPropertyValue > 0 ? defaultPropertyValue : 600000);
              setCurrentMortgageBalance(defaultPropertyLoan > 0 ? defaultPropertyLoan : 400000);
              setHeldForMoreThan12Months(true);
              setAgentCommissionPercent(2.0);
              setMarketingCosts(3000);
              setConveyancingFees(1500);
              setOtherExitFees(1000);
              setHoldingPeriodMonths(24);
              setFuturePropertyValueOption('growth');
              setFuturePropertyGrowthRate(5.0);
              setFuturePropertyValueFixed(660000);
              setMortgageInterestRate(6.1);
              setMortgageRepaymentType('pi');
              setMortgageRemainingTermYears(25);
              setAnnualHoldingCosts(5000);
              setIsRentedOut(false);
              setWeeklyRent(550);
              setAgentManagementPercent(7.0);
              setReinvestmentReturnRate(5.0);
              setTaxRateSelection('lower');
              setCustomTaxRate(32.5);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-[10px] font-bold font-mono text-slate-300 transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            onClick={() => setIsPrimaryResidence(!isPrimaryResidence)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono transition-colors cursor-pointer ${
              isPrimaryResidence 
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' 
                : 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
            }`}
          >
            {isPrimaryResidence ? '✓ Primary Residence (0% CGT)' : '⚠ Investment (CGT Applies)'}
          </button>
        </div>
      </div>

      {/* Grid Layout: Controls on Left, Comparison Dashboard on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Parameters Form (4 columns) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Section 1: Property Foundation */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Home className="w-3.5 h-3.5 text-indigo-400" />
              1. Property Foundation
            </h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Original Purchase Price:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                  <input
                    type="number"
                    value={originalPurchasePrice}
                    onChange={(e) => setOriginalPurchasePrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Current Sale Value:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                    <input
                      type="number"
                      value={currentPropertyValue}
                      onChange={(e) => setCurrentPropertyValue(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Mortgage Balance:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                    <input
                      type="number"
                      value={currentMortgageBalance}
                      onChange={(e) => setCurrentMortgageBalance(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Primary Place of Residence (PPOR)?</span>
                  <button
                    onClick={() => setIsPrimaryResidence(!isPrimaryResidence)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${isPrimaryResidence ? 'bg-indigo-600' : 'bg-slate-800'}`}
                  >
                    <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${isPrimaryResidence ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {!isPrimaryResidence && (
                  <div className="flex justify-between items-center text-[11px] bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400">Held for &gt;12 months (50% CGT Discount)?</span>
                    <button
                      onClick={() => setHeldForMoreThan12Months(!heldForMoreThan12Months)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${heldForMoreThan12Months ? 'bg-indigo-600' : 'bg-slate-800'}`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${heldForMoreThan12Months ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Sell Later Future Setup */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              2. Holding Period & Future Growth
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Holding Duration (Months):
                  </label>
                  <input
                    type="number"
                    value={holdingPeriodMonths}
                    onChange={(e) => setHoldingPeriodMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    = {(holdingPeriodMonths / 12).toFixed(1)} years
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Property Valuation Mode:
                  </label>
                  <div className="grid grid-cols-2 bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[10px] font-bold text-center">
                    <button
                      onClick={() => setFuturePropertyValueOption('growth')}
                      className={`py-1.5 rounded-lg cursor-pointer transition-colors ${futurePropertyValueOption === 'growth' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Growth Rate
                    </button>
                    <button
                      onClick={() => setFuturePropertyValueOption('fixed')}
                      className={`py-1.5 rounded-lg cursor-pointer transition-colors ${futurePropertyValueOption === 'fixed' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Fixed Price
                    </button>
                  </div>
                </div>
              </div>

              {futurePropertyValueOption === 'growth' ? (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Annual Property Inflation:
                    </label>
                    <span className="text-xs font-bold text-indigo-400 font-mono">{futurePropertyGrowthRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={futurePropertyGrowthRate}
                    onChange={(e) => setFuturePropertyGrowthRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                    <span>0% (Flat)</span>
                    <span className="text-indigo-400/80 font-bold">Projected Future Price: ${futurePropertyValue.toLocaleString()}</span>
                    <span>15% (Extreme)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Projected Future Sale Price:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                    <input
                      type="number"
                      value={futurePropertyValueFixed}
                      onChange={(e) => setFuturePropertyValueFixed(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: holding costs & rent */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              3. Mortgage & Holding Expenses
            </h3>
            
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Interest Rate (P.A.):
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono">%</span>
                    <input
                      type="number"
                      step="0.01"
                      value={mortgageInterestRate}
                      onChange={(e) => setMortgageInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-7 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Repayment Structure:
                  </label>
                  <select
                    value={mortgageRepaymentType}
                    onChange={(e) => setMortgageRepaymentType(e.target.value as 'pi' | 'io' | 'max_cashflow')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="pi">Principal & Interest (P&I)</option>
                    <option value="io">Interest Only (IO)</option>
                    <option value="max_cashflow">Max Cashflow (Accelerated)</option>
                  </select>
                </div>
              </div>

              {mortgageRepaymentType === 'max_cashflow' && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px]">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Backend Cashflow Synchronization Active</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    This structure uses your exact backend household surplus of <strong className="text-emerald-400">${Math.round(householdSurplus).toLocaleString()}/mo</strong> (Combined Post-Tax Salaries minus <strong className="text-slate-300">${Math.round(monthlyExpenses).toLocaleString()}</strong> monthly expenses) + net rent to pay down the mortgage principal as fast as possible. This minimizes interest paid over the holding term.
                  </p>
                </div>
              )}

              {mortgageRepaymentType === 'pi' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Remaining Mortgage Term (Years):
                  </label>
                  <input
                    type="number"
                    value={mortgageRemainingTermYears}
                    onChange={(e) => setMortgageRemainingTermYears(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Rates, Water, Insurance (P.A.):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                    <input
                      type="number"
                      value={annualHoldingCosts}
                      onChange={(e) => setAnnualHoldingCosts(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    = ${Math.round(annualHoldingCosts / 12)}/month
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Rent Out During Holding?
                  </label>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] text-slate-400">Rented (with management)</span>
                    <button
                      onClick={() => setIsRentedOut(!isRentedOut)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${isRentedOut ? 'bg-indigo-600' : 'bg-slate-800'}`}
                    >
                      <div className={`bg-white w-4.5 h-4.5 rounded-full shadow transition-transform ${isRentedOut ? 'translate-x-4.5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {isRentedOut && (
                <div className="grid grid-cols-2 gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Weekly Rent Collected:
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-500 text-[11px] font-mono">$</span>
                      <input
                        type="number"
                        value={weeklyRent}
                        onChange={(e) => setWeeklyRent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-6 pr-2 text-[11px] font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Property Agent Fee (%):
                    </label>
                    <div className="relative">
                      <span className="absolute right-2.5 top-2 text-slate-500 text-[11px] font-mono">%</span>
                      <input
                        type="number"
                        step="0.1"
                        value={agentManagementPercent}
                        onChange={(e) => setAgentManagementPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-2 pr-6 text-[11px] font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Reinvestment & Taxes */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Coins className="w-3.5 h-3.5 text-indigo-400" />
              4. Reinvestment (Sell Now Cash)
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    HYSA Return (P.A.):
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono">%</span>
                    <input
                      type="number"
                      step="0.05"
                      value={reinvestmentReturnRate}
                      onChange={(e) => setReinvestmentReturnRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-7 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Tax Rate Tier (Interest/CGT):
                  </label>
                  <select
                    value={taxRateSelection}
                    onChange={(e) => setTaxRateSelection(e.target.value as 'lower' | 'higher' | 'custom' | 'none')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="lower">Lower salary ({Math.round(taxRates.lowerRate)}%)</option>
                    <option value="higher">Higher salary ({Math.round(taxRates.higherRate)}%)</option>
                    <option value="custom">Custom Tax Rate</option>
                    <option value="none">Tax Exempt (0%)</option>
                  </select>
                </div>
              </div>

              {taxRateSelection === 'custom' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Custom Tax Rate (%):
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono">%</span>
                    <input
                      type="number"
                      step="0.1"
                      value={customTaxRate}
                      onChange={(e) => setCustomTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-7 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Includes marginal income tax rate + Medicare levy
                  </span>
                </div>
              )}

              {/* Exit Fees Detail Panel (Collapsible / Compact) */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Exit Fees</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-500">Agent Commission:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={agentCommissionPercent}
                      onChange={(e) => setAgentCommissionPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-300 font-mono focus:outline-none text-[10px] font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">Marketing & Photo:</span>
                    <input
                      type="number"
                      value={marketingCosts}
                      onChange={(e) => setMarketingCosts(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-300 font-mono focus:outline-none text-[10px] font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">Solicitor / legal:</span>
                    <input
                      type="number"
                      value={conveyancingFees}
                      onChange={(e) => setConveyancingFees(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-300 font-mono focus:outline-none text-[10px] font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">Mortgage Discharge/Misc:</span>
                    <input
                      type="number"
                      value={otherExitFees}
                      onChange={(e) => setOtherExitFees(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-300 font-mono focus:outline-none text-[10px] font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Comparison & Sim Outcome (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Side-by-Side Headline card */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5 mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">Decision Outcome</span>
                <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
                  {simResults.isASuperior ? (
                    <>
                      <TrendingUp className="w-5.5 h-5.5 text-emerald-400 shrink-0" />
                      Sell Now is optimal by <span className="text-emerald-400">${simResults.netDifference.toLocaleString()}</span>!
                    </>
                  ) : (
                    <>
                      <Building className="w-5.5 h-5.5 text-indigo-400 shrink-0" />
                      Hold & Sell Later is optimal by <span className="text-indigo-400">${simResults.netDifference.toLocaleString()}</span>!
                    </>
                  )}
                </h3>
              </div>
              
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-right">
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Compounded Ending Wealth</span>
                <span className="text-xs text-slate-400 font-semibold">After {holdingPeriodMonths} months ({ (holdingPeriodMonths/12).toFixed(1) } yrs)</span>
              </div>
            </div>

            {/* Twin pillars: Side-by-Side Wealth Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Option A Card */}
              <div className={`p-4.5 rounded-2xl border transition-all ${
                simResults.isASuperior 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-md shadow-emerald-500/5' 
                  : 'bg-slate-950/40 border-slate-800/70'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1.5 rounded-lg ${simResults.isASuperior ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Coins className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Scenario A: Sell Now</span>
                  </div>
                  {simResults.isASuperior && (
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/50 rounded-full font-bold">Optimal</span>
                  )}
                </div>

                <div className="space-y-1 pb-4 border-b border-slate-800/40">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Consolidated Wealth</span>
                  <span className={`text-2xl font-black font-mono tracking-tight ${simResults.isASuperior ? 'text-emerald-400' : 'text-slate-300'}`}>
                    ${Math.round(simResults.totalWealthA).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 pt-4 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Net Sale Proceeds Today:</span>
                    <span className="font-semibold text-slate-200 font-mono">${Math.round(simResults.netCashProceedsNow).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Post-Tax HYSA Gains:</span>
                    <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalInterestGainedA_posttax).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Paid on Interest:</span>
                    <span className="font-semibold text-rose-400/80 font-mono">-${Math.round(simResults.taxPaidOnInterestA).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avoided Holding Costs:</span>
                    <span className="font-semibold text-emerald-400 font-mono" title="If you sell now, you don't pay mortgage interest and rates. Compounding these saved cashflows adds to your ending wealth.">
                      +${Math.round(simResults.accumulatedCashFlowSavingsCompounded).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Option B Card */}
              <div className={`p-4.5 rounded-2xl border transition-all ${
                !simResults.isASuperior 
                  ? 'bg-indigo-950/15 border-indigo-500/40 shadow-md shadow-indigo-500/5' 
                  : 'bg-slate-950/40 border-slate-800/70'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1.5 rounded-lg ${!simResults.isASuperior ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Scenario B: Hold property</span>
                  </div>
                  {!simResults.isASuperior && (
                    <span className="text-[9px] px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800/50 rounded-full font-bold">Optimal</span>
                  )}
                </div>

                <div className="space-y-1 pb-4 border-b border-slate-800/40">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Consolidated Wealth</span>
                  <span className={`text-2xl font-black font-mono tracking-tight ${!simResults.isASuperior ? 'text-indigo-400' : 'text-slate-300'}`}>
                    ${Math.round(simResults.totalWealthB).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 pt-4 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Projected Future Sale:</span>
                    <span className="font-semibold text-slate-200 font-mono">${Math.round(futurePropertyValue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Mortgage:</span>
                    <span className="font-semibold text-slate-300 font-mono">-${Math.round(simResults.futureMortgageBalance).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction Exit Fees:</span>
                    <span className="font-semibold text-rose-400/80 font-mono">-${Math.round(simResults.totalFeesLater).toLocaleString()}</span>
                  </div>
                  {simResults.cgtLater > 0 && (
                    <div className="flex justify-between">
                      <span>Capital Gains Tax:</span>
                      <span className="font-semibold text-rose-400/80 font-mono">-${Math.round(simResults.cgtLater).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Opportunity cost warning alert */}
            <div className="mt-5 p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] leading-relaxed text-slate-400 flex gap-2.5 items-start">
              <Sparkles className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>The Opportunity Cost of Capital Flow:</strong> This model compounds the <strong>mortgage/rates savings</strong> under Scenario A. If you sell today, you avoid paying ${Math.round(simResults.totalMortgagePaymentsB + simResults.totalHoldingExpensesB - simResults.totalNetRentCashB).toLocaleString()} in holding bills. Saving and compounding those avoided cash flows is critical to an apples-to-apples wealth comparison!
              </div>
            </div>
          </div>

          {/* Realistic Cash Breakdown Accordion panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Scenario A detailed ledger */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                Scenario A Capital Ledger (Sell Now)
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Gross Sale Value:</span>
                  <span className="font-semibold text-slate-300 font-mono">${currentPropertyValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Mortgage Paid Off:</span>
                  <span className="font-semibold text-slate-300 font-mono">-${currentMortgageBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Real Estate Agent Fee:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.agentFeeNow).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Conveyancing & legal:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${conveyancingFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Marketing & Photo:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${marketingCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Other Exit Fees:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${otherExitFees.toLocaleString()}</span>
                </div>
                {!isPrimaryResidence && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500 flex items-center gap-1">
                      CGT on Investment:
                      <button onClick={() => setShowCGTInfo(true)} className="text-indigo-400 hover:text-indigo-300">
                        <Info className="w-3 h-3" />
                      </button>
                    </span>
                    <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.cgtNow).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                  <span className="text-slate-300 font-bold">Net Initial Liquid Cash:</span>
                  <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.netCashProceedsNow).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Scenario B Holding Ledger */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 space-y-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-indigo-950 pb-1.5">
                Scenario B Holding Ledger
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Total Mortgage Paid:</span>
                  <span className="font-semibold text-slate-300 font-mono">${Math.round(simResults.totalMortgagePaymentsB).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">└─ Interest Paid:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">${Math.round(simResults.totalInterestPaidB).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">└─ Principal Reduced:</span>
                  <span className="font-semibold text-emerald-400/80 font-mono">${Math.round(currentMortgageBalance - simResults.futureMortgageBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Rates & Water Maintenance:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalHoldingExpensesB).toLocaleString()}</span>
                </div>
                {isRentedOut ? (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-500">Gross Rent Income:</span>
                      <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalGrossRentB).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-500">Agent Management (fees):</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalManagementFeesB).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-500" title="Negative Gearing tax benefits: Deduct interest + holding costs against salary.">Negative Gearing Tax Benefit:</span>
                      <span className={`font-semibold font-mono ${simResults.totalTaxImpactB < 0 ? 'text-emerald-400' : 'text-rose-400/70'}`}>
                        {simResults.totalTaxImpactB < 0 ? `+$${Math.round(Math.abs(simResults.totalTaxImpactB)).toLocaleString()}` : `-$${Math.round(simResults.totalTaxImpactB).toLocaleString()}`}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-1 border-b border-slate-800/40 flex justify-between">
                    <span className="text-slate-500 text-[10px] italic">Property vacant/owner-occupied</span>
                    <span className="text-[10px] text-slate-500">No tax offsets</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                  <span className="text-slate-300 font-bold">Net Out-of-Pocket holding cash flow:</span>
                  <span className="text-rose-300 font-extrabold font-mono">${Math.round(simResults.totalCashOutflowsB).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Scenario B Future Sale Ledger */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 space-y-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-indigo-950 pb-1.5">
                Scenario B Capital Ledger (Sell Later)
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Gross Sale Value (Future):</span>
                  <span className="font-semibold text-slate-300 font-mono">${Math.round(futurePropertyValue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Mortgage Paid Off (Future):</span>
                  <span className="font-semibold text-slate-300 font-mono">-${Math.round(simResults.futureMortgageBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Real Estate Agent Fee:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.agentFeeLater).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Conveyancing & legal:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${conveyancingFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Marketing & Photo:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${marketingCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-500">Other Exit Fees:</span>
                  <span className="font-semibold text-rose-400/70 font-mono">-${otherExitFees.toLocaleString()}</span>
                </div>
                {!isPrimaryResidence && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500 flex items-center gap-1">
                      CGT on Investment:
                      <button onClick={() => setShowCGTInfo(true)} className="text-indigo-400 hover:text-indigo-300">
                        <Info className="w-3 h-3" />
                      </button>
                    </span>
                    <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.cgtLater).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                  <span className="text-slate-300 font-bold">Net Future Liquid Cash:</span>
                  <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.netCashProceedsLater).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Month-by-month projection graph or summary table */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4.5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Wealth Path Projection Over Time
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Incrementally tracked over {holdingPeriodMonths} months</span>
            </div>

            <div className="space-y-2">
              {/* Highlight month snapshots */}
              <div className="grid grid-cols-4 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900 pb-2">
                <span>Milestone</span>
                <span>Month</span>
                <span>Scenario A (Sell Now)</span>
                <span>Scenario B (Hold Property)</span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-4 text-center py-1.5 border-b border-slate-900/30">
                  <span className="font-semibold text-slate-400 text-left pl-2">Start</span>
                  <span className="font-mono text-slate-400">Month 0</span>
                  <span className="font-bold text-slate-300 font-mono">${Math.round(simResults.netCashProceedsNow).toLocaleString()}</span>
                  <span className="font-bold text-slate-400 font-mono">${Math.round(currentPropertyValue - currentMortgageBalance - simResults.totalFeesNow).toLocaleString()}</span>
                </div>

                {holdingPeriodMonths >= 12 && (
                  <div className="grid grid-cols-4 text-center py-1.5 border-b border-slate-900/30 bg-slate-950/20">
                    <span className="font-semibold text-slate-400 text-left pl-2">Year 1</span>
                    <span className="font-mono text-slate-400">Month 12</span>
                    <span className="font-bold text-slate-300 font-mono">
                      ${Math.round(simResults.monthlyTimeline[11]?.wealthA ?? 0).toLocaleString()}
                    </span>
                    <span className="font-bold text-slate-300 font-mono">
                      ${Math.round(simResults.monthlyTimeline[11]?.wealthB ?? 0).toLocaleString()}
                    </span>
                  </div>
                )}

                {holdingPeriodMonths >= 24 && (
                  <div className="grid grid-cols-4 text-center py-1.5 border-b border-slate-900/30">
                    <span className="font-semibold text-slate-400 text-left pl-2">Year 2</span>
                    <span className="font-mono text-slate-400">Month 24</span>
                    <span className="font-bold text-slate-300 font-mono">
                      ${Math.round(simResults.monthlyTimeline[23]?.wealthA ?? 0).toLocaleString()}
                    </span>
                    <span className="font-bold text-slate-300 font-mono">
                      ${Math.round(simResults.monthlyTimeline[23]?.wealthB ?? 0).toLocaleString()}
                    </span>
                  </div>
                )}

                {holdingPeriodMonths % 12 !== 0 && (
                  <div className="grid grid-cols-4 text-center py-1.5 border-b border-slate-900/30">
                    <span className="font-semibold text-slate-400 text-left pl-2">Final</span>
                    <span className="font-mono text-slate-400">Month {holdingPeriodMonths}</span>
                    <span className="font-bold text-emerald-400 font-mono">${Math.round(simResults.totalWealthA).toLocaleString()}</span>
                    <span className="font-bold text-indigo-400 font-mono">${Math.round(simResults.totalWealthB).toLocaleString()}</span>
                  </div>
                )}

                {/* Actual End state comparison row */}
                <div className="grid grid-cols-4 text-center py-2.5 bg-slate-900/85 border border-indigo-900/30 rounded-xl mt-1.5 font-bold">
                  <span className="text-slate-200 text-left pl-2.5">Final Wealth</span>
                  <span className="font-mono text-slate-400">Month {holdingPeriodMonths}</span>
                  <span className={`font-mono ${simResults.isASuperior ? 'text-emerald-400 text-[13px]' : 'text-slate-400'}`}>
                    ${Math.round(simResults.totalWealthA).toLocaleString()}
                  </span>
                  <span className={`font-mono ${!simResults.isASuperior ? 'text-indigo-400 text-[13px]' : 'text-slate-400'}`}>
                    ${Math.round(simResults.totalWealthB).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capital Gains Tax Explanation Modal */}
      {showCGTInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Capital Gains Tax (CGT) Rules
            </h4>
            
            <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
              <p>
                In Australia, when you sell real estate, you may trigger CGT obligations:
              </p>
              <ul className="list-disc pl-4 space-y-2">
                <li>
                  <strong>Primary Residence (PPOR) Exemption:</strong> If you lived in the property as your primary home, you are generally <strong>exempt (0% CGT)</strong> on any price appreciation.
                </li>
                <li>
                  <strong>Investment Property Rules:</strong> Capital gains are added to your personal taxable income for that financial year, taxed at your marginal income tax bracket.
                </li>
                <li>
                  <strong>50% CGT Discount:</strong> If you held the investment property for longer than <strong>12 months</strong>, you receive a standard 50% discount on the net capital gain before it is added to your tax return.
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowCGTInfo(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
