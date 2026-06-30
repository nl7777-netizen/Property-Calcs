/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, DollarSign, Calendar, Landmark, Percent, Sparkles, AlertCircle } from 'lucide-react';
import { calculateNSWIncomeTax } from '../utils/finance';
import { TaxYear, TaxBreakdown, DynamicTaxConfig } from '../types';

interface SalaryCalculatorProps {
  salary1: number;
  salary2: number;
  taxYear: TaxYear;
  dynamicTaxConfig?: DynamicTaxConfig;
  onUpdate: (fields: { salary1?: number; salary2?: number; taxYear?: TaxYear }) => void;
  onSyncTaxConfig: (config: DynamicTaxConfig) => void;
}

export default function SalaryCalculator({
  salary1,
  salary2,
  taxYear,
  dynamicTaxConfig,
  onUpdate,
  onSyncTaxConfig
}: SalaryCalculatorProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const taxBreakdown1 = calculateNSWIncomeTax(salary1, taxYear, dynamicTaxConfig);
  const taxBreakdown2 = calculateNSWIncomeTax(salary2, taxYear, dynamicTaxConfig);
  
  const totalGross = salary1 + salary2;
  const totalTax = taxBreakdown1.incomeTax + taxBreakdown2.incomeTax;
  const totalMedicare = taxBreakdown1.medicareLevy + taxBreakdown2.medicareLevy;
  const totalNet = taxBreakdown1.netPay + taxBreakdown2.netPay;

  const handleSalaryChange = (num: number, valStr: string) => {
    const val = parseFloat(valStr.replace(/[^0-9.]/g, '')) || 0;
    if (num === 1) onUpdate({ salary1: val });
    else onUpdate({ salary2: val });
  };

  const renderSalaryBreakdown = (title: string, tax: TaxBreakdown, grossSetter: (v: number) => void, val: number) => {
    const taxPercent = val > 0 ? ((tax.incomeTax + tax.medicareLevy) / val) * 100 : 0;
    const netPercent = val > 0 ? (tax.netPay / val) * 100 : 0;

    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5" id={`salary-card-${title.toLowerCase().replace(' ', '-')}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">
            Marginal: {tax.marginalRate}%
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Gross Annual Income</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
              <input
                type="text"
                id={`input-gross-${title.toLowerCase().replace(' ', '-')}`}
                value={val === 0 ? '' : val.toLocaleString()}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  const numVal = parseFloat(raw) || 0;
                  grossSetter(numVal);
                }}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-lg pl-8 pr-4 py-2.5 text-slate-100 font-mono text-sm transition-all outline-none"
                placeholder="e.g. 120,000"
              />
            </div>
            <input
              type="range"
              min="0"
              max="350000"
              step="5000"
              value={val}
              onChange={(e) => grossSetter(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer mt-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950/30 border border-slate-800/50 rounded-lg p-3 text-center">
              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Income Tax</span>
              <span className="text-sm font-semibold text-rose-400 font-mono">${tax.incomeTax.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-800/50 rounded-lg p-3 text-center">
              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Medicare Levy (2%)</span>
              <span className="text-sm font-semibold text-rose-400/80 font-mono">${tax.medicareLevy.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-lg p-3.5 flex justify-between items-center">
            <div>
              <span className="block text-xs text-slate-400 font-medium">Net Take-home (Annual)</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">${tax.netPay.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 font-mono">Fortnightly</span>
              <span className="text-xs font-semibold text-slate-300 font-mono">${Math.round(tax.netPay / 26).toLocaleString()}</span>
            </div>
          </div>

          {val > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Take-home: {netPercent.toFixed(1)}%</span>
                <span>Total Tax: {taxPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${netPercent}%` }} />
                <div className="h-full bg-rose-500" style={{ width: `${taxPercent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/sync-tax-year');
      if (!res.ok) {
        throw new Error('Tax scraping service is currently unavailable.');
      }
      const data = await res.json();
      if (data && data.financialYear) {
        onSyncTaxConfig(data);
        onUpdate({ taxYear: data.financialYear });
      } else {
        throw new Error('Received unexpected format from ATO scraping.');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Scraping failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderPeriods = () => {
    const options = ['2023-24', '2025-26'];
    if (dynamicTaxConfig && !options.includes(dynamicTaxConfig.financialYear)) {
      options.push(dynamicTaxConfig.financialYear);
    }
    return options.map(yr => (
      <button
        key={yr}
        onClick={() => onUpdate({ taxYear: yr })}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
          taxYear === yr
            ? 'bg-emerald-500 text-slate-950 shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        FY {yr} {dynamicTaxConfig && yr === dynamicTaxConfig.financialYear ? '⚡ (Synced)' : yr === '2025-26' ? '(Stage 3)' : ''}
      </button>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="salary-calculator"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Household Income</h2>
            <p className="text-xs text-slate-400">Calculate multi-salary after-tax cashflow in NSW</p>
          </div>
        </div>

        {/* Financial Year Selector & Sync */}
        <div className="flex flex-wrap items-center gap-2" id="fy-controls-container">
          <div className="flex overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl p-1 items-center gap-1" id="fy-selector">
            <span className="text-xs text-slate-400 px-2 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Period:
            </span>
            {renderPeriods()}
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            id="sync-tax-rates-btn"
            className={`flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-800/80 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md ${
              isSyncing ? 'animate-pulse opacity-70 cursor-not-allowed' : ''
            }`}
            title="Scrape the internet to retrieve current personal income tax rates"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSyncing ? 'Scraping...' : 'Sync Rates'}</span>
          </button>
        </div>
      </div>

      {syncError && (
        <div className="mb-4 bg-rose-950/20 border border-rose-500/30 text-rose-400 text-xs rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {dynamicTaxConfig && (
        <div className="mb-4 bg-emerald-950/10 border border-emerald-500/20 text-emerald-300 text-[11px] rounded-xl p-3 flex items-center justify-between">
          <span>Synced active ATO Individual Income Tax Brackets for <strong className="text-emerald-400">FY {dynamicTaxConfig.financialYear}</strong>.</span>
          <span className="text-emerald-500 font-mono text-[10px]">Medicare Levy: {(dynamicTaxConfig.medicareLevyRate * 100).toFixed(1)}%</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSalaryBreakdown('Salary 1', taxBreakdown1, (val) => onUpdate({ salary1: val }), salary1)}
        {renderSalaryBreakdown('Salary 2 (Partner)', taxBreakdown2, (val) => onUpdate({ salary2: val }), salary2)}
      </div>

      {/* Household Summary Card */}
      <div className="mt-6 bg-gradient-to-r from-emerald-950/20 to-slate-900/40 border border-emerald-500/10 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider flex items-center gap-1 mb-1">
            <Landmark className="w-3 h-3" /> Combined Household Capital
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">${totalNet.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">Combined Net Annual</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Equivalent to <span className="text-slate-200 font-semibold font-mono">${Math.round(totalNet / 12).toLocaleString()}</span>/month after tax.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 text-right w-full md:w-auto border-t md:border-t-0 border-slate-800/80 pt-4 md:pt-0">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase">Gross Annual</span>
            <span className="text-sm font-semibold text-slate-300 font-mono">${totalGross.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase">Total Tax + Levy</span>
            <span className="text-sm font-semibold text-rose-400/80 font-mono">${(totalTax + totalMedicare).toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase">Effective Tax</span>
            <span className="text-sm font-semibold text-amber-400/80 font-mono">
              {totalGross > 0 ? (((totalTax + totalMedicare) / totalGross) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
