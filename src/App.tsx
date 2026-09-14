import React, { useState, useEffect } from 'react';
import { ViewTab, SessionStats } from './types';
import { Navbar } from './components/Navbar';
import { SingleMatchView } from './components/SingleMatchView';
import { BulkView } from './components/BulkView';
import { LogAuditView } from './components/LogAuditView';
import { ShieldCheck, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('single');
  const [stats, setStats] = useState<SessionStats>({
    totalScans: 0,
    passCount: 0,
    failCount: 0,
    lastResult: null,
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoFocus, setAutoFocus] = useState<boolean>(true);

  // Suppress browser default popups (e.g. Ctrl+J Downloads popup, Ctrl+S Save popup, Drag-and-drop file shelf)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Ctrl+J / Cmd+J (Downloads shelf), Ctrl+S (Save), Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      // Prevent browser default file open/download action on drop unless inside bulk dropzone
      const target = e.target as HTMLElement;
      if (!target.closest('.bulk-dropzone')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleScanResult = (result: 'OK' | 'NG') => {
    setStats((prev) => ({
      totalScans: prev.totalScans + 1,
      passCount: result === 'OK' ? prev.passCount + 1 : prev.passCount,
      failCount: result === 'NG' ? prev.failCount + 1 : prev.failCount,
      lastResult: result,
    }));
  };

  const handleResetStats = () => {
    setStats({
      totalScans: 0,
      passCount: 0,
      failCount: 0,
      lastResult: null,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        stats={stats}
        onResetStats={handleResetStats}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        autoFocus={autoFocus}
        setAutoFocus={setAutoFocus}
      />

      {/* Main View Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {currentTab === 'single' && (
          <SingleMatchView
            onScanResult={handleScanResult}
            autoFocus={autoFocus}
            soundEnabled={soundEnabled}
          />
        )}

        {currentTab === 'bulk' && <BulkView />}

        {currentTab === 'logs' && <LogAuditView />}
      </main>

      {/* App Status Footer */}
      <footer className="glass-panel border-t border-slate-800/80 px-6 py-2.5 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-300 font-semibold">MatchValue Engine Core Active</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Tauri v2 + Rust Anomaly Engine</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Regex Anomaly Detector</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Persistent JSON Audit Log</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
