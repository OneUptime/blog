# Validation Summary: How to Use SHOW FUNCTION STATUS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SQL (SHOW FUNCTION STATUS, SHOW CREATE FUNCTION)
- information_schema.ROUTINES

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW FUNCTION STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-function-status.html
- MySQL 8.0 Reference Manual: SHOW CREATE FUNCTION — https://dev.mysql.com/doc/refman/8.0/en/show-create-function.html
- MySQL 8.0 Reference Manual: The information_schema ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: String Comparison Functions (LIKE operator) — https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html

## Issues Found
1. **Unescaped underscore wildcard in LIKE pattern**: The pattern `LIKE 'fn_%'` was intended to find functions starting with the literal prefix "fn_", but `_` is a LIKE wildcard that matches any single character. This means the pattern would also match names like "fnXtest" or "fn1calc". Fixed by escaping the underscore: `LIKE 'fn\_%'`.

## Review Notes
- The claim that deterministic functions enable "better query caching" is a simplification. The query cache was removed in MySQL 8.0, but the DETERMINISTIC characteristic still affects optimizations such as safe statement-based replication and internal per-query evaluation caching. The statement is not wrong but could be more precise for MySQL 8.0+ audiences.
- The SHOW CREATE FUNCTION output example is simplified (omits the sql_mode, character_set_client, collation_connection, and Database Collation columns that appear in real output). This is acceptable for a tutorial focused on the function definition itself.
- All information_schema column names and query patterns are correct.
- The comparison between functions and procedures is accurate at a high level, though procedures can also return result sets via SELECT statements (not just OUT parameters). The blog's framing is correct for the context of value-returning behavior usable in expressions.
