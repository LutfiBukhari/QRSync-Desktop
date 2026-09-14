import React, { useState, useRef, useEffect } from 'react';
import { MatchResult, ValidationResult } from '../types';
import { apiCompareValues, apiWriteLogEntry } from '../services/tauriBridge';
import { playSoundEffect } from '../services/audio';
import { Scan, CheckCircle2, XCircle, CornerDownLeft, Sparkles, RefreshCw, Key, ShieldCheck, Terminal, Bug } from 'lucide-react';

interface SingleMatchViewProps {
  onScanResult: (result: 'OK' | 'NG', manual: string, scanned: string, details: string) => void;
  autoFocus: boolean;
  soundEnabled: boolean;
}

export const SingleMatchView: React.FC<SingleMatchViewProps> = ({
  onScanResult,
  autoFocus,
  soundEnabled,
}) => {
  const [manualInput, setManualInput] = useState<string>('GH69-46615A');
  const [scannedInput, setScannedInput] = useState<string>('');
  const [lastMatchResult, setLastMatchResult] = useState<MatchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Raw keydown buffer tracking rapid hardware scanner input
  const rawKeyBufferRef = useRef<string>('');
  const qrTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus QR scanner field
  useEffect(() => {
    if (autoFocus && qrTextareaRef.current) {
      qrTextareaRef.current.focus();
    }
  }, [autoFocus, lastMatchResult]);

  const handleVerify = async (manual: string, rawScanned: string) => {
    if (!rawScanned && !manual) return;
    setIsProcessing(true);

    // Strictly pass rawScanned WITHOUT calling .trim() before verification
    const result = await apiCompareValues(manual, rawScanned);
    setLastMatchResult(result);

    // Play feedback audio
    playSoundEffect(result.is_ok ? 'OK' : 'NG', soundEnabled);

    // Log entry
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await apiWriteLogEntry({
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      manual_val: manual,
      scanned_val: rawScanned,
      result: result.is_ok ? 'OK' : 'NG',
      error_details: result.detailed_reason,
    });

    onScanResult(
      result.is_ok ? 'OK' : 'NG',
      manual,
      rawScanned,
      result.detailed_reason
    );

    setIsProcessing(false);

    // Clear raw buffer after verification
    rawKeyBufferRef.current = '';

    // Re-focus scanner box
    if (autoFocus) {
      setTimeout(() => {
        if (qrTextareaRef.current) {
          qrTextareaRef.current.focus();
          qrTextareaRef.current.select();
        }
      }, 50);
    }
  };

  const handleQrKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If hardware scanner or user hits Enter (keyCode 13 or Key: 'Enter')
    if (e.key === 'Enter' || e.keyCode === 13) {
      if (!e.shiftKey) {
        e.preventDefault();

        // Determine effective raw string to test
        let effectiveRaw = scannedInput;

        // If rawKeyBufferRef accumulated data during scan, prefer or combine it
        if (rawKeyBufferRef.current && rawKeyBufferRef.current.length > effectiveRaw.length) {
          effectiveRaw = rawKeyBufferRef.current;
        }

        // If the scanner typed/appended an Enter before submitting, ensure \n is captured in raw string
        if (effectiveRaw && !effectiveRaw.endsWith('\n') && !effectiveRaw.endsWith('\r')) {
          // Check if hardware scanner sent explicit newline or if enter event is part of sequence
          // If scanner sent 1x Enter or 2x Enter preset, verify raw input
        }

        handleVerify(manualInput, effectiveRaw);
      }
    } else if (e.key.length === 1) {
      // Accumulate raw key character into buffer
      rawKeyBufferRef.current += e.key;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      // Retain exact unsanitized pasted text with all newlines and spaces intact
      setScannedInput(pastedText);
      rawKeyBufferRef.current = pastedText;
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setScannedInput(val);
    if (!val) {
      rawKeyBufferRef.current = '';
    }
  };

  const applyPreset = (scannedPreset: string) => {
    setScannedInput(scannedPreset);
    rawKeyBufferRef.current = scannedPreset;
    handleVerify(manualInput, scannedPreset);
  };

  // Visual Character Anomaly Renderer & Debugger
  const renderVisualBreakdown = (val: ValidationResult) => {
    const raw = val.raw_input;
    if (!raw) return <span className="text-slate-500 italic font-sans text-xs">No input scanned</span>;

    const elements: React.ReactNode[] = [];
    let keyIdx = 0;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      const code = raw.charCodeAt(i);

      if (ch === ' ') {
        elements.push(
          <span key={keyIdx++} className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/60 text-yellow-300 text-xs font-mono font-bold" title={`Space (ASCII ${code})`}>
            ␠ space
          </span>
        );
      } else if (ch === '\t') {
        elements.push(
          <span key={keyIdx++} className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/60 text-yellow-300 text-xs font-mono font-bold" title={`Tab (ASCII ${code})`}>
            \t tab
          </span>
        );
      } else if (ch === '\n') {
        elements.push(
          <span key={keyIdx++} className="px-2 py-0.5 rounded bg-rose-500/30 border border-rose-500/80 text-rose-200 text-xs font-mono font-black animate-pulse" title={`Line Feed (ASCII ${code})`}>
            [↵ \n]
          </span>
        );
      } else if (ch === '\r') {
        if (raw[i + 1] === '\n') continue; // render \r\n combined
        elements.push(
          <span key={keyIdx++} className="px-2 py-0.5 rounded bg-rose-500/30 border border-rose-500/80 text-rose-200 text-xs font-mono font-black animate-pulse" title={`Carriage Return (ASCII ${code})`}>
            [↵ \r]
          </span>
        );
      } else if (!/[a-zA-Z0-9-]/.test(ch)) {
        elements.push(
          <span key={keyIdx++} className="px-2 py-0.5 rounded bg-rose-600/40 border border-rose-400 text-rose-100 text-xs font-mono font-bold animate-pulse" title={`Disallowed Symbol: '${ch}' (ASCII ${code})`}>
            {ch}
          </span>
        );
      } else {
        elements.push(
          <span key={keyIdx++} className="text-emerald-300 font-mono font-bold text-base">
            {ch}
          </span>
        );
      }
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
          {elements}
        </div>

        {/* ASCII Code Debug Stream */}
        <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-400 flex flex-wrap gap-2 items-center">
          <Bug className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-500">ASCII Debug Stream ({raw.length} bytes):</span>
          {Array.from(raw).map((c, idx) => (
            <span
              key={idx}
              className={`px-1 rounded ${
                c === '\n' || c === '\r'
                  ? 'bg-rose-500/30 text-rose-300 font-bold border border-rose-500/50'
                  : c === ' '
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              [{c.charCodeAt(0)} '{c === '\n' ? '\\n' : c === '\r' ? '\\r' : c}']
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Prominent High-Contrast Status Banner */}
      {lastMatchResult ? (
        <div
          className={`p-6 rounded-2xl border transition-all duration-300 shadow-2xl ${
            lastMatchResult.is_ok
              ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-emerald-500/60 shadow-emerald-500/20'
              : 'bg-gradient-to-r from-rose-950/90 via-slate-900 to-red-950/90 border-rose-500/80 shadow-rose-500/30 ring-2 ring-rose-500/40'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`p-4 rounded-2xl ${
                  lastMatchResult.is_ok
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {lastMatchResult.is_ok ? (
                  <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                ) : (
                  <XCircle className="w-12 h-12 stroke-[2.5] text-rose-400 animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`text-4xl font-black tracking-tight ${
                      lastMatchResult.is_ok ? 'text-emerald-400' : 'text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                    }`}
                  >
                    {lastMatchResult.is_ok ? 'OK / PASS' : 'NG / FAIL'}
                  </span>

                  <span
                    className={`px-3.5 py-1 text-sm font-mono font-extrabold rounded-xl uppercase border shadow-lg ${
                      lastMatchResult.is_ok
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                    }`}
                  >
                    {lastMatchResult.detailed_reason}
                  </span>
                </div>

                <p className="text-sm text-slate-300 mt-2 font-mono">
                  Target: <span className="text-emerald-300 font-bold">{lastMatchResult.manual_val}</span> | Scanned QR: <span className="text-cyan-300 font-bold">{lastMatchResult.scanned_val ? JSON.stringify(lastMatchResult.scanned_val) : '(Empty)'}</span>
                </p>
              </div>
            </div>

            {/* Diagnostic Metrics Pills */}
            <div className="flex flex-col items-end gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">FORMAT:</span>
                <span
                  className={
                    lastMatchResult.scanned_validation.is_ok
                      ? 'text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20'
                      : 'text-rose-400 font-bold px-2 py-0.5 bg-rose-500/20 rounded border border-rose-500/40'
                  }
                >
                  {lastMatchResult.scanned_validation.status_code}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">OVERALL MATCH:</span>
                <span
                  className={
                    lastMatchResult.is_ok
                      ? 'text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20'
                      : 'text-rose-400 font-bold px-2 py-0.5 bg-rose-500/20 rounded border border-rose-500/40'
                  }
                >
                  {lastMatchResult.is_ok ? 'PASS' : 'NG (FAILED)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-slate-400">
              <Scan className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">Ready for Hardware QR Scanning</h3>
              <p className="text-xs text-slate-400">
                Type or paste target Manual Value, then scan hardware QR barcode into scanner field below.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-mono bg-slate-800 text-slate-400 rounded-lg">
            Awaiting Input...
          </span>
        </div>
      )}

      {/* Main Dual Input Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Manual User Input */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-slate-100 text-lg">1. Manual User Input</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Expected Master Target</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Target Value Specification</label>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. GH69-46615A"
              className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>

          {/* Quick Target Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Target Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {['GH69-46615A', 'SN99-10294B', 'B882-77192C'].map((val) => (
                <button
                  key={val}
                  onClick={() => setManualInput(val)}
                  className="px-2.5 py-1 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: QR Scanner Textarea Input (Preserves Raw Line Breaks \n & \r) */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h2 className="font-bold text-slate-100 text-lg">2. Hardware QR Scanner Input</h2>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Raw Line-Break Preserving
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Scanned QR Code String (preserves \n & \r)</label>
            <div className="relative">
              <textarea
                ref={qrTextareaRef}
                rows={2}
                value={scannedInput}
                onChange={handleTextareaChange}
                onKeyDown={handleQrKeyDown}
                onPaste={handlePaste}
                placeholder="Scan hardware QR barcode here (Press Enter to verify)..."
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all shadow-inner resize-none"
              />
            </div>
          </div>

          <button
            onClick={() => handleVerify(manualInput, scannedInput)}
            disabled={isProcessing}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Verify Value & Formatting
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulation Scenarios Suite */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-slate-200">Simulation Scenarios & Diagnostic Test Suite</h3>
          </div>
          <span className="text-xs text-slate-400">Click preset to test specific condition</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => applyPreset('GH69-46615A')}
            className="p-3 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 rounded-xl text-left transition-all group"
          >
            <span className="text-xs font-bold text-emerald-400 block group-hover:text-emerald-300">
              1. Normal OK
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">"GH69-46615A"</span>
          </button>

          <button
            onClick={() => applyPreset("GH69-46615A\n")}
            className="p-3 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/50 rounded-xl text-left transition-all group ring-1 ring-rose-500/30"
          >
            <span className="text-xs font-bold text-rose-400 block group-hover:text-rose-300">
              2. Enter 1x
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">"GH69-46615A\n"</span>
          </button>

          <button
            onClick={() => applyPreset("GH69-46615A\n\n")}
            className="p-3 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/50 rounded-xl text-left transition-all group ring-1 ring-rose-500/30"
          >
            <span className="text-xs font-bold text-rose-400 block group-hover:text-rose-300">
              3. Enter 2x
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">"GH69-46615A\n\n"</span>
          </button>

          <button
            onClick={() => applyPreset(" GH69-46615A")}
            className="p-3 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/50 rounded-xl text-left transition-all group ring-1 ring-rose-500/30"
          >
            <span className="text-xs font-bold text-rose-400 block group-hover:text-rose-300">
              4. Leading Space
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">" GH69-46615A"</span>
          </button>

          <button
            onClick={() => applyPreset("GH69-46615A ")}
            className="p-3 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/50 rounded-xl text-left transition-all group ring-1 ring-rose-500/30"
          >
            <span className="text-xs font-bold text-rose-400 block group-hover:text-rose-300">
              5. Trailing Space
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">"GH69-46615A "</span>
          </button>

          <button
            onClick={() => applyPreset("GH69-46615A#")}
            className="p-3 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/50 rounded-xl text-left transition-all group ring-1 ring-rose-500/30"
          >
            <span className="text-xs font-bold text-rose-400 block group-hover:text-rose-300">
              6. Other Symbols
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">"GH69-46615A#"</span>
          </button>
        </div>
      </div>

      {/* Visual Character Anomaly Renderer & ASCII Debugger Stream */}
      {lastMatchResult && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Visual Character & ASCII Byte Debugger Stream
            </h3>
            <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Raw Bytes Inspection
            </span>
          </div>

          {renderVisualBreakdown(lastMatchResult.scanned_validation)}
        </div>
      )}
    </div>
  );
};
