import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { apiGetLogHistory, apiClearLogs } from '../services/tauriBridge';
import { History, Download, Trash2, Search, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export const LogAuditView: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterResult, setFilterResult] = useState<'ALL' | 'OK' | 'NG'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setLoading(true);
    const data = await apiGetLogHistory();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear all historical comparison logs?')) {
      await apiClearLogs();
      setLogs([]);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Manual Value', 'Scanned QR Value', 'Result', 'Error Details'];
    const rows = logs.map((log) => [
      `"${log.timestamp}"`,
      `"${log.manual_val.replace(/"/g, '""')}"`,
      `"${log.scanned_val.replace(/"/g, '""')}"`,
      log.result,
      `"${log.error_details.replace(/"/g, '""')}"`,
    ]);

    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matchvalue_audit_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterResult === 'OK' && log.result !== 'OK') return false;
    if (filterResult === 'NG' && log.result !== 'NG') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.timestamp.toLowerCase().includes(q) ||
        log.manual_val.toLowerCase().includes(q) ||
        log.scanned_val.toLowerCase().includes(q) ||
        log.error_details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">System Audit Logs</h2>
              <p className="text-xs text-slate-400">
                Automatic recording of all scan & comparison events ({logs.length} total entries)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={fetchLogs}
              title="Refresh Audit Logs"
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export .CSV
            </button>

            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit timestamp, values, errors..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 self-end sm:self-auto">
            <button
              onClick={() => setFilterResult('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                filterResult === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterResult('OK')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                filterResult === 'OK' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              OK Only
            </button>
            <button
              onClick={() => setFilterResult('NG')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                filterResult === 'NG' ? 'bg-rose-600 text-white' : 'text-slate-400'
              }`}
            >
              NG Only
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Manual Input</th>
                <th className="py-3.5 px-4">Scanned QR Input</th>
                <th className="py-3.5 px-4 w-28">Result</th>
                <th className="py-3.5 px-4">Error / Validation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                    No log records found. Perform scan verification in Single Match view.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-xs">{log.timestamp}</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">{log.manual_val || '-'}</td>
                    <td className="py-3 px-4 text-cyan-300 font-bold">{log.scanned_val || '-'}</td>
                    <td className="py-3 px-4">
                      {log.result === 'OK' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          NG
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={log.result === 'OK' ? 'text-slate-500' : 'text-rose-400 font-semibold'}>
                        {log.error_details}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
