/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Trash2, Check, Plus, RefreshCw, Layers, ArrowUpRight, CheckSquare, Square, ChevronRight } from 'lucide-react';
import { FinancialScenario } from '../types';
import { calculateNSWStampDuty, calculateNSWIncomeTax, simulateMortgagePayoff } from '../utils/finance';

interface SavedScenariosProps {
  currentScenario: Omit<FinancialScenario, 'id' | 'name' | 'createdAt'>;
  savedScenarios: FinancialScenario[];
  onSave: (name: string) => void;
  onLoad: (scenario: FinancialScenario) => void;
  onDelete: (id: string) => void;
}

export default function SavedScenarios({
  currentScenario,
  savedScenarios,
  onSave,
  onLoad,
  onDelete
}: SavedScenariosProps) {
  const [newScenarioName, setNewScenarioName] = useState('');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    onSave(newScenarioName.trim());
    setNewScenarioName('');
  };

  const toggleSelectScenario = (id: string) => {
    if (selectedScenarioIds.includes(id)) {
      setSelectedScenarioIds(selectedScenarioIds.filter(x => x !== id));
    } else {
      if (selectedScenarioIds.length >= 3) {
        // limit side-by-side comparison to 3 scenarios for screen layout limits
        alert('You can compare up to 3 scenarios side-by-side.');
        return;
      }
      setSelectedScenarioIds([...selectedScenarioIds, id]);
    }
  };

  const comparedScenarios = savedScenarios.filter(s => selectedScenarioIds.includes(s.id));

  const getScenarioMetrics = (s: FinancialScenario) => {
    const stampDuty = calculateNSWStampDuty(s.propertyPrice, s.isFirstHomeBuyer);
    const conveyancingFees = 2000;
    const totalCosts = s.propertyPrice + stampDuty + conveyancingFees;
    const totalOffsetAssets = s.cashAssets + s.sharesAssets + s.otherAssets;
    const appliedInterestFreeLoan = s.interestFreeLoanActive ? s.interestFreeLoanAmount : 0;
    const mortgageAmount = Math.max(0, totalCosts - totalOffsetAssets - appliedInterestFreeLoan);

    // Salaries
    const tax1 = calculateNSWIncomeTax(s.salary1, s.taxYear);
    const tax2 = calculateNSWIncomeTax(s.salary2, s.taxYear);
    const totalNetAnnual = tax1.netPay + tax2.netPay;
    const netMonthly = totalNetAnnual / 12;

    // Simulation
    const {
      monthsToPayoffStandard,
      monthsToPayoffAccelerated,
      totalInterestStandard,
      totalInterestAccelerated,
      standardMonthlyPayment
    } = simulateMortgagePayoff(
      mortgageAmount,
      s.interestRatePrimary,
      s.mortgageTermYears,
      s.monthlyExpenses,
      s.monthlyExtraRepayment,
      s.interestFreeLoanActive,
      s.interestFreeLoanAmount,
      s.interestFreeLoanRepaymentYear,
      netMonthly
    );

    const dti = (s.salary1 + s.salary2) > 0 ? (mortgageAmount / (s.salary1 + s.salary2)) : 0;

    return {
      mortgageAmount,
      stampDuty,
      totalCosts,
      totalNetAnnual,
      monthsToPayoffStandard,
      monthsToPayoffAccelerated,
      totalInterestStandard,
      totalInterestAccelerated,
      standardMonthlyPayment,
      dti
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="saved-scenarios-panel"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Saved Scenario Planner</h2>
            <p className="text-xs text-slate-400">Save current variables and compare different financial pathways side-by-side</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Save current scenario input + scenario list */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={handleSave} className="space-y-3" id="save-scenario-form">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Save Current Configuration</h3>
            <div className="flex gap-2">
              <input
                type="text"
                id="input-scenario-name"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                placeholder="e.g. Bondi 2-Bed Flat"
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                id="btn-save-scenario"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Save
              </button>
            </div>
          </form>

          {/* List of saved scenarios */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Saved Scenarios ({savedScenarios.length})</h3>
            {savedScenarios.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No saved scenarios yet. Use form above to save one.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="saved-scenarios-list">
                {savedScenarios.map((s) => {
                  const isSelectedForComparison = selectedScenarioIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className="bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 group"
                    >
                      <button
                        onClick={() => toggleSelectScenario(s.id)}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                        id={`btn-select-${s.id}`}
                      >
                        {isSelectedForComparison ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onLoad(s)}>
                        <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                          {s.name}
                        </h4>
                        <div className="flex gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>${(s.propertyPrice / 1000).toFixed(0)}k</span>
                          <span>•</span>
                          <span>{s.suburb}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onLoad(s)}
                          className="p-1.5 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-all text-[10px] font-bold"
                          title="Load variables"
                          id={`btn-load-${s.id}`}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => onDelete(s.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-all"
                          title="Delete"
                          id={`btn-delete-${s.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Side-by-side comparison space */}
        <div className="lg:col-span-2">
          {comparedScenarios.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-10 border border-dashed border-slate-800 rounded-xl">
              <Layers className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 text-center font-medium">
                Check boxes next to saved scenarios above <br />
                to compare up to 3 of them side-by-side.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" /> Comparison Matrix
                </span>
                <button
                  onClick={() => setSelectedScenarioIds([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                >
                  Clear Selection
                </button>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold">
                    <th className="p-2 pb-3 font-semibold text-[10px] uppercase">Variable</th>
                    {comparedScenarios.map((s) => (
                      <th key={s.id} className="p-2 pb-3 text-center text-slate-200 truncate max-w-[120px]">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Property Price</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className="p-2 text-center font-mono font-bold text-slate-200">
                        ${s.propertyPrice.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Mortgage Required</td>
                    {comparedScenarios.map((s) => {
                      const m = getScenarioMetrics(s).mortgageAmount;
                      return (
                        <td key={s.id} className="p-2 text-center font-mono font-semibold text-sky-400">
                          ${m.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Primary Rate</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className="p-2 text-center font-mono font-semibold">
                        {s.interestRatePrimary}%
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Combined Gross Pay</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className="p-2 text-center font-mono text-slate-400">
                        ${(s.salary1 + s.salary2).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">NSW Stamp Duty</td>
                    {comparedScenarios.map((s) => {
                      const sd = getScenarioMetrics(s).stampDuty;
                      return (
                        <td key={s.id} className="p-2 text-center font-mono text-rose-400/80">
                          ${sd.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Monthly Expenses</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className="p-2 text-center font-mono text-rose-400/70">
                        ${s.monthlyExpenses.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Monthly Extra Pay</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className="p-2 text-center font-mono text-emerald-400">
                        +${s.monthlyExtraRepayment.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">Accelerated Payoff</td>
                    {comparedScenarios.map((s) => {
                      const m = getScenarioMetrics(s).monthsToPayoffAccelerated;
                      const yrs = (m / 12).toFixed(1);
                      return (
                        <td key={s.id} className="p-2 text-center font-mono font-bold text-emerald-400">
                          {yrs} Years
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="p-2 py-2.5 font-medium text-slate-400">DTI Leverage</td>
                    {comparedScenarios.map((s) => {
                      const dti = getScenarioMetrics(s).dti;
                      return (
                        <td key={s.id} className={`p-2 text-center font-mono font-semibold ${dti >= 6 ? 'text-rose-400' : dti >= 4.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {dti.toFixed(1)}x
                        </td>
                      );
                    })}
                  </tr>
                  {comparedScenarios.some(s => s.exitPlannerInputs) && (
                    <>
                      <tr className="border-t border-slate-800/60 bg-slate-900/10">
                        <td colSpan={comparedScenarios.length + 1} className="p-2 py-1.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                          Exit Planner Variables
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-950/20">
                        <td className="p-2 py-2 font-medium text-slate-400">Exit Prop Value</td>
                        {comparedScenarios.map((s) => (
                          <td key={s.id} className="p-2 text-center font-mono text-slate-300">
                            {s.exitPlannerInputs?.currentPropertyValue ? `$${s.exitPlannerInputs.currentPropertyValue.toLocaleString()}` : "—"}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-950/20">
                        <td className="p-2 py-2 font-medium text-slate-400">Holding Period</td>
                        {comparedScenarios.map((s) => (
                          <td key={s.id} className="p-2 text-center font-mono text-slate-300">
                            {s.exitPlannerInputs?.holdingPeriodMonths ? `${s.exitPlannerInputs.holdingPeriodMonths} Mo` : "—"}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-950/20">
                        <td className="p-2 py-2 font-medium text-slate-400">Exit Mortgage Rate</td>
                        {comparedScenarios.map((s) => (
                          <td key={s.id} className="p-2 text-center font-mono text-slate-300">
                            {s.exitPlannerInputs?.mortgageInterestRate ? `${s.exitPlannerInputs.mortgageInterestRate}%` : "—"}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-950/20">
                        <td className="p-2 py-2 font-medium text-slate-400">Exit Rental Income</td>
                        {comparedScenarios.map((s) => (
                          <td key={s.id} className="p-2 text-center font-mono text-slate-300">
                            {s.exitPlannerInputs?.isRentedOut ? `Yes ($${s.exitPlannerInputs.weeklyRent}/wk)` : "No"}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
