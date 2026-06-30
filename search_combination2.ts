import { simulateMortgagePayoff, calculateNSWStampDuty } from './src/utils/finance';

const propertyPrice = 1200000;
const isFirstHomeBuyer = true;
const stampDuty = calculateNSWStampDuty(propertyPrice, isFirstHomeBuyer);
const conveyancingFees = 2000;
const totalCosts = propertyPrice + stampDuty + conveyancingFees; // 1,200,000 + stampDuty + 2,000

const cashAssets = 180000;
const sharesAssets = 45000;
const otherAssets = 15000;
const totalOffsetAssets = cashAssets + sharesAssets + otherAssets; // 240,000

const interestRatePrimary = 6.1;
const mortgageTermYears = 30;

const loanDeposit = totalCosts - totalOffsetAssets; // 962,000 (approx)
const loanOffset = totalCosts; // 1,202,000 (approx)

// Search over monthlyExpenses and householdMonthlyNetIncome
for (let income = 8000; income <= 20000; income += 50) {
  for (let expenses = 1000; expenses <= 8000; expenses += 50) {
    const payDep = simulateMortgagePayoff(loanDeposit, interestRatePrimary, mortgageTermYears, 0, 0, false, 0, 0, 0).standardMonthlyPayment;
    const payOff = simulateMortgagePayoff(loanOffset, interestRatePrimary, mortgageTermYears, 0, 0, false, 0, 0, 0).standardMonthlyPayment;

    const maxExtraDep = income - expenses - payDep;
    const maxExtraOff = income - expenses - payOff;

    if (maxExtraDep < 0 || maxExtraOff < 0) continue;

    // Suppose the user clicked "Set to Max Possible" in Offset mode, so monthlyExtraRepayment is maxExtraOff.
    // In Deposit mode, they keep monthlyExtraRepayment = maxExtraOff.
    const simDeposit = simulateMortgagePayoff(
      loanDeposit,
      interestRatePrimary,
      mortgageTermYears,
      expenses,
      maxExtraOff, // using maxExtraOff as extra repayment in both!
      false, 0, 0,
      income,
      0
    );

    const simOffset = simulateMortgagePayoff(
      loanOffset,
      interestRatePrimary,
      mortgageTermYears,
      expenses,
      maxExtraOff, // using maxExtraOff in both
      false, 0, 0,
      income,
      totalOffsetAssets
    );

    if (simDeposit.monthsToPayoffAccelerated === 124 && simOffset.monthsToPayoffAccelerated === 115) {
      console.log(`FOUND Combination with offset-max extra!`);
      console.log(`Income: ${income}, Expenses: ${expenses}`);
      console.log(`maxExtraOff: ${maxExtraOff}, maxExtraDep: ${maxExtraDep}`);
      console.log(`Deposit Payoff: ${simDeposit.monthsToPayoffAccelerated} (${Math.floor(simDeposit.monthsToPayoffAccelerated/12)}y ${simDeposit.monthsToPayoffAccelerated%12}m)`);
      console.log(`Offset Payoff: ${simOffset.monthsToPayoffAccelerated} (${Math.floor(simOffset.monthsToPayoffAccelerated/12)}y ${simOffset.monthsToPayoffAccelerated%12}m)`);
      break;
    }
  }
}
console.log("Search completed.");
