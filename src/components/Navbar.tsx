import React from 'react';
import { ViewTab, SessionStats } from '../types';
import { Scan, FileSpreadsheet, History, Volume2, VolumeX, RotateCcw, ShieldCheck, Zap } from 'lucide-react';

interface NavbarProps {
  currentTab: ViewTab;
  setTab: (tab: ViewTab) => void;
  stats: SessionStats;
  onResetStats: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  autoFocus: boolean;
  setAutoFocus: (autoFocus: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  stats,
  onResetStats,
  soundEnabled,
  setSoundEnabled,
  autoFocus,
  setAutoFocus,
}) => {
  const passRate = stats.totalScans > 0 ? ((stats.passCount / stats.totalScans) * 100).toFixed(1) : '100.0';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                MatchValue <span className="text-emerald-400 font-black">ENGINE</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                v2.0 Desktop
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Real-time Hardware QR Scanner & Anomaly Verification
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setTab('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              currentTab === 'single'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Scan className="w-4 h-4" />
            Single Match
          </button>

          <button
            onClick={() => setTab('bulk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              currentTab === 'bulk'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Inspection
          </button>

          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              currentTab === 'logs'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs
          </button>
        </nav>

        {/* Controls & Quick Stats */}
        <div className="flex items-center gap-4">
          {/* Quick Counter */}
          <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">TOTAL:</span>
              <span className="font-bold text-white">{stats.totalScans}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">OK:</span>
              <span className="font-bold text-emerald-400">{stats.passCount}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-rose-400 font-semibold">NG:</span>
              <span className="font-bold text-rose-400">{stats.failCount}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1">
              <span className="text-slate-400">PASS:</span>
              <span className="font-bold text-cyan-400">{passRate}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto Focus Toggle */}
            <button
              onClick={() => setAutoFocus(!autoFocus)}
              title={autoFocus ? 'Auto-focus QR input active' : 'Auto-focus disabled'}
              className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                autoFocus
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Zap className={`w-4 h-4 ${autoFocus ? 'text-cyan-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{autoFocus ? 'Auto-Focus ON' : 'Auto-Focus OFF'}</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reset Stats */}
            <button
              onClick={onResetStats}
              title="Reset Session Counters"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
