/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TaxBreakdown,
  TaxYear,
  PayoffProjectionPoint,
  GrowthProjectionPoint,
  SuburbData,
  DynamicTaxConfig
} from '../types';

// Pre-curated high-profile suburbs in NSW with historical median prices and average annual growth rates
export const NSW_SUBURBS: SuburbData[] = [
  { name: 'Bondi', region: 'Eastern Suburbs', medianHousePrice: 3800000, historicalGrowthRate: 7.2 },
  { name: 'Chatswood', region: 'North Shore', medianHousePrice: 2900000, historicalGrowthRate: 6.8 },
  { name: 'Parramatta', region: 'Western Sydney', medianHousePrice: 1550000, historicalGrowthRate: 5.4 },
  { name: 'Blacktown', region: 'Greater West', medianHousePrice: 950000, historicalGrowthRate: 4.9 },
  { name: 'Newcastle', region: 'Hunter Region', medianHousePrice: 880000, historicalGrowthRate: 5.1 },
  { name: 'Byron Bay', region: 'North Coast', medianHousePrice: 2200000, historicalGrowthRate: 8.0 },
  { name: 'Wollongong', region: 'Illawarra', medianHousePrice: 1050000, historicalGrowthRate: 5.3 },
  { name: 'Hornsby', region: 'Upper North Shore', medianHousePrice: 1750000, historicalGrowthRate: 5.9 },
  { name: 'Custom Suburb', region: 'Custom', medianHousePrice: 1200000, historicalGrowthRate: 5.5 },
];

/**
 * Calculates NSW/Australian individual income tax + Medicare Levy for a given gross salary.
 * Assumes a resident individual.
 */
export function calculateNSWIncomeTax(
  gross: number,
  taxYear: TaxYear,
  dynamicTaxConfig?: DynamicTaxConfig
): TaxBreakdown {
  if (gross <= 0) {
    return { gross: 0, taxableIncome: 0, incomeTax: 0, medicareLevy: 0, netPay: 0, marginalRate: 0 };
  }

  const taxableIncome = gross; // assuming no deductions for simplicity
  let incomeTax = 0;
  let marginalRate = 0;
  let medicareLevyRate = 0.02;

  // Use dynamic tax configuration if matches the selected tax year
  if (dynamicTaxConfig && taxYear === dynamicTaxConfig.financialYear) {
    const brackets = [...dynamicTaxConfig.brackets].sort((a, b) => a.min - b.min);
    let matchedBracket = brackets[0];

    for (const b of brackets) {
      if (taxableIncome >= b.min) {
        matchedBracket = b;
      }
    }

    if (matchedBracket) {
      incomeTax = matchedBracket.base + (taxableIncome - (matchedBracket.min - 1 || 0)) * matchedBracket.rate;
      marginalRate = matchedBracket.rate * 100;
    }
    medicareLevyRate = dynamicTaxConfig.medicareLevyRate;
  } else if (taxYear === '2023-24') {
    // FY 2023-2024 brackets
    if (taxableIncome <= 18200) {
      incomeTax = 0;
      marginalRate = 0;
    } else if (taxableIncome <= 45000) {
      incomeTax = (taxableIncome - 18200) * 0.19;
      marginalRate = 19;
    } else if (taxableIncome <= 120000) {
      incomeTax = 5092 + (taxableIncome - 45000) * 0.325;
      marginalRate = 32.5;
    } else if (taxableIncome <= 180000) {
      incomeTax = 29467 + (taxableIncome - 120000) * 0.37;
      marginalRate = 37;
    } else {
      incomeTax = 51667 + (taxableIncome - 180000) * 0.45;
      marginalRate = 45;
    }
  } else {
    // FY 2024-25 onwards (Stage 3 Tax Cuts) (and default fallback)
    if (taxableIncome <= 18200) {
      incomeTax = 0;
      marginalRate = 0;
    } else if (taxableIncome <= 45000) {
      incomeTax = (taxableIncome - 18200) * 0.16;
      marginalRate = 16;
    } else if (taxableIncome <= 135000) {
      incomeTax = 4288 + (taxableIncome - 45000) * 0.30;
      marginalRate = 30;
    } else if (taxableIncome <= 190000) {
      incomeTax = 31288 + (taxableIncome - 135000) * 0.37;
      marginalRate = 37;
    } else {
      incomeTax = 51638 + (taxableIncome - 190000) * 0.45;
      marginalRate = 45;
    }
  }

  // Medicare Levy (typically 2% of taxable income with low-income exemption thresholds)
  const medicareLevy = taxableIncome > 24276 ? taxableIncome * medicareLevyRate : 0;
  
  const netPay = Math.max(0, taxableIncome - incomeTax - medicareLevy);

  return {
    gross,
    taxableIncome,
    incomeTax: Math.round(incomeTax),
    medicareLevy: Math.round(medicareLevy),
    netPay: Math.round(netPay),
    marginalRate,
  };
}

