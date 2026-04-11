# Validation Summary: How to Use setup_instruments Table in MySQL Performance Schema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL Performance Schema
- `setup_instruments` table
- `performance_schema_instrument` server startup option

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Startup Configuration (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-startup-configuration.html)
- MySQL 8.0 Reference Manual: Performance Schema System Variables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variables.html)
- MySQL 8.0 Reference Manual: String Functions — SUBSTRING_INDEX (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_substring-index)

## Issues Found
No technical issues found.

## Review Notes
- The PROPERTIES column was added in MySQL 8.0.16 and the VOLATILITY column in MySQL 8.0.1. The post does not specify a minimum MySQL version, so readers on MySQL 5.7 or early 8.0 releases would encounter errors with the Properties section query. This is a minor documentation gap, not a technical error.
- The VOLATILITY description ("how often instrument state changes (singleton vs. session-level)") is a simplification. VOLATILITY is actually a numeric value indicating how frequently instrument instances are created and destroyed. The description is adequate for a blog audience but not precise.
- The query `WHERE NAME LIKE 'statement/sql/select'` uses LIKE without wildcards, making it functionally equivalent to `WHERE NAME = 'statement/sql/select'`. This works correctly but is slightly unconventional.
- The DOCUMENTATION column (added in MySQL 8.0.25) is not mentioned, which is fine — the post is not obligated to cover every column.
