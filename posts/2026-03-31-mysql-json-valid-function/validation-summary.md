# Validation Summary: How to Use JSON_VALID() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL
- JSON
- MySQL JSON functions (JSON_VALID, JSON_EXTRACT, JSON_UNQUOTE)
- MySQL CHECK constraints

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_VALID() — https://dev.mysql.com/doc/refman/8.0/en/json-validation-functions.html#function_json-valid
- MySQL 8.0 Reference Manual: CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: The JSON Data Type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: JSON Path Syntax and Inline Operators (->, ->>) — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#operator_json-inline-path

## Issues Found
No technical issues found.

## Review Notes
- The CHECK constraint `CHECK (JSON_VALID(payload))` allows NULL payloads, since MySQL treats a CHECK expression that evaluates to NULL as not violated. This is standard behavior but not explicitly called out in the post. Not an error — just a subtlety readers should be aware of.
- The audit query `SUM(1 - JSON_VALID(raw_data))` would not count rows where `raw_data` is NULL (since `1 - NULL = NULL` is excluded from SUM). This is fine for the sample data which has no NULLs, but could be misleading for real-world datasets with nullable columns.
- The `->>` inline path operator is used on a TEXT column, which works because `JSON_EXTRACT()` accepts string arguments. The post correctly advises guarding with `JSON_VALID()` first to avoid errors on invalid rows.
- All error codes cited (3819 for CHECK violation, 3140 for invalid JSON text) are accurate.