/**
 * Calculates standard NSW Transfer Duty (Stamp Duty).
 * Values updated for recent NSW Revenue schedules.
 */
export function calculateStandardNSWStampDuty(price: number): number {
  if (price <= 0) return 0;

  if (price <= 16000) {
    return (price / 100) * 1.25;
  } else if (price <= 35000) {
    return 200 + ((price - 16000) / 100) * 1.50;
  } else if (price <= 93000) {
    return 485 + ((price - 35000) / 100) * 1.75;
  } else if (price <= 351000) {
    return 1500 + ((price - 93000) / 100) * 3.50;
  } else if (price <= 1168000) {
    return 10530 + ((price - 351000) / 100) * 4.50;
  } else if (price <= 3505000) {
    return 47295 + ((price - 1168000) / 100) * 5.50;
  } else {
    return 175830 + ((price - 3505000) / 100) * 7.00;
  }
}

/**
 * Calculates NSW Transfer Duty, accounting for First Home Buyer Assistance Scheme (FHBAS).
 * From 1 July 2023, FHBAS thresholds are:
 * - Full exemption on new and existing homes valued up to $800,000.
 * - Concession (sliding scale) for homes valued between $800,000 and $1,000,000.
 */
export function calculateNSWStampDuty(price: number, isFirstHomeBuyer: boolean): number {
  if (price <= 0) return 0;
  
  const standardDuty = calculateStandardNSWStampDuty(price);

  if (!isFirstHomeBuyer) {
    return Math.round(standardDuty);
  }

  if (price <= 800000) {
    return 0; // Full exemption
  } else if (price <= 1000000) {
    // Concessional rate: linear phase-out
    // Duty = standardDuty * ((price - 800,000) / 200,000)
    const discountFactor = (price - 800000) / 200000;
    return Math.round(standardDuty * discountFactor);
  } else {
    return Math.round(standardDuty); // No concession above $1,000,000
  }
}

/**
 * Calculates monthly Principal & Interest mortgage payment.
 */
export function calculateMortgagePayment(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number
): number {
  if (loanAmount <= 0 || annualInterestRate <= 0 || termYears <= 0) {
    return 0;
  }

  const r = annualInterestRate / 100 / 12; // monthly interest rate
  const n = termYears * 12; // total number of monthly payments

  const monthlyPayment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(monthlyPayment * 100) / 100;
}

/**
 * Simulates month-by-month mortgage payoff timelines for both:
 * 1. Standard: Paying exactly the scheduled minimum monthly payment.
 * 2. Accelerated: Standard payment + extra repayments + interest-free loan integration.
 * 
 * Accounts for interest-free loan repayments deducting from household savings capacity
 * and optional extra payments going directly to the mortgage principal.
 */
