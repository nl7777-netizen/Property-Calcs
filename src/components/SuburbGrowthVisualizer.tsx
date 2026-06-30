/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, MapPin, Sparkles, Home, Landmark, ShieldAlert, ArrowRight } from 'lucide-react';
import { NSW_SUBURBS, projectPropertyGrowth } from '../utils/finance';
import { SuburbData, GrowthProjectionPoint } from '../types';

interface SuburbGrowthVisualizerProps {
  propertyPrice: number;
  mortgageAmount: number;
  interestRatePrimary: number;
  mortgageTermYears: number;
  monthlyExpenses: number;
  monthlyExtraRepayment: number;
  interestFreeLoanActive: boolean;
  interestFreeLoanAmount: number;
  interestFreeLoanRepaymentYear: number;
  householdMonthlyNetIncome: number;
  suburb: string;
  customGrowthRate: number;
  suburbsList: SuburbData[];
  onUpdate: (fields: { suburb?: string; customGrowthRate?: number }) => void;
  onAddSuburb: (newSuburb: SuburbData) => void;
}

export default function SuburbGrowthVisualizer({
  propertyPrice,
  mortgageAmount,
  interestRatePrimary,
  mortgageTermYears,
  monthlyExpenses,
  monthlyExtraRepayment,
  interestFreeLoanActive,
  interestFreeLoanAmount,
  interestFreeLoanRepaymentYear,
  householdMonthlyNetIncome,
  suburb,
  customGrowthRate,
  suburbsList,
  onUpdate,
  onAddSuburb
}: SuburbGrowthVisualizerProps) {

  const [activeTab, setActiveTab] = useState<'chart' | 'data'>('chart');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Suburb lookup
  const selectedSuburbObj = useMemo(() => {
    return suburbsList.find(s => s.name.toLowerCase() === suburb.toLowerCase()) || suburbsList[suburbsList.length - 1] || { name: 'Custom Suburb', region: 'Custom', medianHousePrice: 1200000, historicalGrowthRate: 5.5 };
  }, [suburb, suburbsList]);

  const handleSuburbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const found = suburbsList.find(s => s.name === selectedName);
    if (found) {
      onUpdate({
        suburb: found.name,
        customGrowthRate: found.historicalGrowthRate
      });
    }
  };

  const handleSearchSuburb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/suburb-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb: searchQuery.trim() })
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve metrics for the specified suburb.');
      }
      const data = await res.json();
      if (data && data.name && data.historicalGrowthRate !== undefined) {
        onAddSuburb(data);
        onUpdate({
          suburb: data.name,
          customGrowthRate: data.historicalGrowthRate
        });
        setSearchQuery('');
      } else {
        throw new Error('Received unexpected format from suburb insights.');
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Generate 30 year growth projection data
  const projectionData = useMemo(() => {
    if (propertyPrice <= 0) return [];
    return projectPropertyGrowth(
      propertyPrice,
      customGrowthRate,
      mortgageAmount,
      interestRatePrimary,
      mortgageTermYears,
      monthlyExpenses,
      monthlyExtraRepayment,
      interestFreeLoanActive,
      interestFreeLoanAmount,
      interestFreeLoanRepaymentYear,
      householdMonthlyNetIncome
    );
  }, [
    propertyPrice,
    customGrowthRate,
    mortgageAmount,
    interestRatePrimary,
    mortgageTermYears,
    monthlyExpenses,
    monthlyExtraRepayment,
    interestFreeLoanActive,
    interestFreeLoanAmount,
    interestFreeLoanRepaymentYear,
    householdMonthlyNetIncome
  ]);

  // Clean values for SVG drawing
  const chartWidth = 600;
  const chartHeight = 300;
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const drawableWidth = chartWidth - paddingLeft - paddingRight;
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  const { maxVal, minVal } = useMemo(() => {
    if (projectionData.length === 0) return { maxVal: 1000000, minVal: 0 };
    const max = Math.max(...projectionData.map(d => d.propertyValue));
    return { maxVal: max * 1.05, minVal: 0 };
  }, [projectionData]);

  // Translate a year and value into SVG pixel coordinates
  const getCoords = (year: number, val: number) => {
    const x = paddingLeft + (year / 30) * drawableWidth;
    const y = paddingTop + drawableHeight - (val / maxVal) * drawableHeight;
    return { x, y };
  };

  // Generate SVG path for a given key
  const getSvgPath = (key: 'propertyValue' | 'mortgageBalanceStandard' | 'mortgageBalanceAccelerated' | 'equityStandard' | 'equityAccelerated') => {
    if (projectionData.length === 0) return '';
    return projectionData
      .map((d, idx) => {
        const { x, y } = getCoords(d.year, d[key]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Handle SVG pointer move to check closest year for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || projectionData.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Scale clientX to SVG coordinate space
    const svgX = (clientX / rect.width) * chartWidth;
    
    // Determine closest year
    const drawableX = svgX - paddingLeft;
    const percentage = drawableX / drawableWidth;
    const yearFloat = percentage * 30;
    const yearInt = Math.max(0, Math.min(30, Math.round(yearFloat)));
    
    setHoveredPointIndex(yearInt);
  };

  const handleMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  // 5-year intervals for horizontal labels
  const horizontalGrid = [0, 5, 10, 15, 20, 25, 30];

  // 4 price tick vertical grid lines
  const verticalGridTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      ticks.push((maxVal / 4) * i);
    }
    return ticks;
  }, [maxVal]);

  const activePoint = hoveredPointIndex !== null ? projectionData[hoveredPointIndex] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950/55 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      id="suburb-growth-visualizer"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Investment Growth Projections</h2>
            <p className="text-xs text-slate-400">Project capital growth and equity building over 30 years</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 self-start md:self-auto" id="visualization-tabs">
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'chart'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Growth Curve
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'data'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Yearly Projections Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Side: Suburb and custom rate controls */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location Parameters</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                Select NSW Suburb Area
              </label>
              <select
                id="select-nsw-suburb"
                value={suburb}
                onChange={handleSuburbChange}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:border-sky-500 focus:outline-none transition-all cursor-pointer font-medium"
              >
                {suburbsList.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.region}) - Median House: ${(s.medianHousePrice / 1000000).toFixed(2)}M
                  </option>
                ))}
              </select>
            </div>

            {/* Suburb Search & Scrape */}
            <form onSubmit={handleSearchSuburb} className="space-y-2">
              <label className="block text-[11px] text-slate-400 font-medium">Add/Search NSW Suburb Metrics (Gemini AI)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Marrickville, Redfern"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchError && (
                <p className="text-[10px] text-rose-400 font-medium mt-1">{searchError}</p>
              )}
            </form>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium">Expected Growth Rate (Annual)</label>
                <span className="text-xs text-sky-400 font-mono font-bold">{customGrowthRate.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.1"
                value={customGrowthRate}
                onChange={(e) => onUpdate({ customGrowthRate: parseFloat(e.target.value) || 5.0 })}
                className="w-full accent-sky-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>Conservative (2%)</span>
                <span>Optimistic (10%+)</span>
              </div>
            </div>

            {/* Selected suburb summary details */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-300">Suburb Insight: {selectedSuburbObj.name}</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <p>
                  NSW historically has strong growth vectors. Curated historical index for <strong className="text-slate-200">{selectedSuburbObj.name}</strong> averages <strong className="text-sky-400">{selectedSuburbObj.historicalGrowthRate}%</strong> annually.
                </p>
                <p className="border-t border-slate-800/60 pt-2 text-[10px] italic">
                  Property compounding over a standard 30 year cycle yields major tax-free capital gains (under primary residence exemption rules).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Projection Chart or Data Table */}
        <div className="lg:col-span-2">
          {propertyPrice <= 0 ? (
            <div className="h-full flex flex-col justify-center items-center py-12 border border-dashed border-slate-800 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400 font-medium">Please enter a property price to calculate compounding growth.</p>
            </div>
          ) : activeTab === 'chart' ? (
            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-4">
              {/* Chart Title / Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs font-semibold">
                <span className="text-slate-400">Compounding Asset Timeline (Hover to Inspect)</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-emerald-400 rounded" />
                    <span className="text-slate-400 text-[10px]">Property Value</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-slate-400 rounded" />
                    <span className="text-slate-400 text-[10px]">Standard Loan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-sky-400 rounded" />
                    <span className="text-slate-400 text-[10px]">Accelerated Loan</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="relative w-full aspect-[2/1] min-h-[220px]">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-full select-none"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Grid Lines (Vertical ticks) */}
                  {verticalGridTicks.map((tick, idx) => {
                    const y = getCoords(0, tick).y;
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
                          ${(tick / 1000000).toFixed(1)}M
                        </text>
                      </g>
                    );
                  })}

                  {/* Horizontal Grid (Years) */}
                  {horizontalGrid.map((year) => {
                    const x = getCoords(year, 0).x;
                    return (
                      <g key={year} className="opacity-20">
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
                          y={chartHeight - paddingBottom + 15}
                          fill="#94a3b8"
                          fontSize="9"
                          textAnchor="middle"
                          className="font-mono"
                        >
                          Yr {year}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Paths for Trends */}
                  {projectionData.length > 0 && (
                    <>
                      {/* Property Value Line */}
                      <path
                        d={getSvgPath('propertyValue')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Standard Mortgage Loan Balance */}
                      <path
                        d={getSvgPath('mortgageBalanceStandard')}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        strokeLinecap="round"
                      />
                      {/* Accelerated Mortgage Balance */}
                      <path
                        d={getSvgPath('mortgageBalanceAccelerated')}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Interactive Hover Line */}
                      {activePoint && (
                        <line
                          x1={getCoords(activePoint.year, 0).x}
                          y1={paddingTop}
                          x2={getCoords(activePoint.year, 0).x}
                          y2={chartHeight - paddingBottom}
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          opacity="0.5"
                        />
                      )}

                      {/* Interactive Hover Dots */}
                      {activePoint && (
                        <>
                          <circle
                            cx={getCoords(activePoint.year, activePoint.propertyValue).x}
                            cy={getCoords(activePoint.year, activePoint.propertyValue).y}
                            r="4.5"
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
                            r="4.5"
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

              {/* Active Point Inspected Values */}
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center md:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-medium">Inspected Period</span>
                  <span className="text-sm font-bold text-slate-200 font-mono">
                    {activePoint ? `Year ${activePoint.year}` : 'Hover chart above'}
                  </span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-medium">Asset Valuation</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {activePoint ? `$${activePoint.propertyValue.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-medium">Standard Equity</span>
                  <span className="text-sm font-semibold text-slate-400 font-mono">
                    {activePoint ? `$${activePoint.equityStandard.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-medium">Accelerated Equity</span>
                  <span className="text-sm font-bold text-sky-400 font-mono animate-pulse">
                    {activePoint ? `$${activePoint.equityAccelerated.toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Table Projection View */
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">Year</th>
                    <th className="p-3">Property Value</th>
                    <th className="p-3">Standard Balance</th>
                    <th className="p-3">Accelerated Balance</th>
                    <th className="p-3">Accelerated Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
                  {projectionData.filter(d => d.year % 2 === 0 || d.year === 1 || d.year === 30).map((d) => (
                    <tr key={d.year} className="hover:bg-slate-950/30">
                      <td className="p-3 text-slate-400 font-bold">Yr {d.year}</td>
                      <td className="p-3 text-emerald-400">${d.propertyValue.toLocaleString()}</td>
                      <td className="p-3 text-slate-500">${d.mortgageBalanceStandard.toLocaleString()}</td>
                      <td className="p-3 text-sky-400">${d.mortgageBalanceAccelerated.toLocaleString()}</td>
                      <td className="p-3 text-slate-200 font-bold">${d.equityAccelerated.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
