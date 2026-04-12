# Validation Summary: How to Use VERSION() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (VERSION() information function)
- SQL (SUBSTRING_INDEX, CAST, CASE, stored procedures, SIGNAL)
- Python (DB-API cursor usage)
- Node.js (mysql2/promise library)

## Sources Consulted
- MySQL 8.0 Reference Manual: Information Functions — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_version
- MySQL 8.0 Reference Manual: Server System Variables (version) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_version
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: String Functions (SUBSTRING_INDEX) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_substring-index
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: SQL Mode (strict mode) — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html

## Issues Found

1. **VARCHAR(20) too small in stored procedure**: The `v_version` variable was declared as `VARCHAR(20)`, but real-world MySQL version strings with distribution info (e.g., `8.0.36-0ubuntu0.22.04.1` at 23 characters) exceed this length. In MySQL 8.0's default strict SQL mode, this would cause a "Data too long for column" error. Changed to `VARCHAR(100)`.

2. **Incorrect SHOW STATUS LIKE 'version%'**: The post included `SHOW STATUS LIKE 'version%'` with the comment "Status info including version". MySQL has no server status variables starting with "version" — version information is available through system variables (`SHOW VARIABLES`), not status variables. This query returns an empty result set and was misleading. Removed the incorrect line and its comment.

## Review Notes
- The Node.js example uses the `mysql2/promise` API pattern (`conn.execute` returning `[rows, fields]`). This is correct but assumes a specific library — a minor note for readers using other MySQL drivers.
- The `parseInt()` call in the Node.js example works correctly here but does not specify a radix. Adding `parseInt(version.split('.')[0], 10)` would be a best practice, though not a correctness issue since the string starts with a digit.
- The post correctly notes that `VERSION()` is equivalent to `@@version`, which is accurate per MySQL documentation.
