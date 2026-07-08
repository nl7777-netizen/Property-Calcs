import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  monthlyPropertyStrata?: number;
  monthlyPropertyCouncil?: number;
  monthlyPropertyInsurance?: number;
  monthlyPropertyWater?: number;
  monthlyPropertyUtilities?: number;
  loadedInputs?: any;
  onUpdateInputs?: (inputs: any) => void;
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
  monthlyExpenses = 3800,
  monthlyPropertyStrata = 0,
  monthlyPropertyCouncil = 0,
  monthlyPropertyInsurance = 0,
  monthlyPropertyWater = 0,
  monthlyPropertyUtilities = 0,
  loadedInputs,
  onUpdateInputs
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
  const [annualHoldingCosts, setAnnualHoldingCosts] = useState(() => getSavedExitPlannerInput('annualHoldingCosts', 3800)); // Council rates, body corp, water, maintenance
  const [annualInsurance, setAnnualInsurance] = useState(() => getSavedExitPlannerInput('annualInsurance', 1200)); // Landlord/property insurance

  // Detailed Building Expenses (derived from App.tsx props to prevent duplication)
  const strataCost = monthlyPropertyStrata;
  const strataFreq = 'monthly';

  const councilCost = monthlyPropertyCouncil;
  const councilFreq = 'monthly';

  const insuranceCost = monthlyPropertyInsurance;
  const insuranceFreq = 'monthly';

  // Detailed Utilities (derived from App.tsx props to prevent duplication)
  const internetCost = monthlyPropertyUtilities;
  const internetFreq = 'monthly';

  const electricityCost = 0;
  const electricityFreq = 'monthly';

  const gasCost = 0;
  const gasFreq = 'monthly';

  const waterCost = monthlyPropertyWater;
  const waterFreq = 'monthly';

  // Rental income during holding
  const [isRentedOut, setIsRentedOut] = useState(() => getSavedExitPlannerInput('isRentedOut', false));
  const [weeklyRent, setWeeklyRent] = useState(() => getSavedExitPlannerInput('weeklyRent', 550));
  const [agentManagementPercent, setAgentManagementPercent] = useState(() => getSavedExitPlannerInput('agentManagementPercent', 7.0));

  // Reinvestment details
  const [reinvestmentReturnRate, setReinvestmentReturnRate] = useState(() => getSavedExitPlannerInput('reinvestmentReturnRate', 5.0));
  const [monthlyExpensesWithParentsInput, setMonthlyExpensesWithParentsInput] = useState(() => getSavedExitPlannerInput('monthlyExpensesWithParents', 1200));
  const [monthlyExpensesWithParents, setMonthlyExpensesWithParents] = useState(monthlyExpensesWithParentsInput);
  const [taxRateSelection, setTaxRateSelection] = useState<'lower' | 'higher' | 'custom' | 'none'>(() => getSavedExitPlannerInput('taxRateSelection', 'lower'));
  const [customTaxRate, setCustomTaxRate] = useState(() => getSavedExitPlannerInput('customTaxRate', 32.5));

  // Debounce the user input for monthlyExpensesWithParents to prevent infinite loop and typing lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setMonthlyExpensesWithParents(monthlyExpensesWithParentsInput);
    }, 400);

    return () => clearTimeout(handler);
  }, [monthlyExpensesWithParentsInput]);

  // Track last saved state to prevent infinite update loops and stale closure glitches
  const lastSavedRef = useRef<any>(null);
  const isSyncingRef = useRef(false);

  // Save changes to localStorage and notify parent App
  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
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
      annualInsurance,
      isRentedOut,
      weeklyRent,
      agentManagementPercent,
      reinvestmentReturnRate,
      monthlyExpensesWithParents,
      taxRateSelection,
      customTaxRate
    };

    const keys = [
      'originalPurchasePrice',
      'currentPropertyValue',
      'currentMortgageBalance',
      'isPrimaryResidence',
      'heldForMoreThan12Months',
      'agentCommissionPercent',
      'marketingCosts',
      'conveyancingFees',
      'otherExitFees',
      'holdingPeriodMonths',
      'futurePropertyValueOption',
      'futurePropertyGrowthRate',
      'futurePropertyValueFixed',
      'mortgageInterestRate',
      'mortgageRepaymentType',
      'mortgageRemainingTermYears',
      'annualHoldingCosts',
      'annualInsurance',
      'isRentedOut',
      'weeklyRent',
      'agentManagementPercent',
      'reinvestmentReturnRate',
      'monthlyExpensesWithParents',
      'taxRateSelection',
      'customTaxRate'
    ];
    const isIdentical = lastSavedRef.current && keys.every(
      key => inputs[key] === lastSavedRef.current[key]
    );
    if (isIdentical) return;

    lastSavedRef.current = inputs;
    localStorage.setItem('property_dashboard_exit_planner_inputs', JSON.stringify(inputs));
    if (onUpdateInputs) {
      onUpdateInputs(inputs);
    }
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
    annualInsurance,
    isRentedOut,
    weeklyRent,
    agentManagementPercent,
    reinvestmentReturnRate,
    monthlyExpensesWithParents,
    taxRateSelection,
    customTaxRate,
    onUpdateInputs
  ]);

  // Load inputs when loadedInputs changes from parent App
  useEffect(() => {
    if (loadedInputs) {
      // Check if the loaded inputs are identical to our last saved state.
      // If they are, skip setting state to prevent infinite render loops and stale closure resets.
      const keys = [
        'originalPurchasePrice',
        'currentPropertyValue',
        'currentMortgageBalance',
        'isPrimaryResidence',
        'heldForMoreThan12Months',
        'agentCommissionPercent',
        'marketingCosts',
        'conveyancingFees',
        'otherExitFees',
        'holdingPeriodMonths',
        'futurePropertyValueOption',
        'futurePropertyGrowthRate',
        'futurePropertyValueFixed',
        'mortgageInterestRate',
        'mortgageRepaymentType',
        'mortgageRemainingTermYears',
        'annualHoldingCosts',
        'annualInsurance',
        'isRentedOut',
        'weeklyRent',
        'agentManagementPercent',
        'reinvestmentReturnRate',
        'monthlyExpensesWithParents',
        'taxRateSelection',
        'customTaxRate'
      ];
      const isIdentical = lastSavedRef.current && keys.every(
        key => loadedInputs[key] === lastSavedRef.current[key]
      );
      if (isIdentical) return;

      isSyncingRef.current = true;

      if (loadedInputs.originalPurchasePrice !== undefined) {
        setOriginalPurchasePrice(loadedInputs.originalPurchasePrice);
      }
      if (loadedInputs.currentPropertyValue !== undefined) {
        setCurrentPropertyValue(loadedInputs.currentPropertyValue);
      }
      if (loadedInputs.currentMortgageBalance !== undefined) {
        setCurrentMortgageBalance(loadedInputs.currentMortgageBalance);
      }
      if (loadedInputs.isPrimaryResidence !== undefined) {
        setIsPrimaryResidence(loadedInputs.isPrimaryResidence);
      }
      if (loadedInputs.heldForMoreThan12Months !== undefined) {
        setHeldForMoreThan12Months(loadedInputs.heldForMoreThan12Months);
      }
      if (loadedInputs.agentCommissionPercent !== undefined) {
        setAgentCommissionPercent(loadedInputs.agentCommissionPercent);
      }
      if (loadedInputs.marketingCosts !== undefined) {
        setMarketingCosts(loadedInputs.marketingCosts);
      }
      if (loadedInputs.conveyancingFees !== undefined) {
        setConveyancingFees(loadedInputs.conveyancingFees);
      }
      if (loadedInputs.otherExitFees !== undefined) {
        setOtherExitFees(loadedInputs.otherExitFees);
      }
      if (loadedInputs.holdingPeriodMonths !== undefined) {
        setHoldingPeriodMonths(loadedInputs.holdingPeriodMonths);
      }
      if (loadedInputs.futurePropertyValueOption !== undefined) {
        setFuturePropertyValueOption(loadedInputs.futurePropertyValueOption);
      }
      if (loadedInputs.futurePropertyGrowthRate !== undefined) {
        setFuturePropertyGrowthRate(loadedInputs.futurePropertyGrowthRate);
      }
      if (loadedInputs.futurePropertyValueFixed !== undefined) {
        setFuturePropertyValueFixed(loadedInputs.futurePropertyValueFixed);
      }
      if (loadedInputs.mortgageInterestRate !== undefined) {
        setMortgageInterestRate(loadedInputs.mortgageInterestRate);
      }
      if (loadedInputs.mortgageRepaymentType !== undefined) {
        setMortgageRepaymentType(loadedInputs.mortgageRepaymentType);
      }
      if (loadedInputs.mortgageRemainingTermYears !== undefined) {
        setMortgageRemainingTermYears(loadedInputs.mortgageRemainingTermYears);
      }
      if (loadedInputs.annualHoldingCosts !== undefined) {
        setAnnualHoldingCosts(loadedInputs.annualHoldingCosts);
      }
      if (loadedInputs.annualInsurance !== undefined) {
        setAnnualInsurance(loadedInputs.annualInsurance);
      }
      if (loadedInputs.isRentedOut !== undefined) {
        setIsRentedOut(loadedInputs.isRentedOut);
      }
      if (loadedInputs.weeklyRent !== undefined) {
        setWeeklyRent(loadedInputs.weeklyRent);
      }
      if (loadedInputs.agentManagementPercent !== undefined) {
        setAgentManagementPercent(loadedInputs.agentManagementPercent);
      }
      if (loadedInputs.reinvestmentReturnRate !== undefined) {
        setReinvestmentReturnRate(loadedInputs.reinvestmentReturnRate);
      }
      if (loadedInputs.monthlyExpensesWithParents !== undefined) {
        setMonthlyExpensesWithParentsInput(loadedInputs.monthlyExpensesWithParents);
        setMonthlyExpensesWithParents(loadedInputs.monthlyExpensesWithParents);
      }
      if (loadedInputs.taxRateSelection !== undefined) {
        setTaxRateSelection(loadedInputs.taxRateSelection);
      }
      if (loadedInputs.customTaxRate !== undefined) {
        setCustomTaxRate(loadedInputs.customTaxRate);
      }
    }
  }, [loadedInputs]);

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
    const taxRateC = taxRate;

    const monthlyStrata = monthlyPropertyStrata;
    const monthlyCouncil = monthlyPropertyCouncil;
    const monthlyInsuranceVal = monthlyPropertyInsurance;
    const monthlyWater = monthlyPropertyWater;

    const monthlyBuildingExpenses = monthlyStrata + monthlyCouncil + monthlyInsuranceVal;
    const monthlyUtilities = monthlyPropertyUtilities;

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
    let totalInsurancePaidB = 0;
    let totalGrossRentB = 0;
    let totalManagementFeesB = 0;
    let totalNetRentCashB = 0;
    let totalTaxImpactB = 0;
    let totalCashOutflowsB = 0;
    let totalRatesStrataB = 0;
    let totalUtilitiesB = 0;

    const monthlyGrossRent = isRentedOut ? (weeklyRent * 52) / 12 : 0;
    const monthlyManagementFee = monthlyGrossRent * (agentManagementPercent / 100);
    const monthlyNetRentCash = monthlyGrossRent - monthlyManagementFee;

    // --- SCENARIO C: RENT OUT & MOVE IN WITH PARENTS RENT FREE ---
    let balanceC = currentMortgageBalance;
    let totalInterestPaidC = 0;
    let totalMortgagePaymentsC = 0;
    let totalHoldingExpensesC = 0;
    let totalInsurancePaidC = 0;
    let totalGrossRentC = 0;
    let totalManagementFeesC = 0;
    let totalNetRentCashC = 0;
    let totalTaxImpactC = 0;
    let totalCashOutflowsC = 0;
    let totalRatesStrataC = 0;
    let totalWaterC = 0;

    // For Scenario C, it is ALWAYS rented out:
    const monthlyGrossRentC = (weeklyRent * 52) / 12;
    const monthlyManagementFeeC = monthlyGrossRentC * (agentManagementPercent / 100);
    const monthlyNetRentCashC = monthlyGrossRentC - monthlyManagementFeeC;

    const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
    const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
    const netMonthly1 = taxBreakdown1.netPay / 12;
    const netMonthly2 = taxBreakdown2.netPay / 12;
    const combinedNetMonthly = netMonthly1 + netMonthly2;
    const householdSurplusC = Math.max(0, combinedNetMonthly - monthlyExpensesWithParents);

    // Implied Annual Growth Rate for 'fixed' property value option (CAGR)
    const impliedAnnualGrowthRate = N > 0 && futurePropertyValueFixed > 0 && currentPropertyValue > 0
      ? (Math.pow(futurePropertyValueFixed / currentPropertyValue, 12 / N) - 1) * 100
      : 0;
    const annualPropertyRate = futurePropertyValueOption === 'growth' ? futurePropertyGrowthRate : impliedAnnualGrowthRate;

    // Simulation array for charts
    const monthlyTimeline: Array<{
      month: number;
      wealthA: number;
      wealthB: number;
      wealthC: number;
      mortgageBalance: number;
      mortgageBalanceC: number;
    }> = [];

    let accumulatedSurplusA = 0;
    let accumulatedSurplusB = 0;
    let accumulatedSurplusC = 0;

    let cashSavedB = 0;
    let cashSavedC = 0;

    let accumulatedLivingSavingsCompoundedA = 0;
    let accumulatedPropertySavingsCompoundedA = 0;
    let accumulatedAvoidedMortgageCompoundedA = 0;
    let accumulatedAvoidedBuildingCompoundedA = 0;
    let accumulatedAvoidedUtilitiesCompoundedA = 0;

    let accumulatedLivingSavingsCompoundedC = 0;
    let accumulatedPropertySavingsCompoundedC = 0;
    let accumulatedExtraSavingsCompoundedC = 0;

    for (let m = 1; m <= N; m++) {
      // --- Scenario B (Hold & Live in Property) ---
      const interest_m = balance * monthlyRate;
      let payment_m = 0;

      if (mortgageRepaymentType === 'pi') {
        payment_m = piMonthlyPayment;
      } else if (mortgageRepaymentType === 'max_cashflow') {
        const availableMaxCashflow = householdSurplus - monthlyBuildingExpenses - monthlyUtilities;
        payment_m = Math.max(interest_m, availableMaxCashflow);
      } else {
        payment_m = interest_m; // Interest only
      }

      const principal_paid_m = Math.min(balance, Math.max(0, payment_m - interest_m));
      payment_m = interest_m + principal_paid_m;
      balance = balance - principal_paid_m;

      totalInterestPaidB += interest_m;
      totalMortgagePaymentsB += payment_m;
      totalHoldingExpensesB += monthlyBuildingExpenses;
      totalInsurancePaidB += monthlyInsuranceVal;
      totalRatesStrataB += (monthlyStrata + monthlyCouncil);
      totalUtilitiesB += monthlyUtilities;

      const cashOutflow_m = payment_m + monthlyBuildingExpenses + monthlyUtilities;
      totalCashOutflowsB += cashOutflow_m;

      const surplusB_m = combinedNetMonthly - monthlyExpenses - cashOutflow_m;
      accumulatedSurplusB = (accumulatedSurplusB + surplusB_m) * (1 + r_post);

      if (balance <= 0) {
        cashSavedB = (cashSavedB + surplusB_m) * (1 + r_post);
      }


      // --- Scenario C (Hold, Rent Out & Live with Parents) ---
      const interest_C_m = balanceC * monthlyRate;
      let payment_C_m = 0;

      if (mortgageRepaymentType === 'pi') {
        payment_C_m = piMonthlyPayment;
      } else if (mortgageRepaymentType === 'max_cashflow') {
        const availableMaxCashflowC = combinedNetMonthly - monthlyExpensesWithParents + monthlyNetRentCashC;
        payment_C_m = Math.max(interest_C_m, availableMaxCashflowC);
      } else {
        payment_C_m = interest_C_m; // Interest only
      }

      const principal_paid_C_m = Math.min(balanceC, Math.max(0, payment_C_m - interest_C_m));
      payment_C_m = interest_C_m + principal_paid_C_m;
      balanceC = balanceC - principal_paid_C_m;

      totalInterestPaidC += interest_C_m;
      totalMortgagePaymentsC += payment_C_m;
      totalHoldingExpensesC += monthlyBuildingExpenses;
      totalInsurancePaidC += monthlyInsuranceVal;
      totalRatesStrataC += (monthlyStrata + monthlyCouncil);
      totalWaterC += monthlyWater;

      totalGrossRentC += monthlyGrossRentC;
      totalManagementFeesC += monthlyManagementFeeC;
      totalNetRentCashC += monthlyNetRentCashC;

      // Taxable profit deduction includes: mortgage interest + strata + council + insurance + landlord utilities (only water) + management fees
      const deductions_C_m = interest_C_m + monthlyBuildingExpenses + monthlyWater + monthlyManagementFeeC;
      const taxableProfit_C_m = monthlyGrossRentC - deductions_C_m;
      const taxImpact_C_m = taxableProfit_C_m * taxRateC;
      totalTaxImpactC += taxImpact_C_m;

      const cashOutflow_C_m = payment_C_m + monthlyBuildingExpenses + monthlyWater + monthlyManagementFeeC - monthlyGrossRentC + taxImpact_C_m;
      totalCashOutflowsC += cashOutflow_C_m;

      const surplusC_m = combinedNetMonthly - monthlyExpensesWithParents - cashOutflow_C_m;
      accumulatedSurplusC = (accumulatedSurplusC + surplusC_m) * (1 + r_post);

      if (balanceC <= 0) {
        cashSavedC = (cashSavedC + surplusC_m) * (1 + r_post);
      }


      // --- Scenario A (Sell ASAP & Live with Parents) ---
      const surplusA_m = combinedNetMonthly - monthlyExpensesWithParents;
      accumulatedSurplusA = (accumulatedSurplusA + surplusA_m) * (1 + r_post);


      // --- Relative Extra Savings Decompositions relative to Scenario B (baseline) ---
      const extraLivingSavingsA_m = monthlyExpenses - monthlyExpensesWithParents;
      const extraPropertySavingsA_m = cashOutflow_m;
      const avoidedMortgageA_m = payment_m;
      const avoidedBuildingA_m = monthlyBuildingExpenses;
      const avoidedUtilitiesA_m = monthlyUtilities;

      const extraLivingSavingsC_m = monthlyExpenses - monthlyExpensesWithParents;
      const extraPropertySavingsC_m = cashOutflow_m - cashOutflow_C_m;

      accumulatedLivingSavingsCompoundedA = (accumulatedLivingSavingsCompoundedA + extraLivingSavingsA_m) * (1 + r_post);
      accumulatedAvoidedMortgageCompoundedA = (accumulatedAvoidedMortgageCompoundedA + avoidedMortgageA_m) * (1 + r_post);
      accumulatedAvoidedBuildingCompoundedA = (accumulatedAvoidedBuildingCompoundedA + avoidedBuildingA_m) * (1 + r_post);
      accumulatedAvoidedUtilitiesCompoundedA = (accumulatedAvoidedUtilitiesCompoundedA + avoidedUtilitiesA_m) * (1 + r_post);
      accumulatedPropertySavingsCompoundedA = accumulatedAvoidedMortgageCompoundedA + accumulatedAvoidedBuildingCompoundedA + accumulatedAvoidedUtilitiesCompoundedA;

      accumulatedLivingSavingsCompoundedC = (accumulatedLivingSavingsCompoundedC + extraLivingSavingsC_m) * (1 + r_post);
      accumulatedPropertySavingsCompoundedC = (accumulatedPropertySavingsCompoundedC + extraPropertySavingsC_m) * (1 + r_post);
      accumulatedExtraSavingsCompoundedC = (accumulatedExtraSavingsCompoundedC + (extraLivingSavingsC_m + extraPropertySavingsC_m)) * (1 + r_post);


      // --- Snapshots for Charts ---
      const currentWealthA_snap = (netCashProceedsNow * Math.pow(1 + r_post, m)) + accumulatedSurplusA;
      
      const propVal_m = currentPropertyValue * Math.pow(1 + annualPropertyRate / 100, m / 12);
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
      const currentWealthB_snap = netCashLater_snap + cashSavedB;

      let cgt_C_m = 0;
      if (!isPrimaryResidence) {
        const gain_C_m = propVal_m - originalPurchasePrice - fees_m;
        if (gain_C_m > 0) {
          cgt_C_m = (heldForMoreThan12Months ? gain_C_m * 0.5 : gain_C_m) * taxRateC;
        }
      }
      const netCashLater_C_snap = Math.max(0, propVal_m - balanceC - fees_m - cgt_C_m);
      const currentWealthC_snap = netCashLater_C_snap + cashSavedC;

      monthlyTimeline.push({
        month: m,
        wealthA: Math.round(currentWealthA_snap),
        wealthB: Math.round(currentWealthB_snap),
        wealthC: Math.round(currentWealthC_snap),
        mortgageBalance: Math.round(balance),
        mortgageBalanceC: Math.round(balanceC)
      });
    }

    const futureMortgageBalance = balance;
    const futureMortgageBalanceC = balanceC;

    // Exit costs later
    const agentFeeLater = futurePropertyValue * (agentCommissionPercent / 100);
    const totalFeesLater = agentFeeLater + marketingCosts + conveyancingFees + otherExitFees;

    // CGT Later B
    let cgtLater = 0;
    let capitalGainLater = 0;
    if (!isPrimaryResidence) {
      capitalGainLater = futurePropertyValue - originalPurchasePrice - totalFeesLater;
      if (capitalGainLater > 0) {
        const taxableGainLater = heldForMoreThan12Months ? capitalGainLater * 0.5 : capitalGainLater;
        cgtLater = taxableGainLater * taxRate;
      }
    }

    // CGT Later C
    let cgtLaterC = 0;
    let capitalGainLaterC = 0;
    if (!isPrimaryResidence) {
      capitalGainLaterC = futurePropertyValue - originalPurchasePrice - totalFeesLater;
      if (capitalGainLaterC > 0) {
        const taxableGainLaterC = heldForMoreThan12Months ? capitalGainLaterC * 0.5 : capitalGainLaterC;
        cgtLaterC = taxableGainLaterC * taxRateC;
      }
    }

    const netCashProceedsLater = Math.max(0, futurePropertyValue - futureMortgageBalance - totalFeesLater - cgtLater);
    const netCashProceedsLaterC = Math.max(0, futurePropertyValue - futureMortgageBalanceC - totalFeesLater - cgtLaterC);

    // Final Comparison Wealth values at end of period (including Cash Saved buckets)
    const totalWealthA = endingInitialCashA + accumulatedSurplusA;
    const totalWealthB = netCashProceedsLater + cashSavedB;
    const totalWealthC = netCashProceedsLaterC + cashSavedC;
    
    // Find the highest wealth
    const maxWealth = Math.max(totalWealthA, totalWealthB, totalWealthC);
    const isASuperior = totalWealthA >= totalWealthB && totalWealthA >= totalWealthC;
    const isBSuperior = totalWealthB >= totalWealthA && totalWealthB >= totalWealthC;
    const isCSuperior = totalWealthC >= totalWealthA && totalWealthC >= totalWealthB;

    let optimalScenarioName = '';
    let netDifference = 0;
    if (isASuperior) {
      optimalScenarioName = 'Scenario A: Sell ASAP & Live with Parents';
      netDifference = totalWealthA - Math.max(totalWealthB, totalWealthC);
    } else if (isBSuperior) {
      optimalScenarioName = 'Scenario B: Hold Property & Live in It';
      netDifference = totalWealthB - Math.max(totalWealthA, totalWealthC);
    } else {
      optimalScenarioName = 'Scenario C: Rent Out & Live with Parents';
      netDifference = totalWealthC - Math.max(totalWealthA, totalWealthB);
    }

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
      accumulatedSurplusA,
      accumulatedSurplusB,
      accumulatedSurplusC,
      cashSavedB,
      cashSavedC,
      accumulatedLivingSavingsCompoundedA,
      accumulatedPropertySavingsCompoundedA,
      accumulatedAvoidedMortgageCompoundedA,
      accumulatedAvoidedBuildingCompoundedA,
      accumulatedAvoidedUtilitiesCompoundedA,

      totalInterestPaidB,
      totalMortgagePaymentsB,
      totalHoldingExpensesB,
      totalInsurancePaidB,
      totalRatesStrataB,
      totalUtilitiesB,
      totalGrossRentB: 0,
      totalManagementFeesB: 0,
      totalTaxImpactB: 0,
      totalCashOutflowsB,
      futureMortgageBalance,
      agentFeeLater,
      totalFeesLater,
      cgtLater,
      capitalGainLater,
      netCashProceedsLater,

      // Scenario C outputs
      totalInterestPaidC,
      totalMortgagePaymentsC,
      totalHoldingExpensesC,
      totalInsurancePaidC,
      totalRatesStrataC,
      totalWaterC,
      totalGrossRentC,
      totalManagementFeesC,
      totalTaxImpactC,
      totalCashOutflowsC,
      futureMortgageBalanceC,
      cgtLaterC,
      capitalGainLaterC,
      netCashProceedsLaterC,
      totalWealthC,
      accumulatedExtraSavingsCompoundedC,
      accumulatedLivingSavingsCompoundedC,
      accumulatedPropertySavingsCompoundedC,

      totalWealthA,
      totalWealthB,
      netDifference,
      isASuperior,
      isBSuperior,
      isCSuperior,
      optimalScenarioName,
      monthlyTimeline
    };
  }, [
    currentPropertyValue, currentMortgageBalance, originalPurchasePrice, isPrimaryResidence, heldForMoreThan12Months,
    agentCommissionPercent, marketingCosts, conveyancingFees, otherExitFees, holdingPeriodMonths,
    futurePropertyValueOption, futurePropertyGrowthRate, futurePropertyValueFixed,
    mortgageInterestRate, mortgageRepaymentType, mortgageRemainingTermYears, annualHoldingCosts, annualInsurance,
    strataCost, strataFreq, councilCost, councilFreq, insuranceCost, insuranceFreq,
    internetCost, internetFreq, electricityCost, electricityFreq, gasCost, gasFreq, waterCost, waterFreq,
    isRentedOut, weeklyRent, agentManagementPercent, reinvestmentReturnRate, taxRates,
    salary1, salary2, taxYear, dynamicTaxConfig, monthlyExpenses, householdSurplus, monthlyExpensesWithParents
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
              setAnnualHoldingCosts(3800);
              setAnnualInsurance(1200);
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
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Annual Property Inflation (%):
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono">%</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={futurePropertyGrowthRate}
                      onChange={(e) => setFuturePropertyGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-7 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                    <span className="text-indigo-400/80 font-bold">Projected Future Price: ${futurePropertyValue.toLocaleString()}</span>
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

              {/* Global Settings Cost Notice */}
              <div className="border-t border-slate-800/80 pt-4 pb-1 space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Property Holding & Utility Costs
                </span>
                <div className="bg-slate-950/55 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[10px] uppercase tracking-wider font-mono">
                    <Info className="w-3.5 h-3.5" />
                    <span>Managed in Main Settings</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
                    All strata, council rates, insurance, water, and utilities are now managed globally under the **Settings Panel** tab to keep calculations consistent and prevent duplicate inputs.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-900 font-mono text-slate-500">
                    <div>
                      Strata: <span className="text-slate-300 font-semibold">${monthlyPropertyStrata}/mo</span>
                    </div>
                    <div>
                      Council: <span className="text-slate-300 font-semibold">${monthlyPropertyCouncil}/mo</span>
                    </div>
                    <div>
                      Insurance: <span className="text-slate-300 font-semibold">${monthlyPropertyInsurance}/mo</span>
                    </div>
                    <div>
                      Water: <span className="text-slate-300 font-semibold">${monthlyPropertyWater}/mo</span>
                    </div>
                    <div className="col-span-2">
                      Utilities: <span className="text-slate-300 font-semibold">${monthlyPropertyUtilities}/mo</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80 space-y-3 mt-1">
                <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
                  Scenario C Rental Configurations
                </span>
                <div className="grid grid-cols-2 gap-3">
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
              </div>

              {/* Scenario A & C living expenses field */}
              <div className="pt-3 border-t border-slate-800/60 mt-3.5 space-y-2">
                <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-indigo-400" />
                  Scenario A & C Settings (Live with Parents)
                </span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  For both **Scenario A (Sell ASAP)** and **Scenario C (Rent Out)**, you live with parents rent-free. Enter your reduced living expenses and review assigned tax rate details below:
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Expenses (With Parents):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                      <input
                        type="number"
                        value={monthlyExpensesWithParentsInput === 0 ? '' : monthlyExpensesWithParentsInput}
                        onChange={(e) => setMonthlyExpensesWithParentsInput(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-semibold text-slate-200 font-mono focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Scenario C Tax Rate:
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-indigo-300 font-mono h-[38px] flex items-center">
                      {taxRateSelection === 'none' ? '0.0%' : `${(taxRates.activeRate * 100).toFixed(1)}% (${taxRateSelection === 'lower' ? 'Lower Partner' : taxRateSelection === 'higher' ? 'Higher Partner' : 'Custom'})`}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 block mt-1.5 font-sans leading-normal">
                  This represents your reduced living cost (food, transport, phone, etc.) since you avoid rent/mortgage holding costs of a primary home.
                </span>
              </div>
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
                  ) : simResults.isBSuperior ? (
                    <>
                      <Building className="w-5.5 h-5.5 text-indigo-400 shrink-0" />
                      Hold & Sell Later is optimal by <span className="text-indigo-400">${simResults.netDifference.toLocaleString()}</span>!
                    </>
                  ) : (
                    <>
                      <Home className="w-5.5 h-5.5 text-indigo-400 shrink-0" />
                      Parents & Rent Out is optimal by <span className="text-indigo-400">${simResults.netDifference.toLocaleString()}</span>!
                    </>
                  )}
                </h3>
              </div>
              
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-right">
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Compounded Ending Wealth</span>
                <span className="text-xs text-slate-400 font-semibold">After {holdingPeriodMonths} months ({ (holdingPeriodMonths/12).toFixed(1) } yrs)</span>
              </div>
            </div>

            {/* Three pillars: Side-by-Side Wealth Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
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
                    <span>Post-Tax HYSA Gains (Compound Interest):</span>
                    <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalInterestGainedA_posttax).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Surplus Saved (Cash):</span>
                    <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.accumulatedSurplusA).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Paid on Interest:</span>
                    <span className="font-semibold text-rose-400/80 font-mono">-${Math.round(simResults.taxPaidOnInterestA).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Option B Card */}
              <div className={`p-4.5 rounded-2xl border transition-all ${
                simResults.isBSuperior 
                  ? 'bg-indigo-950/15 border-indigo-500/40 shadow-md shadow-indigo-500/5' 
                  : 'bg-slate-950/40 border-slate-800/70'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1.5 rounded-lg ${simResults.isBSuperior ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Scenario B: Hold Property</span>
                  </div>
                  {simResults.isBSuperior && (
                    <span className="text-[9px] px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800/50 rounded-full font-bold">Optimal</span>
                  )}
                </div>

                <div className="space-y-1 pb-4 border-b border-slate-800/40">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Consolidated Wealth</span>
                  <span className={`text-2xl font-black font-mono tracking-tight ${simResults.isBSuperior ? 'text-indigo-400' : 'text-slate-300'}`}>
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
                  <div className="flex justify-between">
                    <span>Cash Saved (After Payoff):</span>
                    <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.cashSavedB).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Option C Card */}
              <div className={`p-4.5 rounded-2xl border transition-all ${
                simResults.isCSuperior 
                  ? 'bg-indigo-950/20 border-indigo-400 shadow-md shadow-indigo-400/5' 
                  : 'bg-slate-950/40 border-slate-800/70'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1.5 rounded-lg ${simResults.isCSuperior ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Home className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Scenario C: Parents & Rent</span>
                  </div>
                  {simResults.isCSuperior && (
                    <span className="text-[9px] px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800/50 rounded-full font-bold">Optimal</span>
                  )}
                </div>

                <div className="space-y-1 pb-4 border-b border-slate-800/40">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Consolidated Wealth</span>
                  <span className={`text-2xl font-black font-mono tracking-tight ${simResults.isCSuperior ? 'text-indigo-400' : 'text-slate-300'}`}>
                    ${Math.round(simResults.totalWealthC).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 pt-4 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Projected Future Sale:</span>
                    <span className="font-semibold text-slate-200 font-mono">${Math.round(futurePropertyValue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Mortgage C:</span>
                    <span className="font-semibold text-slate-300 font-mono">-${Math.round(simResults.futureMortgageBalanceC).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction Exit Fees:</span>
                    <span className="font-semibold text-rose-400/80 font-mono">-${Math.round(simResults.totalFeesLater).toLocaleString()}</span>
                  </div>
                  {simResults.cgtLaterC > 0 && (
                    <div className="flex justify-between">
                      <span>Capital Gains Tax:</span>
                      <span className="font-semibold text-rose-400/80 font-mono">-${Math.round(simResults.cgtLaterC).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Cash Saved (After Payoff):</span>
                    <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.cashSavedC).toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Simplified wealth comparison alert */}
            <div className="mt-5 p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] leading-relaxed text-slate-400 flex gap-2.5 items-start">
              <Sparkles className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>Simplified Wealth Comparison:</strong> This model compares the ending equity and reinvestment positions of your options directly. Under Scenario A, you reinvest your net property proceeds immediately to earn compounded interest. Under Scenarios B and C, you hold the property and build equity through property growth and mortgage principal paydown, taking into account future sale fees and capital gains tax.
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
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40 mt-2.5">
                  <span className="text-slate-500">Compounded Reinvestment Gains:</span>
                  <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalInterestGainedA_posttax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-emerald-400">Monthly Surplus Saved (Cash):</span>
                  <span className="font-bold text-emerald-400 font-mono">+${Math.round(simResults.accumulatedSurplusA).toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                  <span className="text-slate-300 font-bold">Consolidated Wealth A:</span>
                  <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.totalWealthA).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Scenario B Combined Ledgers */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-indigo-950 pb-1.5">
                  Scenario B Holding Ledger
                </span>

                <div className="space-y-2 text-xs mt-2.5">
                  {/* Unrecoverable Holding Costs */}
                  <div className="space-y-1.5 pb-2 border-b border-slate-800/30">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Unrecoverable Holding Costs</span>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Mortgage Interest Paid:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalInterestPaidB).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Strata Levy & Council Rates:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalRatesStrataB).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Building & Property Insurance:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalInsurancePaidB).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Utilities & Running Expenses:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalUtilitiesB).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Equity-Building Repayments */}
                  <div className="space-y-1.5 pt-1.5 pb-2 border-b border-slate-800/30">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Equity-Building Repayments</span>
                    <div className="flex justify-between items-center py-0.5 pl-1.5" title="Paying down the mortgage balance is an asset transfer, not an unrecoverable expense. It is recovered in full upon sale.">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        Mortgage Principal Reduced:
                        <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded px-1 font-bold">Equity Boost</span>
                      </span>
                      <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalMortgagePaymentsB - simResults.totalInterestPaidB).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="py-1 border-b border-slate-800/40 flex justify-between">
                    <span className="text-slate-400 text-[10px] italic">Property Owner-Occupied (Lived-in)</span>
                    <span className="text-[10px] text-slate-500 font-medium">No rent income / tax offsets</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60" title="The total out-of-pocket cash paid during this period (Unrecoverable Costs + Principal Repayments).">
                    <span className="text-slate-300 font-bold">Net Out-of-Pocket Cash flow:</span>
                    <span className="text-rose-300 font-extrabold font-mono">${Math.round(simResults.totalCashOutflowsB).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/40">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-indigo-950 pb-1.5">
                  Scenario B Capital Ledger (Sell Later)
                </span>

                <div className="space-y-2 text-xs mt-2.5">
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
                  {!isPrimaryResidence && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-500">CGT on Investment:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.cgtLater).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                    <span className="text-slate-300 font-bold">Property Net Cash Proceeds (Equity):</span>
                    <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.netCashProceedsLater).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-emerald-400 font-semibold">Cash Saved after Payoff:</span>
                    <span className="font-bold text-emerald-400 font-mono">+${Math.round(simResults.cashSavedB).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                    <span className="text-slate-300 font-bold">Consolidated Wealth B:</span>
                    <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.totalWealthB).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario C Combined Ledgers */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-indigo-950 pb-1.5">
                  Scenario C Holding Ledger
                </span>

                <div className="space-y-2 text-xs mt-2.5">
                  {/* Unrecoverable Holding Costs */}
                  <div className="space-y-1.5 pb-2 border-b border-slate-800/30">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Unrecoverable Holding Costs & Receipts</span>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Mortgage Interest Paid:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalInterestPaidC).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Strata Levy & Council Rates:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalRatesStrataC).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Building & Property Insurance:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalInsurancePaidC).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Landlord Water Utilities:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalWaterC).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Gross Rent Income (Always Rented):</span>
                      <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalGrossRentC).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500">Agent Management (fees):</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.totalManagementFeesC).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 pl-1.5">
                      <span className="text-slate-500" title="Negative Gearing tax benefits: Deduct interest + holding costs against salary.">Negative Gearing Tax Impact:</span>
                      <span className={`font-semibold font-mono ${simResults.totalTaxImpactC < 0 ? 'text-emerald-400' : 'text-rose-400/70'}`}>
                        {simResults.totalTaxImpactC < 0 ? `+$${Math.round(Math.abs(simResults.totalTaxImpactC)).toLocaleString()}` : `-$${Math.round(simResults.totalTaxImpactC).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Equity-Building Repayments */}
                  <div className="space-y-1.5 pt-1.5 pb-2 border-b border-slate-800/30">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Equity-Building Repayments</span>
                    <div className="flex justify-between items-center py-0.5 pl-1.5" title="Paying down the mortgage balance is an asset transfer, not an unrecoverable expense. It is recovered in full upon sale.">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        Mortgage Principal Reduced:
                        <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded px-1 font-bold">Equity Boost</span>
                      </span>
                      <span className="font-semibold text-emerald-400 font-mono">+${Math.round(simResults.totalMortgagePaymentsC - simResults.totalInterestPaidC).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60" title="The total out-of-pocket cash paid during this period (Unrecoverable Costs + Principal Repayments).">
                    <span className="text-slate-300 font-bold">Net Out-of-Pocket Cash flow:</span>
                    <span className="text-rose-300 font-extrabold font-mono">${Math.round(simResults.totalCashOutflowsC).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/40">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-indigo-950 pb-1.5">
                  Scenario C Capital Ledger (Sell Later)
                </span>

                <div className="space-y-2 text-xs mt-2.5">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500">Gross Sale Value (Future):</span>
                    <span className="font-semibold text-slate-300 font-mono">${Math.round(futurePropertyValue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500">Mortgage Paid Off (Future):</span>
                    <span className="font-semibold text-slate-300 font-mono">-${Math.round(simResults.futureMortgageBalanceC).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500">Real Estate Agent Fee:</span>
                    <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.agentFeeLater).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500">Conveyancing & legal:</span>
                    <span className="font-semibold text-rose-400/70 font-mono">-${conveyancingFees.toLocaleString()}</span>
                  </div>
                  {!isPrimaryResidence && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-500">CGT on Investment:</span>
                      <span className="font-semibold text-rose-400/70 font-mono">-${Math.round(simResults.cgtLaterC).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                    <span className="text-slate-300 font-bold">Property Net Cash Proceeds (Equity):</span>
                    <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.netCashProceedsLaterC).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-emerald-400 font-semibold">Cash Saved after Payoff:</span>
                    <span className="font-bold text-emerald-400 font-mono">+${Math.round(simResults.cashSavedC).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-slate-950/60 rounded-xl px-2.5 mt-2 text-[11px] border border-slate-800/60">
                    <span className="text-slate-300 font-bold">Consolidated Wealth C:</span>
                    <span className="text-indigo-300 font-extrabold font-mono">${Math.round(simResults.totalWealthC).toLocaleString()}</span>
                  </div>
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
              <div className="grid grid-cols-5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900 pb-2">
                <span>Milestone</span>
                <span>Month</span>
                <span>Scenario A (Sell Now)</span>
                <span>Scenario B (Hold Property)</span>
                <span>Scenario C (Parents & Rent)</span>
              </div>
 
              <div className="space-y-1 text-xs font-medium">
                <div className="grid grid-cols-5 text-center py-1.5 border-b border-slate-900/30">
                  <span className="font-semibold text-slate-400 text-left pl-2">Start</span>
                  <span className="font-mono text-slate-400">Month 0</span>
                  <span className="font-bold text-slate-300 font-mono">${Math.round(simResults.netCashProceedsNow).toLocaleString()}</span>
                  <span className="font-bold text-slate-400 font-mono">${Math.round(simResults.netCashProceedsNow).toLocaleString()}</span>
                  <span className="font-bold text-slate-400 font-mono">${Math.round(simResults.netCashProceedsNow).toLocaleString()}</span>
                </div>
 
                {/* Dynamic Milestones for every 12-month interval */}
                {Array.from({ length: Math.floor((holdingPeriodMonths - 1) / 12) }).map((_, idx) => {
                  const m = (idx + 1) * 12;
                  return (
                    <div key={m} className={`grid grid-cols-5 text-center py-1.5 border-b border-slate-900/30 ${idx % 2 === 0 ? 'bg-slate-950/20' : ''}`}>
                      <span className="font-semibold text-slate-400 text-left pl-2">Year {idx + 1}</span>
                      <span className="font-mono text-slate-400">Month {m}</span>
                      <span className="font-bold text-slate-300 font-mono">
                        ${Math.round(simResults.monthlyTimeline[m - 1]?.wealthA ?? 0).toLocaleString()}
                      </span>
                      <span className="font-bold text-slate-300 font-mono">
                        ${Math.round(simResults.monthlyTimeline[m - 1]?.wealthB ?? 0).toLocaleString()}
                      </span>
                      <span className="font-bold text-slate-300 font-mono">
                        ${Math.round(simResults.monthlyTimeline[m - 1]?.wealthC ?? 0).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
 
                {/* Final Row if not a multiple of 12 or if less than 12 months */}
                {(holdingPeriodMonths % 12 !== 0 || holdingPeriodMonths < 12) && (
                  <div className="grid grid-cols-5 text-center py-1.5 border-b border-slate-900/30">
                    <span className="font-semibold text-slate-400 text-left pl-2">Final</span>
                    <span className="font-mono text-slate-400">Month {holdingPeriodMonths}</span>
                    <span className="font-bold text-emerald-400 font-mono">${Math.round(simResults.totalWealthA).toLocaleString()}</span>
                    <span className="font-bold text-indigo-400 font-mono">${Math.round(simResults.totalWealthB).toLocaleString()}</span>
                    <span className="font-bold text-indigo-400 font-mono">${Math.round(simResults.totalWealthC).toLocaleString()}</span>
                  </div>
                )}
 
                {/* Actual End state comparison row */}
                <div className="grid grid-cols-5 text-center py-2.5 bg-slate-900/85 border border-indigo-900/30 rounded-xl mt-1.5 font-bold">
                  <span className="text-slate-200 text-left pl-2.5">Final Wealth</span>
                  <span className="font-mono text-slate-400">Month {holdingPeriodMonths}</span>
                  <span className={`font-mono ${simResults.isASuperior ? 'text-emerald-400 text-[13px]' : 'text-slate-400'}`}>
                    ${Math.round(simResults.totalWealthA).toLocaleString()}
                  </span>
                  <span className={`font-mono ${simResults.isBSuperior ? 'text-indigo-400 text-[13px]' : 'text-slate-400'}`}>
                    ${Math.round(simResults.totalWealthB).toLocaleString()}
                  </span>
                  <span className={`font-mono ${simResults.isCSuperior ? 'text-indigo-400 text-[13px]' : 'text-slate-400'}`}>
                    ${Math.round(simResults.totalWealthC).toLocaleString()}
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
