import React, { useState } from 'react';
import { LineValidation } from '../types';
import { apiParseBulkFile } from '../services/tauriBridge';
import { FileSpreadsheet, Upload, Download, Search, CheckCircle2, XCircle, FileText, Sparkles, Filter } from 'lucide-react';

export const BulkView: React.FC = () => {
  const [lines, setLines] = useState<LineValidation[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OK' | 'NG'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = await apiParseBulkFile(content);
        setLines(parsed);
      }
    };
    reader.readAsText(file);
  };

  const loadSampleBulk = async () => {
    const sampleContent = `GH69-46615A
GH69-46615A\n
 GH69-46615A
GH69-46615A 
GH69-46615A#
GH69-46615A\n\n
A100-2024
B200-9999
C300-8888!
D400-7777`;

    setFileName('sample_bulk_codes.txt');
    const parsed = await apiParseBulkFile(sampleContent);
    setLines(parsed);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = await apiParseBulkFile(content);
        setLines(parsed);
      }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    if (lines.length === 0) return;
    const headers = ['Line Number', 'Raw Content', 'Status', 'Failure Reason'];
    const rows = lines.map((l) => [
      l.line_number,
      `"${l.raw_content.replace(/"/g, '""')}"`,
      l.match_status,
      `"${l.failure_reason.replace(/"/g, '""')}"`,
    ]);

    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_inspection_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLines = lines.filter((line) => {
    if (filterStatus === 'OK' && line.match_status !== 'OK') return false;
    if (filterStatus === 'NG' && line.match_status !== 'NG') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        line.raw_content.toLowerCase().includes(q) ||
        line.failure_reason.toLowerCase().includes(q) ||
        line.line_number.toString().includes(q)
      );
    }
    return true;
  });

  const okCount = lines.filter((l) => l.match_status === 'OK').length;
  const ngCount = lines.filter((l) => l.match_status === 'NG').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Upload Zone & Header */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="glass-panel p-8 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 transition-all text-center space-y-4 relative group"
      >
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 w-16 h-16 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Bulk .txt File Inspection</h2>
          <p className="text-sm text-slate-400 mt-1">
            Drag and drop a multi-line <code className="text-emerald-400 font-mono">.txt</code> file here, or click to browse.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <label className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Browse .txt File
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={loadSampleBulk}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Load Sample Suite
          </button>
        </div>

        {fileName && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400">
            <span>File Loaded:</span>
            <span className="font-bold">{fileName}</span>
            <span>({lines.length} lines)</span>
          </div>
        )}
      </div>

      {/* Results Summary & Filter Bar */}
      {lines.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">TOTAL LINES:</span>
                <span className="text-sm font-bold font-mono text-white">{lines.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
                <span className="text-xs text-emerald-400">OK (PASS):</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{okCount}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/30">
                <span className="text-xs text-rose-400">NG (FAIL):</span>
                <span className="text-sm font-bold font-mono text-rose-400">{ngCount}</span>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lines..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                    filterStatus === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('OK')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                    filterStatus === 'OK' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  OK
                </button>
                <button
                  onClick={() => setFilterStatus('NG')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                    filterStatus === 'NG' ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  NG
                </button>
              </div>

              <button
                onClick={exportCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-20">Line #</th>
                  <th className="py-3.5 px-4">Raw Content</th>
                  <th className="py-3.5 px-4 w-32">Status</th>
                  <th className="py-3.5 px-4">Failure Reason / Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
                {filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No matching lines found.
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line) => (
                    <tr key={line.line_number} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-bold">#{line.line_number}</td>
                      <td className="py-3 px-4 text-slate-200">
                        <div className="flex items-center gap-1">
                          {line.raw_content.replace(/\r/g, '').split('').map((c, i) => {
                            if (c === ' ') return <span key={i} className="char-space-pill">␠</span>;
                            if (c === '\n') return <span key={i} className="char-newline-pill">↵</span>;
                            if (!/[a-zA-Z0-9-]/.test(c)) return <span key={i} className="char-invalid-pill">{c}</span>;
                            return <span key={i}>{c}</span>;
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {line.match_status === 'OK' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5" />
                            NG
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            line.match_status === 'OK' ? 'text-slate-500' : 'text-rose-400 font-semibold'
                          }
                        >
                          {line.failure_reason}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
