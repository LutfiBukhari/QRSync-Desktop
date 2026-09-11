use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Write, Read};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct ValidationResult {
    pub is_ok: bool,
    pub raw_input: String,
    pub cleaned_input: String,
    pub status_code: String,
    pub detailed_reason: String,
    pub has_leading_space: bool,
    pub has_trailing_space: bool,
    pub enter_count: usize,
    pub invalid_chars: Vec<char>,
    pub issues: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct MatchResult {
    pub is_ok: bool,
    pub manual_val: String,
    pub scanned_val: String,
    pub manual_validation: ValidationResult,
    pub scanned_validation: ValidationResult,
    pub status_code: String,
    pub detailed_reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct LineValidation {
    pub line_number: usize,
    pub raw_content: String,
    pub validation: ValidationResult,
    pub match_status: String,
    pub failure_reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub manual_val: String,
    pub scanned_val: String,
    pub result: String, // "OK" or "NG"
    pub error_details: String,
}

/// Core QR & Text validation logic according to business rules
pub fn validate_qr_content_impl(raw_input: &str) -> ValidationResult {
    let mut issues = Vec::new();
    let mut invalid_chars = Vec::new();

    // Check line breaks (\n, \r\n)
    let n_count = raw_input.matches('\n').count();
    let r_count = raw_input.matches('\r').count();
    let has_double_enter = raw_input.contains("\n\n") 
        || raw_input.contains("\r\n\r\n") 
        || raw_input.contains("\n\r\n")
        || n_count >= 2;

    let enter_count = if has_double_enter {
        2
    } else if n_count == 1 || (r_count >= 1 && n_count == 0) {
        1
    } else {
        0
    };

    if enter_count >= 2 {
        issues.push("NG: Detected 2x Enter".to_string());
    } else if enter_count == 1 {
        issues.push("NG: Detected 1x Enter".to_string());
    }

    // Strip trailing line breaks for whitespace analysis
    let without_newlines = raw_input.trim_matches(|c| c == '\r' || c == '\n');

    // Check Leading Space
    let has_leading_space = without_newlines.starts_with(' ') || without_newlines.starts_with('\t');
    if has_leading_space {
        issues.push("NG: Leading Space Detected".to_string());
    }

    // Check Trailing Space
    let has_trailing_space = without_newlines.ends_with(' ') || without_newlines.ends_with('\t');
    if has_trailing_space {
        issues.push("NG: Trailing Space Detected".to_string());
    }

    // Check allowed character set: A-Z, a-z, 0-9, and '-'
    for ch in raw_input.chars() {
        if ch == '\r' || ch == '\n' {
            continue; // handled by enter checks
        }
        if !ch.is_ascii_alphanumeric() && ch != '-' {
            if !invalid_chars.contains(&ch) {
                invalid_chars.push(ch);
            }
        }
    }

    if !invalid_chars.is_empty() {
        issues.push("NG: Character Mismatch".to_string());
    }

    let is_ok = issues.is_empty() && !raw_input.is_empty();
    let status_code = if is_ok {
        "OK".to_string()
    } else {
        "NG".to_string()
    };

    let detailed_reason = if is_ok {
        "OK: Standard Valid Format".to_string()
    } else if raw_input.is_empty() {
        "NG: Empty Input".to_string()
    } else {
        issues.join(" | ")
    };

    let cleaned_input = raw_input.trim().to_string();

    ValidationResult {
        is_ok,
        raw_input: raw_input.to_string(),
        cleaned_input,
        status_code,
        detailed_reason,
        has_leading_space,
        has_trailing_space,
        enter_count,
        invalid_chars,
        issues,
    }
}

/// Compare Manual User Input vs QR Scan Input
pub fn compare_values_impl(manual: &str, scanned: &str) -> MatchResult {
    let manual_val = manual.to_string();
    let scanned_val = scanned.to_string();

    let manual_validation = validate_qr_content_impl(manual);
    let scanned_validation = validate_qr_content_impl(scanned);

    // If scanned validation fails formatting
    if !scanned_validation.is_ok {
        return MatchResult {
            is_ok: false,
            manual_val,
            scanned_val,
            manual_validation,
            scanned_validation: scanned_validation.clone(),
            status_code: "NG".to_string(),
            detailed_reason: scanned_validation.detailed_reason,
        };
    }

    // If values do not match
    if manual.trim() != scanned.trim() {
        return MatchResult {
            is_ok: false,
            manual_val,
            scanned_val,
            manual_validation,
            scanned_validation,
            status_code: "NG".to_string(),
            detailed_reason: "NG: Value Mismatch".to_string(),
        };
    }

    MatchResult {
        is_ok: true,
        manual_val,
        scanned_val,
        manual_validation,
        scanned_validation,
        status_code: "OK".to_string(),
        detailed_reason: "OK: Value Match PASS".to_string(),
    }
}

/// Parse and validate multi-line bulk file content (.txt)
pub fn parse_bulk_file_impl(file_content: &str) -> Vec<LineValidation> {
    let lines: Vec<&str> = file_content.split('\n').collect();
    let mut result = Vec::new();

    for (idx, line) in lines.iter().enumerate() {
        let line_num = idx + 1;
        let raw = line.to_string();
        let validation = validate_qr_content_impl(&raw);
        let match_status = if validation.is_ok { "OK".to_string() } else { "NG".to_string() };
        let failure_reason = if validation.is_ok {
            "None".to_string()
        } else {
            validation.detailed_reason.clone()
        };

        result.push(LineValidation {
            line_number: line_num,
            raw_content: raw,
            validation,
            match_status,
            failure_reason,
        });
    }

    result
}

fn get_log_file_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push("matchvalue_audit_logs.json");
    path
}

/// Write a log entry to persistent JSON file
pub fn write_log_entry_impl(entry: LogEntry) -> Result<(), String> {
    let path = get_log_file_path();
    let mut history = get_log_history_impl().unwrap_or_default();
    history.insert(0, entry); // prepend newest logs

    // Keep last 1000 logs
    if history.len() > 1000 {
        history.truncate(1000);
    }

    let json_data = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(json_data.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Retrieve all historical audit log entries
pub fn get_log_history_impl() -> Result<Vec<LogEntry>, String> {
    let path = get_log_file_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;

    if contents.trim().is_empty() {
        return Ok(Vec::new());
    }

    let logs: Vec<LogEntry> = serde_json::from_str(&contents).unwrap_or_default();
    Ok(logs)
}

/// Clear all audit log records
pub fn clear_log_history_impl() -> Result<(), String> {
    let path = get_log_file_path();
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

mod commands {
    use super::*;

    #[tauri::command]
    pub fn validate_qr_content(raw_input: &str) -> ValidationResult {
        validate_qr_content_impl(raw_input)
    }

    #[tauri::command]
    pub fn compare_values(manual: &str, scanned: &str) -> MatchResult {
        compare_values_impl(manual, scanned)
    }

    #[tauri::command]
    pub fn parse_bulk_file(file_content: &str) -> Vec<LineValidation> {
        parse_bulk_file_impl(file_content)
    }

    #[tauri::command]
    pub fn write_log_entry(entry: LogEntry) -> Result<(), String> {
        write_log_entry_impl(entry)
    }

    #[tauri::command]
    pub fn get_log_history() -> Result<Vec<LogEntry>, String> {
        get_log_history_impl()
    }

    #[tauri::command]
    pub fn clear_log_history() -> Result<(), String> {
        clear_log_history_impl()
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate_qr_content,
            commands::compare_values,
            commands::parse_bulk_file,
            commands::write_log_entry,
            commands::get_log_history,
            commands::clear_log_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_qr() {
        let res = validate_qr_content_impl("GH69-46615A");
        assert!(res.is_ok);
        assert_eq!(res.status_code, "OK");
        assert_eq!(res.enter_count, 0);
        assert!(!res.has_leading_space);
        assert!(!res.has_trailing_space);
        assert!(res.invalid_chars.is_empty());
    }

    #[test]
    fn test_enter_1x() {
        let res = validate_qr_content_impl("GH69-46615A\n");
        assert!(!res.is_ok);
        assert_eq!(res.enter_count, 1);
        assert!(res.detailed_reason.contains("NG: Detected 1x Enter"));
    }

    #[test]
    fn test_enter_2x() {
        let res = validate_qr_content_impl("GH69-46615A\n\n");
        assert!(!res.is_ok);
        assert_eq!(res.enter_count, 2);
        assert!(res.detailed_reason.contains("NG: Detected 2x Enter"));
    }

    #[test]
    fn test_leading_space() {
        let res = validate_qr_content_impl(" GH69-46615A");
        assert!(!res.is_ok);
        assert!(res.has_leading_space);
        assert!(res.detailed_reason.contains("NG: Leading Space Detected"));
    }

    #[test]
    fn test_trailing_space() {
        let res = validate_qr_content_impl("GH69-46615A ");
        assert!(!res.is_ok);
        assert!(res.has_trailing_space);
        assert!(res.detailed_reason.contains("NG: Trailing Space Detected"));
    }

    #[test]
    fn test_character_mismatch() {
        let res = validate_qr_content_impl("GH69-46615A#");
        assert!(!res.is_ok);
        assert_eq!(res.invalid_chars, vec!['#']);
        assert!(res.detailed_reason.contains("NG: Character Mismatch"));
    }

    #[test]
    fn test_compare_values_pass() {
        let match_res = compare_values_impl("GH69-46615A", "GH69-46615A");
        assert!(match_res.is_ok);
        assert_eq!(match_res.status_code, "OK");
    }

    #[test]
    fn test_compare_values_mismatch() {
        let match_res = compare_values_impl("GH69-46615A", "GH69-99999A");
        assert!(!match_res.is_ok);
        assert_eq!(match_res.detailed_reason, "NG: Value Mismatch");
    }
}
