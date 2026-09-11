export interface ValidationResult {
  is_ok: boolean;
  raw_input: string;
  cleaned_input: string;
  status_code: string;
  detailed_reason: string;
  has_leading_space: boolean;
  has_trailing_space: boolean;
  enter_count: number;
  invalid_chars: string[];
  issues: string[];
}

export interface MatchResult {
  is_ok: boolean;
  manual_val: string;
  scanned_val: string;
  manual_validation: ValidationResult;
  scanned_validation: ValidationResult;
  status_code: string;
  detailed_reason: string;
}

export interface LineValidation {
  line_number: number;
  raw_content: string;
  validation: ValidationResult;
  match_status: 'OK' | 'NG';
  failure_reason: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  manual_val: string;
  scanned_val: string;
  result: 'OK' | 'NG';
  error_details: string;
}

export interface SessionStats {
  totalScans: number;
  passCount: number;
  failCount: number;
  lastResult: 'OK' | 'NG' | null;
}

export type ViewTab = 'single' | 'bulk' | 'logs';
