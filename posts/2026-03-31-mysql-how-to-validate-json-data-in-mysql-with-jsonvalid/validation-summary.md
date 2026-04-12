# Validation Summary: How to Validate JSON Data in MySQL with JSON_VALID()

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL JSON functions (JSON_VALID, JSON_EXTRACT, JSON_UNQUOTE)
- MySQL CHECK constraints (8.0.16+)
- MySQL generated (computed) columns

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_VALID(): https://dev.mysql.com/doc/refman/8.0/en/json-validation-functions.html#function_json-valid
- MySQL 8.0 Reference Manual — The JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that CHECK constraints require MySQL 8.0.16+ (earlier versions parsed but silently ignored them).
- All scalar JSON value examples (`'42'`, `'"hello"'`, `'true'`, `'null'`) correctly return 1 from JSON_VALID().
- The CASE WHEN pattern for safe extraction correctly handles the NULL case — if `payload` is NULL, JSON_VALID(NULL) returns NULL, which falls through to the ELSE branch returning 'INVALID'.
- The STORED generated column approach is valid since JSON_VALID() is deterministic. Note that if `request_body` is NULL, the generated column will store NULL (not 0), so queries filtering on `is_valid_json = 1` will correctly exclude both invalid and NULL rows.
- None.
