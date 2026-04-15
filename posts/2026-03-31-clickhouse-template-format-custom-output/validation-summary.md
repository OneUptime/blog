# Validation Summary: How to Use Template Format in ClickHouse for Custom Output

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse Template format
- ClickHouse TemplateIgnoreSpaces format
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation on Template format: https://clickhouse.com/docs/interfaces/formats/Template
- ClickHouse official documentation on format schemas directory
- ClickHouse escaping rules documentation

## Issues Found

### Issue 1: Incorrect casing for `None` escaping rule
- **What was wrong:** In the "Supported Escaping Options" section, the escaping rule was listed as `${column_name:none}` (lowercase).
- **What was changed:** Corrected to `${column_name:None}` (capitalized) to match the official ClickHouse escaping rule name.
- **Why:** ClickHouse escaping rules are case-sensitive. The official documentation uses `None`, not `none`. Using the wrong case could cause a parsing error.

### Issue 2: Double-quoting in JSON row template
- **What was wrong:** The JSON row template example had manual quotes around string-type placeholders: `"type": "${event_type:JSON}", "timestamp": "${ts:JSON}"`.
- **What was changed:** Removed the manual quotes: `"type": ${event_type:JSON}, "timestamp": ${ts:JSON}`.
- **Why:** The `:JSON` escaping rule in ClickHouse serializes values as JSON values. For string types, ClickHouse automatically adds quotes and applies JSON string escaping. Wrapping the placeholder in additional manual quotes would produce double-quoted output like `""some_value""`, resulting in invalid JSON.

## Review Notes
- The blog uses `# filename` comments inside some template file code blocks (e.g., `# custom_csv_row.txt`). While this is a common convention for labeling code blocks, readers should be aware that ClickHouse template files are literal text with no comment syntax -- the `#` line should not be included in the actual template file.
- The post correctly covers both input and output uses of the Template format, the full set of escaping rules, and the correct settings names.
- All SQL syntax and CLI commands are correct for current ClickHouse versions.