export function simulateMortgagePayoff(
  mortgageAmount: number,
  annualInterestRate: number,
  termYears: number,
  monthlyExpenses: number,
  monthlyExtraRepayment: number,
  interestFreeLoanActive: boolean,
  interestFreeLoanAmount: number,
  interestFreeLoanRepaymentYear: number,
  householdMonthlyNetIncome: number,
  initialOffsetBalance: number = 0
): {
  projection: PayoffProjectionPoint[];
  monthsToPayoffStandard: number;
  monthsToPayoffAccelerated: number;
  totalInterestStandard: number;
  totalInterestAccelerated: number;
  standardMonthlyPayment: number;
  acceleratedMonthlyPayment: number;
} {
  const r = annualInterestRate / 100 / 12;
  const standardMonthlyPayment = calculateMortgagePayment(mortgageAmount, annualInterestRate, termYears);
  
  let balanceStd = mortgageAmount;
  let balanceAcc = mortgageAmount;
  
  let offsetBalanceStd = initialOffsetBalance;
  let offsetBalanceAcc = initialOffsetBalance;
  
  let totalInterestStd = 0;
  let totalInterestAcc = 0;
  
  let monthsStd = 0;
  let monthsAcc = 0;
  
  const projection: PayoffProjectionPoint[] = [];
  
  // Calculate yearly interest-free loan repayment if active
  const annualInterestFreeRepayment = interestFreeLoanActive && interestFreeLoanRepaymentYear > 0
    ? interestFreeLoanRepaymentYear
    : 0;
  const monthlyInterestFreeRepayment = annualInterestFreeRepayment / 12;

  // Let's run a simulation for up to 50 years to ensure completion
  const maxMonths = 50 * 12;
  const interestFreeLoanTermYears = interestFreeLoanAmount > 0 && annualInterestFreeRepayment > 0
    ? Math.ceil(interestFreeLoanAmount / annualInterestFreeRepayment)
    : 0;
  
  for (let m = 1; m <= maxMonths; m++) {
    const year = Math.ceil(m / 12);
    const isStillPayingInterestFreeLoan = interestFreeLoanActive && year <= interestFreeLoanTermYears;
    const currentMonthInterestFreePayment = isStillPayingInterestFreeLoan ? monthlyInterestFreeRepayment : 0;
    
    // 1. Standard Simulation
    if (balanceStd > 0) {
      if (offsetBalanceStd >= balanceStd) {
        // Fully offset! Instantly clear the remaining balance using offset funds
        offsetBalanceStd -= balanceStd;
        balanceStd = 0;
        monthsStd = m;
      } else {
        // Interest is calculated on balance MINUS offset account balance
        const interestStd = Math.max(0, balanceStd - offsetBalanceStd) * r;
        totalInterestStd += interestStd;
        
        const paymentStd = Math.min(balanceStd + interestStd, standardMonthlyPayment);
        balanceStd = balanceStd + interestStd - paymentStd;
        monthsStd = m;

        // Add standard cashflow surplus to offset balance.
        // If household cashflow is in deficit, it is deducted from the offset account balance.
        const standardSurplus = householdMonthlyNetIncome - monthlyExpenses - paymentStd - currentMonthInterestFreePayment;
        offsetBalanceStd = Math.max(0, offsetBalanceStd + standardSurplus);
      }
    }
    
    // 2. Accelerated Simulation
    if (balanceAcc > 0) {
      if (offsetBalanceAcc >= balanceAcc) {
        // Fully offset! Instantly clear the remaining balance using offset funds
        offsetBalanceAcc -= balanceAcc;
        balanceAcc = 0;
        monthsAcc = m;
      } else {
        // Interest is calculated on balance MINUS offset account balance
        const interestAcc = Math.max(0, balanceAcc - offsetBalanceAcc) * r;
        totalInterestAcc += interestAcc;
        
        // Accelerated payment is minimum mortgage repayment + extra repayment.
        // Capped by leftover household cashflow BEFORE applying extra repayment
        const maximumFeasibleExtra = Math.max(
          0,
          householdMonthlyNetIncome - monthlyExpenses - standardMonthlyPayment - currentMonthInterestFreePayment
        );
        
        const appliedExtra = Math.min(monthlyExtraRepayment, maximumFeasibleExtra);
        const totalAccScheduledPayment = standardMonthlyPayment + appliedExtra;
        const paymentAcc = Math.min(balanceAcc + interestAcc, totalAccScheduledPayment);
        
        balanceAcc = balanceAcc + interestAcc - paymentAcc;
        monthsAcc = m;

        // Add remaining cashflow surplus to offset balance
        // If household cashflow is in deficit, it is deducted from the offset account balance.
        const accSurplus = householdMonthlyNetIncome - monthlyExpenses - paymentAcc - currentMonthInterestFreePayment;
        offsetBalanceAcc = Math.max(0, offsetBalanceAcc + accSurplus);
      }
    }
    
    // Push data points for charting/overview (sample every year or 6 months to avoid bloat)
    if (m % 12 === 0 || m === 1 || (balanceStd <= 0 && balanceAcc <= 0)) {
      projection.push({
        month: m,
        year,
        remainingBalanceStandard: Math.round(balanceStd),
        remainingBalanceAccelerated: Math.round(balanceAcc),
        totalInterestPaidStandard: Math.round(totalInterestStd),
        totalInterestPaidAccelerated: Math.round(totalInterestAcc),
        offsetBalanceStandard: Math.round(offsetBalanceStd),
        offsetBalanceAccelerated: Math.round(offsetBalanceAcc)
      });
    }
    
    // Early exit if both are paid off (or fully offset)
    // Note: in Australia, once remaining balance is less than or equal to the offset balance,
    // the net balance subject to interest is 0, which is effectively paid off/offset.
    if (balanceStd <= 0 && balanceAcc <= 0) {
      break;
    }
  }

  return {
    projection,
    monthsToPayoffStandard: balanceStd <= 0 ? monthsStd : maxMonths,
    monthsToPayoffAccelerated: balanceAcc <= 0 ? monthsAcc : maxMonths,
    totalInterestStandard: Math.round(totalInterestStd),
    totalInterestAccelerated: Math.round(totalInterestAcc),
    standardMonthlyPayment,
    acceleratedMonthlyPayment: standardMonthlyPayment + monthlyExtraRepayment
  };
}

