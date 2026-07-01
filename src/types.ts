/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaxYear = '2023-24' | '2024-25' | string;

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  base: number;
}

export interface DynamicTaxConfig {
  financialYear: string;
  brackets: TaxBracket[];
  medicareLevyRate: number;
}

export interface FinancialScenario {
  id: string;
  name: string;
  createdAt: string;
  
  // Property details
  propertyPrice: number;
  isFirstHomeBuyer: boolean;
  suburb: string;
  customGrowthRate: number; // percentage, e.g. 5.5

  // Salaries
  salary1: number;
  salary2: number;
  taxYear: TaxYear;

  // Assets
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;

  // Existing property details
  existingPropertyValue?: number;
  existingPropertyLoan?: number;
  useExistingEquity?: boolean;

  // Interest-Free Loan
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;

  // Mortgage parameters
  mortgageTermYears: number;
  interestRatePrimary: number; // e.g. 6.1
  interestRateScenarioB: number; // e.g. 5.2
  interestRateScenarioC: number; // e.g. 7.0

  // Cashflow
  monthlyExpenses: number;
  monthlyExtraRepayment: number;

  // Future Purchase Simulation
  simulateFuturePurchase?: boolean;
  propertyInflationEnabled?: boolean;
  currentSimDate?: string; // e.g. "2026-06"
  purchaseSimDate?: string; // e.g. "2028-06"
  monthlySavingsContribution?: number;
  savingsAnnualReturnRate?: number;
  exitPlannerInputs?: any;
}

export interface SuburbData {
  name: string;
  region: string;
  medianHousePrice: number;
  historicalGrowthRate: number; // annual percentage
}

export interface TaxBreakdown {
  gross: number;
  taxableIncome: number;
  incomeTax: number;
  medicareLevy: number;
  netPay: number;
  marginalRate: number;
}

export interface PayoffProjectionPoint {
  month: number;
  year: number;
  remainingBalanceStandard: number;
  remainingBalanceAccelerated: number;
  totalInterestPaidStandard: number;
  totalInterestPaidAccelerated: number;
  offsetBalanceStandard?: number;
  offsetBalanceAccelerated?: number;
}

export interface GrowthProjectionPoint {
  year: number;
  propertyValue: number;
  mortgageBalanceStandard: number;
  mortgageBalanceAccelerated: number;
  equityStandard: number;
  equityAccelerated: number;
}
