/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Landmark, ShieldCheck, DollarSign, Wallet, HelpCircle, AlertCircle, ArrowUpRight, Plus, Check } from 'lucide-react';
import { calculateNSWStampDuty } from '../utils/finance';

interface AssetOffsetCalculatorProps {
  propertyPrice: number;
  isFirstHomeBuyer: boolean;
  cashAssets: number;
  sharesAssets: number;
  otherAssets: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;
  existingPropertyValue: number;
  existingPropertyLoan: number;
  useExistingEquity: boolean;
  futureSimActive: boolean;
  futureSimInfo?: any;
  onUpdate: (fields: {
    propertyPrice?: number;
    isFirstHomeBuyer?: boolean;
    cashAssets?: number;
    sharesAssets?: number;
    otherAssets?: number;
    interestFreeLoanActive?: boolean;
    interestFreeLoanAmount?: number;
    interestFreeLoanRepaymentYear?: number;
    existingPropertyValue?: number;
    existingPropertyLoan?: number;
    useExistingEquity?: boolean;
  }) => void;
}

export default function AssetOffsetCalculator({
  propertyPrice,
  isFirstHomeBuyer,
  cashAssets,
  sharesAssets,
  otherAssets,
  interestFreeLoanActive,
  interestFreeLoanAmount,
  interestFreeLoanRepaymentYear,
  existingPropertyValue,
  existingPropertyLoan,
  useExistingEquity,
  futureSimActive,
  futureSimInfo,
  onUpdate
}: AssetOffsetCalculatorProps) {
  
  // Calculate stamp duty using our precise helper
  const stampDuty = calculateNSWStampDuty(propertyPrice, isFirstHomeBuyer);
  const conveyancingFees = 2000; // estimated NSW standard conveyancing + transfer fee
  const totalPurchaseCosts = propertyPrice + stampDuty + conveyancingFees;
  
  // Calculate existing equity
  const existingEquity = useExistingEquity ? Math.max(0, existingPropertyValue - existingPropertyLoan) : 0;

  // Total available assets to offset the purchase price/costs
  const totalOffsetAssets = cashAssets + sharesAssets + otherAssets + existingEquity;
  
  // Interest-free loan directly reduces the initial mortgage loan requirement
  const appliedInterestFreeLoan = interestFreeLoanActive ? interestFreeLoanAmount : 0;
  
  // Required Mortgage Loan
  const rawMortgageRequired = totalPurchaseCosts - totalOffsetAssets - appliedInterestFreeLoan;
  const mortgageRequired = Math.max(0, rawMortgageRequired);
  
  // Deposit percentage relative to purchase price
  const depositPercent = propertyPrice > 0 ? (totalOffsetAssets / propertyPrice) * 100 : 0;

  // Lenders Mortgage Insurance (LMI) indicator
  const needsLMI = depositPercent < 20 && mortgageRequired > 0;

  // Future simulated results if active
  const futurePropertyPrice = futureSimInfo?.futurePropertyPrice ?? propertyPrice;
  const futureStampDuty = futureSimInfo?.futureStampDuty ?? stampDuty;
  const futureTotalCosts = futurePropertyPrice + futureStampDuty + conveyancingFees;
  const futureOffsetAssets = futureSimInfo?.accruedAssets ?? totalOffsetAssets;
  const futureMortgageRequired = Math.max(0, futureTotalCosts - futureOffsetAssets - appliedInterestFreeLoan);
  const futureDepositPercent = futurePropertyPrice > 0 ? (futureOffsetAssets / futurePropertyPrice) * 100 : 0;
  const futureNeedsLMI = futureDepositPercent < 20 && futureMortgageRequired > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="asset-offset-calculator"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Assets & Purchase Offset</h2>
            <p className="text-xs text-slate-400">Determine stamp duty, offset assets, and mortgage requirement</p>
          </div>
        </div>

        {/* First Home Buyer Exemption Toggle */}
        <button
          onClick={() => onUpdate({ isFirstHomeBuyer: !isFirstHomeBuyer })}
          id="btn-fhb-toggle"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
            isFirstHomeBuyer
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>NSW First Home Buyer Scheme</span>
          <span className={`w-2 h-2 rounded-full ${isFirstHomeBuyer ? 'bg-sky-400 animate-pulse' : 'bg-slate-700'}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Property and Assets Inputs */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Purchase & Savings</h3>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Target Property Price</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
              <input
                type="text"
                id="input-property-price"
                value={propertyPrice === 0 ? '' : propertyPrice.toLocaleString()}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/,/g, '');
                  const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                  onUpdate({ propertyPrice: val });
                }}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 rounded-lg pl-8 pr-4 py-2.5 text-slate-100 font-mono text-sm transition-all outline-none"
                placeholder="e.g. 1,200,000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-medium">Cash Savings</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                <input
                  type="text"
                  id="input-cash-assets"
                  value={cashAssets === 0 ? '' : cashAssets.toLocaleString()}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/,/g, '');
                    const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                    onUpdate({ cashAssets: val });
                  }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-medium">Shares & Invest.</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                <input
                  type="text"
                  id="input-shares-assets"
                  value={sharesAssets === 0 ? '' : sharesAssets.toLocaleString()}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/,/g, '');
                    const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                    onUpdate({ sharesAssets: val });
                  }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-medium">Other Assets</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                <input
                  type="text"
                  id="input-other-assets"
                  value={otherAssets === 0 ? '' : otherAssets.toLocaleString()}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/,/g, '');
                    const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                    onUpdate({ otherAssets: val });
                  }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Current Property Value & Equity */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-use-existing-equity"
                  checked={useExistingEquity}
                  onChange={(e) => onUpdate({ useExistingEquity: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                />
                <label htmlFor="chk-use-existing-equity" className="text-xs font-semibold text-slate-200 cursor-pointer">
                  Utilize Existing Property Equity?
                </label>
              </div>
              <span className="text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded">
                Equity Offset
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-medium">Current Property Value</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                  <input
                    type="text"
                    id="input-existing-property-value"
                    value={existingPropertyValue === 0 ? '' : existingPropertyValue.toLocaleString()}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/,/g, '');
                      const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                      onUpdate({ existingPropertyValue: val });
                    }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-medium">Outstanding Loan Balance</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                  <input
                    type="text"
                    id="input-existing-property-loan"
                    value={existingPropertyLoan === 0 ? '' : existingPropertyLoan.toLocaleString()}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/,/g, '');
                      const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                      onUpdate({ existingPropertyLoan: val });
                    }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex justify-between items-center text-xs">
              <span className="text-slate-400">Calculated Current Equity:</span>
              <span className={`font-bold font-mono ${existingEquity > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                ${existingEquity.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Interest-Free Loan Option section */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-interest-free-loan"
                  checked={interestFreeLoanActive}
                  onChange={(e) => onUpdate({ interestFreeLoanActive: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                />
                <label htmlFor="chk-interest-free-loan" className="text-xs font-semibold text-slate-200 cursor-pointer">
                  Leverage Interest-Free Loan?
                </label>
              </div>
              <span className="text-[10px] font-bold bg-sky-950/50 text-sky-400 border border-sky-900/40 px-2 py-0.5 rounded">
                Optional Offset
              </span>
            </div>

            {interestFreeLoanActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-2 border-t border-slate-800/50 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-medium">Interest-Free Loan Amount</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                      <input
                        type="text"
                        id="input-ifl-amount"
                        value={interestFreeLoanAmount === 0 ? '' : interestFreeLoanAmount.toLocaleString()}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/,/g, '');
                          const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                          onUpdate({ interestFreeLoanAmount: val });
                        }}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-medium">Repayment Amount / Year</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">$</span>
                      <input
                        type="text"
                        id="input-ifl-repayment"
                        value={interestFreeLoanRepaymentYear === 0 ? '' : interestFreeLoanRepaymentYear.toLocaleString()}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/,/g, '');
                          const val = cleanVal === '' ? 0 : parseFloat(cleanVal) || 0;
                          onUpdate({ interestFreeLoanRepaymentYear: val });
                        }}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-slate-200 font-mono text-xs outline-none focus:border-sky-500/50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  This loan acts as an initial capital booster, directly lowering your mortgage borrowing requirement by <span className="text-sky-400 font-semibold font-mono">${interestFreeLoanAmount.toLocaleString()}</span> and saving massive interest, though requiring a yearly payment.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Side: Results & Breakdown */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col justify-between relative">
          <div>
            {futureSimActive && (
              <div className="mb-4 bg-sky-950/30 border border-sky-500/20 rounded-lg p-2.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  <span>Future Simulation Mode Active</span>
                </div>
                <span className="text-slate-400 font-bold font-mono">Target: {futureSimInfo?.purchaseSimDate ?? '2028-06'}</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Funding & Cost Balance</h3>
              {futureSimActive && (
                <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Showing: {futureSimActive ? 'Future Simulation' : 'Current Plan'}
                </span>
              )}
            </div>
            
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Target Property Price</span>
                <span className="font-semibold text-slate-200 font-mono">
                  ${(futureSimActive ? futurePropertyPrice : propertyPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  NSW Transfer (Stamp) Duty
                  {isFirstHomeBuyer && (futureSimActive ? futurePropertyPrice : propertyPrice) <= 1000000 && (
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/40">FHB Discount</span>
                  )}
                </span>
                <span className={`font-semibold font-mono ${(futureSimActive ? futureStampDuty : stampDuty) === 0 && isFirstHomeBuyer ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {(futureSimActive ? futureStampDuty : stampDuty) === 0 && isFirstHomeBuyer ? 'EXEMPT ($0)' : `$${(futureSimActive ? futureStampDuty : stampDuty).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">NSW Conveyancing & Registration Fees</span>
                <span className="font-semibold text-slate-200 font-mono">${conveyancingFees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-amber-400 font-semibold">
                <span>Total Capital Cost Required</span>
                <span className="font-mono">
                  ${(futureSimActive ? futureTotalCosts : totalPurchaseCosts).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              
              <div className="pt-2" />
              
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Your Offset Assets (Deposit)</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  -${(futureSimActive ? futureOffsetAssets : totalOffsetAssets).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              {useExistingEquity && existingEquity > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px] text-emerald-500/90 pl-3">
                  <span>↳ Incl. Property Equity</span>
                  <span className="font-mono">${existingEquity.toLocaleString()}</span>
                </div>
              )}
              {interestFreeLoanActive && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Interest-Free Loan Leverage</span>
                  <span className="font-semibold text-sky-400 font-mono">-${appliedInterestFreeLoan.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Mortgage Required</span>
              {((futureSimActive ? futureDepositPercent : depositPercent) > 0) && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${(futureSimActive ? futureNeedsLMI : needsLMI) ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'}`}>
                  Deposit: {(futureSimActive ? futureDepositPercent : depositPercent).toFixed(1)}% {(futureSimActive ? futureNeedsLMI : needsLMI) ? '(Requires LMI)' : '(No LMI)'}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-sky-400 font-mono">
              ${(futureSimActive ? futureMortgageRequired : mortgageRequired).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            {(futureSimActive ? futureNeedsLMI : needsLMI) && (
              <div className="mt-3 flex items-start gap-2 bg-amber-950/10 border border-amber-900/20 p-2.5 rounded-lg text-[10px] text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Lenders Mortgage Insurance:</strong> Your deposit is under 20%. Standard banks may apply LMI premiums. Try increasing offset assets or utilizing an interest-free loan to hit 20% deposit!
                </span>
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
