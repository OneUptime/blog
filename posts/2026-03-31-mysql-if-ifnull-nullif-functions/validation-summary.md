# Validation Summary: How to Use MySQL IF, IFNULL, NULLIF Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (IF, IFNULL, NULLIF control flow functions)
- SQL (SELECT queries, CREATE TABLE, INSERT)

## Sources Consulted
- MySQL 8.0 Reference Manual — Control Flow Functions: https://dev.mysql.com/doc/refman/8.0/en/control-flow-functions.html
- MySQL 8.0 Reference Manual — Server SQL Modes (ERROR_FOR_DIVISION_BY_ZERO): https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html

## Issues Found
1. **Line 168 — "fatal error" claim for division by zero**: The post stated that without NULLIF, division by zero produces "a fatal error." In MySQL, `SELECT 1/0` returns NULL with a warning — it is not a fatal error. The ERROR_FOR_DIVISION_BY_ZERO sql_mode only affects INSERT/UPDATE in strict mode, not SELECT. Fixed the wording to "triggering a divide-by-zero warning," which accurately describes MySQL's behavior while preserving the rationale for using NULLIF.

## Review Notes
- The `IFNULL(bonus, 'Not eligible')` example mixes DECIMAL and VARCHAR types. MySQL handles this via implicit type coercion, but readers should be aware the result column type will be VARCHAR. This is acceptable for a demonstration but worth noting.
- The NULLIF pattern for safe division is still a best practice even though MySQL SELECT doesn't error on divide-by-zero, because it suppresses the warning and is portable to databases like PostgreSQL that do raise errors.
- All SQL syntax, sample data, query output tables, and function descriptions are accurate.