/**
 * Projects annual property growth and equity over a 30-year span.
 */
export function projectPropertyGrowth(
  purchasePrice: number,
  growthRate: number,
  mortgageAmount: number,
  annualInterestRate: number,
  termYears: number,
  monthlyExpenses: number,
  monthlyExtraRepayment: number,
  interestFreeLoanActive: boolean,
  interestFreeLoanAmount: number,
  interestFreeLoanRepaymentYear: number,
  householdMonthlyNetIncome: number
): GrowthProjectionPoint[] {
  const points: GrowthProjectionPoint[] = [];
  const rateMultiplier = 1 + growthRate / 100;
  
  // Reuse the simulation to get the balance at each yearly interval
  const simulation = simulateMortgagePayoff(
    mortgageAmount,
    annualInterestRate,
    termYears,
    monthlyExpenses,
    monthlyExtraRepayment,
    interestFreeLoanActive,
    interestFreeLoanAmount,
    interestFreeLoanRepaymentYear,
    householdMonthlyNetIncome
  );

  let currentPrice = purchasePrice;
  
  // Year 0
  points.push({
    year: 0,
    propertyValue: Math.round(purchasePrice),
    mortgageBalanceStandard: Math.round(mortgageAmount),
    mortgageBalanceAccelerated: Math.round(mortgageAmount),
    equityStandard: Math.round(purchasePrice - mortgageAmount),
    equityAccelerated: Math.round(purchasePrice - mortgageAmount)
  });

  for (let year = 1; year <= 30; year++) {
    currentPrice = currentPrice * rateMultiplier;
    
    // Find matching month in projection points
    const monthIndex = year * 12;
    const simPoint = simulation.projection.find(p => p.month === monthIndex);
    
    let balStd = 0;
    let balAcc = 0;
    
    if (simPoint) {
      balStd = simPoint.remainingBalanceStandard;
      balAcc = simPoint.remainingBalanceAccelerated;
    } else {
      // If the simulation finished early, the balance is 0
      const lastPoint = simulation.projection[simulation.projection.length - 1];
      balStd = (lastPoint && lastPoint.month < monthIndex) ? 0 : mortgageAmount;
      balAcc = (lastPoint && lastPoint.month < monthIndex) ? 0 : mortgageAmount;
    }

    points.push({
      year,
      propertyValue: Math.round(currentPrice),
      mortgageBalanceStandard: Math.round(balStd),
      mortgageBalanceAccelerated: Math.round(balAcc),
      equityStandard: Math.round(Math.max(0, currentPrice - balStd)),
      equityAccelerated: Math.round(Math.max(0, currentPrice - balAcc))
    });
  }

  return points;
}

