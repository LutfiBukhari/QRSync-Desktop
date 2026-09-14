import { invoke } from '@tauri-apps/api/core';
import { ValidationResult, MatchResult, LineValidation, LogEntry } from '../types';

// Check if running inside Tauri
const isTauriAvailable = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Frontend Fallback validator replicating exact Rust backend rules
 * Inspects raw bytes and hardware scanner 'j' / 'jj' Line Feed control sequences
 */
export const clientValidateQR = (rawInput: string): ValidationResult => {
  const issues: string[] = [];
  const invalidCharsSet = new Set<string>();

  let n_count = 0;
  let r_count = 0;
  for (let i = 0; i < rawInput.length; i++) {
    const code = rawInput.charCodeAt(i);
    if (code === 10) n_count++;
    if (code === 13) r_count++;
  }

  const total_raw_breaks = n_count > 0 ? n_count : r_count;

  // Hardware scanner Line Feed control translation ('j' / 'jj' / 'J' / 'JJ')
  const has_double_j_suffix = rawInput.endsWith('jj') || rawInput.endsWith('JJ');
  const has_single_j_suffix = !has_double_j_suffix && (rawInput.endsWith('j') || rawInput.endsWith('J'));

  const has_double_enter =
    rawInput.includes('\n\n') ||
    rawInput.includes('\r\n\r\n') ||
    rawInput.includes('\r\r') ||
    total_raw_breaks >= 2 ||
    has_double_j_suffix;

  const enter_count = has_double_enter ? 2 : (total_raw_breaks === 1 || has_single_j_suffix) ? 1 : 0;

  if (enter_count >= 2) {
    issues.push('NG: Detected 2x Enter');
  } else if (enter_count === 1) {
    issues.push('NG: Detected 1x Enter');
  }

  let contentForChars = rawInput.replace(/[\r\n]+/g, '');
  if (has_double_j_suffix) {
    contentForChars = contentForChars.slice(0, -2);
  } else if (has_single_j_suffix) {
    contentForChars = contentForChars.slice(0, -1);
  }

  const has_leading_space = /^[ \t]/.test(contentForChars);
  if (has_leading_space) {
    issues.push('NG: Leading Space Detected');
  }

  const has_trailing_space = /[ \t]$/.test(contentForChars);
  if (has_trailing_space) {
    issues.push('NG: Trailing Space Detected');
  }

  for (let i = 0; i < contentForChars.length; i++) {
    const ch = contentForChars[i];
    if (!/[a-zA-Z0-9-]/.test(ch)) {
      invalidCharsSet.add(ch);
    }
  }

  const invalid_chars = Array.from(invalidCharsSet);
  if (invalid_chars.length > 0) {
    issues.push('NG: Character Mismatch');
  }

  const is_ok = issues.length === 0 && rawInput.length > 0;
  const status_code = is_ok ? 'OK' : 'NG';
  const detailed_reason = is_ok
    ? 'OK: Standard Valid Format'
    : rawInput.length === 0
    ? 'NG: Empty Input'
    : issues.join(' | ');

  return {
    is_ok,
    raw_input: rawInput,
    cleaned_input: rawInput.trim(),
    status_code,
    detailed_reason,
    has_leading_space,
    has_trailing_space,
    enter_count,
    invalid_chars,
    issues,
  };
};

export const clientCompareValues = (manual: string, scanned: string): MatchResult => {
  const manualValidation = clientValidateQR(manual);
  const scannedValidation = clientValidateQR(scanned);

  // Formatting and scanner control errors MUST take absolute precedence
  if (!scannedValidation.is_ok) {
    return {
      is_ok: false,
      manual_val: manual,
      scanned_val: scanned,
      manual_validation: manualValidation,
      scanned_validation: scannedValidation,
      status_code: 'NG',
      detailed_reason: scannedValidation.detailed_reason,
    };
  }

  if (manual.trim() !== scanned.trim()) {
    return {
      is_ok: false,
      manual_val: manual,
      scanned_val: scanned,
      manual_validation: manualValidation,
      scanned_validation: scannedValidation,
      status_code: 'NG',
      detailed_reason: 'NG: Value Mismatch',
    };
  }

  return {
    is_ok: true,
    manual_val: manual,
    scanned_val: scanned,
    manual_validation: manualValidation,
    scanned_validation: scannedValidation,
    status_code: 'OK',
    detailed_reason: 'OK: Value Match PASS',
  };
};

// Log storage fallback
const LOCAL_STORAGE_LOG_KEY = 'matchvalue_audit_logs';

const getLocalLogs = (): LogEntry[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalLogs = (logs: LogEntry[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_LOG_KEY, JSON.stringify(logs.slice(0, 1000)));
  } catch (e) {
    console.error('Failed to save logs to localStorage', e);
  }
};

// API Functions calling Tauri IPC with fallback
export const apiValidateQR = async (rawInput: string): Promise<ValidationResult> => {
  if (isTauriAvailable()) {
    try {
      return await invoke<ValidationResult>('validate_qr_content', { rawInput });
    } catch (err) {
      console.warn('Tauri invoke error, using client fallback:', err);
    }
  }
  return clientValidateQR(rawInput);
};

export const apiCompareValues = async (manual: string, scanned: string): Promise<MatchResult> => {
  if (isTauriAvailable()) {
    try {
      return await invoke<MatchResult>('compare_values', { manual, scanned });
    } catch (err) {
      console.warn('Tauri invoke error, using client fallback:', err);
    }
  }
  return clientCompareValues(manual, scanned);
};

export const apiParseBulkFile = async (fileContent: string): Promise<LineValidation[]> => {
  if (isTauriAvailable()) {
    try {
      return await invoke<LineValidation[]>('parse_bulk_file', { fileContent });
    } catch (err) {
      console.warn('Tauri invoke error, using client fallback:', err);
    }
  }
  
  const lines = fileContent.split('\n');
  return lines.map((line, idx) => {
    const val = clientValidateQR(line);
    return {
      line_number: idx + 1,
      raw_content: line,
      validation: val,
      match_status: val.is_ok ? 'OK' : 'NG',
      failure_reason: val.is_ok ? 'None' : val.detailed_reason,
    };
  });
};

export const apiWriteLogEntry = async (entry: LogEntry): Promise<void> => {
  if (isTauriAvailable()) {
    try {
      await invoke('write_log_entry', { entry });
      return;
    } catch (err) {
      console.warn('Tauri invoke error, using client fallback:', err);
    }
  }
  const logs = getLocalLogs();
  logs.unshift(entry);
  saveLocalLogs(logs);
};

export const apiGetLogHistory = async (): Promise<LogEntry[]> => {
  if (isTauriAvailable()) {
    try {
      return await invoke<LogEntry[]>('get_log_history');
    } catch (err) {
      console.warn('Tauri invoke error, using client fallback:', err);
    }
  }
  return getLocalLogs();
};

export const apiClearLogs = async (): Promise<void> => {
  if (isTauriAvailable()) {
    try {
      await invoke('clear_log_history');
      return;
    } catch (err) {
      console.warn('Tauri invoke error, using client fallback:', err);
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_LOG_KEY);
};
