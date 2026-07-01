/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Upload, Copy, Check, Share2, ArrowRight, 
  FileJson, AlertCircle, RefreshCw, CheckCircle, Smartphone, Laptop
} from 'lucide-react';
import { FinancialScenario, TaxYear, DynamicTaxConfig, SuburbData } from '../types';

interface SettingsSyncProps {
  currentInputs: {
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
    simulateFuturePurchase: boolean;
    propertyInflationEnabled: boolean;
    currentSimDate: string;
    purchaseSimDate: string;
    monthlySavingsContribution: number;
    savingsAnnualReturnRate: number;
    existingPropertyValue: number;
    existingPropertyLoan: number;
    useExistingEquity: boolean;
  };
  exitPlannerInputs?: any;
  savedScenarios: FinancialScenario[];
  suburbsList: SuburbData[];
  dynamicTaxConfig?: DynamicTaxConfig;
  onImport: (importedData: {
    activeInputs: any;
    exitPlannerInputs?: any;
    savedScenarios: FinancialScenario[];
    suburbsList?: SuburbData[];
    dynamicTaxConfig?: DynamicTaxConfig;
  }) => void;
}

export default function SettingsSync({
  currentInputs,
  exitPlannerInputs,
  savedScenarios,
  suburbsList,
  dynamicTaxConfig,
  onImport
}: SettingsSyncProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Prepare export package
  const generateExportPayload = () => {
    return {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      activeInputs: currentInputs,
      exitPlannerInputs: exitPlannerInputs,
      savedScenarios: savedScenarios,
      suburbsList: suburbsList,
      dynamicTaxConfig: dynamicTaxConfig
    };
  };

  // Helper: Convert object to Unicode-safe Base64 string
  const encodePayload = (data: any): string => {
    try {
      const jsonStr = JSON.stringify(data);
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  // Helper: Decode Unicode-safe Base64 string back to object
  const decodePayload = (b64: string): any => {
    try {
      const jsonStr = decodeURIComponent(escape(atob(b64.trim())));
      return JSON.parse(jsonStr);
    } catch (e) {
      // If not Base64, try parsing as raw JSON
      try {
        return JSON.parse(b64.trim());
      } catch {
        throw new Error('Invalid code or JSON format. Make sure you copied the correct text.');
      }
    }
  };

  // Action: Export & Download JSON file
  const handleDownloadFile = () => {
    try {
      const payload = generateExportPayload();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(payload, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute(
        'download',
        `nsw-property-planner-sync-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Settings file downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg('Failed to generate settings file.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Action: Generate and copy text sync code
  const handleCopySyncCode = () => {
    const payload = generateExportPayload();
    const encoded = encodePayload(payload);
    if (!encoded) {
      setErrorMsg('Failed to encode sync data.');
      return;
    }

    navigator.clipboard.writeText(encoded).then(
      () => {
        setCopiedCode(true);
        setSuccessMsg('Sync code copied to clipboard! Share it with your wife.');
        setTimeout(() => setCopiedCode(false), 2000);
        setTimeout(() => setSuccessMsg(null), 4000);
      },
      () => {
        setErrorMsg('Failed to write to clipboard. Please copy the code manually.');
      }
    );
  };

  // Action: Validate & Import settings data
  const processImport = (data: any) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!data || typeof data !== 'object') {
      throw new Error('Import data must be a valid JSON object.');
    }

    // Basic structure check
    if (!data.activeInputs && !data.savedScenarios) {
      throw new Error('Settings file does not contain active inputs or saved scenarios.');
    }

    onImport({
      activeInputs: data.activeInputs,
      exitPlannerInputs: data.exitPlannerInputs,
      savedScenarios: data.savedScenarios || [],
      suburbsList: data.suburbsList,
      dynamicTaxConfig: data.dynamicTaxConfig
    });

    setSuccessMsg('Settings successfully synced! Your workspace is fully updated.');
    setSyncCode('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Action: Handle Text Code submission
  const handleApplySyncCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncCode.trim()) return;

    try {
      const decoded = decodePayload(syncCode);
      processImport(decoded);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply sync code. Please check your code.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // Action: Handle file uploading
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        processImport(parsed);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to read file. Make sure it is a valid exported .json settings file.');
        setTimeout(() => setErrorMsg(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  // Drag & Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          processImport(parsed);
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to read file. Make sure it is a valid exported .json settings file.');
          setTimeout(() => setErrorMsg(null), 5000);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-6 relative" id="settings-sync-panel">
      
      {/* Alert Toasts inside the card */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2.5 shadow-lg"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 bg-rose-950/80 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2.5 shadow-lg"
          >
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
        
        {/* Left Hand: Explainer & Export Actions */}
        <div className="lg:w-1/2 space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">Device Sync & Spouse Sharing</h3>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed">
            Collaborating with your partner is vital for property planning. Use these seamless tools to share your exact budget variables, tax configurations, custom suburbs, and saved scenarios with your wife on another device.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {/* Download JSON Button */}
            <button
              onClick={handleDownloadFile}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              id="btn-download-settings"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Settings File</span>
            </button>

            {/* Copy Sync Code Button */}
            <button
              onClick={handleCopySyncCode}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-500/5"
              id="btn-copy-sync-code"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Wireless Sync Code'}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 pt-1.5 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-slate-600" /> Web App Sync
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-slate-600" /> Mobile/Tablet Safe
            </span>
            <span>•</span>
            <span>Local & Encrypted Data</span>
          </div>
        </div>

        {/* Right Hand: Import Actions (Drag-n-Drop File / Wireless Paste) */}
        <div className="lg:w-1/2 w-full space-y-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Import Settings / Apply Sync</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* File Drag-and-Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-950/10' 
                  : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileJson className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-[11px] font-bold text-slate-300">Drag & Drop File Here</span>
              <span className="text-[9px] text-slate-500 mt-1">or click to browse (.json)</span>
            </div>

            {/* wireless copy-paste area */}
            <form onSubmit={handleApplySyncCode} className="flex flex-col gap-2">
              <textarea
                value={syncCode}
                onChange={(e) => setSyncCode(e.target.value)}
                placeholder="Paste wireless sync code here..."
                rows={3}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[10px] text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 font-mono resize-none leading-relaxed"
                id="textarea-sync-code"
              />
              <button
                type="submit"
                disabled={!syncCode.trim()}
                className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  syncCode.trim()
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-600'
                    : 'bg-slate-900 text-slate-500 border border-slate-800/60 cursor-not-allowed'
                }`}
                id="btn-apply-sync-code"
              >
                <span>Apply Wireless Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

          <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400/80 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              <strong>Notice:</strong> Syncing settings will overwrite the current active planning variables and saved scenarios on this browser tab. Ensure you have backed up any unique parameters you wish to preserve.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