/**
 * Calculates months difference between two "YYYY-MM" strings.
 */
export function getMonthsBetweenDates(start: string, end: string): number {
  const [startY, startM] = start.split('-').map(Number);
  const [endY, endM] = end.split('-').map(Number);
  if (!startY || !startM || !endY || !endM) return 0;
  return (endY - startY) * 12 + (endM - startM);
}

interface FuturePurchaseResult {
  monthsDiff: number;
  futurePropertyPrice: number;
  futureStampDuty: number;
  futureConveyancingFees: number;
  futureTotalCosts: number;
  accruedAssets: number;
  futureMortgageAmount: number;
  additionalSavingsFromContributions: number;
  compoundingGains: number;
}

/**
 * Simulates financial outcome of purchasing property in the future.
 */
export function calculateFuturePurchaseSimulation(params: {
  propertyPrice: number;
  customGrowthRate: number;
  isFirstHomeBuyer: boolean;
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;
  currentSimDate: string;
  purchaseSimDate: string;
  monthlySavingsContribution: number;
  savingsAnnualReturnRate: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
}): FuturePurchaseResult {
  const monthsDiff = Math.max(0, getMonthsBetweenDates(params.currentSimDate, params.purchaseSimDate));
  const yearsDiff = monthsDiff / 12;

  // 1. Inflated property price
  const futurePropertyPrice = params.propertyPrice * Math.pow(1 + params.customGrowthRate / 100, yearsDiff);
  
  // 2. Future Stamp Duty
  const futureStampDuty = calculateNSWStampDuty(futurePropertyPrice, params.isFirstHomeBuyer);
  const futureConveyancingFees = 2000;
  const futureTotalCosts = futurePropertyPrice + futureStampDuty + futureConveyancingFees;

  // 3. Compounded Savings
  const initialAssets = params.cashAssets + params.sharesAssets + params.otherAssets;
  const r = (params.savingsAnnualReturnRate / 100) / 12;
  
  let accruedAssets = initialAssets;
  let totalContributions = 0;

  if (monthsDiff > 0) {
    // Compound initial asset pool
    accruedAssets = initialAssets * Math.pow(1 + r, monthsDiff);
    
    // Accumulate monthly contributions
    if (r > 0) {
      accruedAssets += params.monthlySavingsContribution * ((Math.pow(1 + r, monthsDiff) - 1) / r);
    } else {
      accruedAssets += params.monthlySavingsContribution * monthsDiff;
    }
    
    totalContributions = params.monthlySavingsContribution * monthsDiff;
  }

  const compoundingGains = Math.max(0, accruedAssets - initialAssets - totalContributions);
  const appliedInterestFreeLoan = params.interestFreeLoanActive ? params.interestFreeLoanAmount : 0;
  
  // 4. Future Mortgage Amount required
  const futureMortgageAmount = Math.max(0, futureTotalCosts - accruedAssets - appliedInterestFreeLoan);

  return {
    monthsDiff,
    futurePropertyPrice: Math.round(futurePropertyPrice),
    futureStampDuty: Math.round(futureStampDuty),
    futureConveyancingFees,
    futureTotalCosts: Math.round(futureTotalCosts),
    accruedAssets: Math.round(accruedAssets),
    futureMortgageAmount: Math.round(futureMortgageAmount),
    additionalSavingsFromContributions: Math.round(totalContributions),
    compoundingGains: Math.round(compoundingGains),
  };
}
