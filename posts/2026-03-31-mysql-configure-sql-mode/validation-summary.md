# Validation Summary: How to Configure MySQL Server SQL Mode

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- MySQL SQL modes (STRICT_TRANS_TABLES, ONLY_FULL_GROUP_BY, TRADITIONAL, ANSI, etc.)
- MySQL server configuration (my.cnf)
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual — Server SQL Modes: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Reference Manual — Server System Variables (sql_mode): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sql_mode
- MySQL 5.7 Reference Manual — Server SQL Modes (for migration comparison): https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html

## Issues Found

1. **`@@sql_mode` used instead of `@@GLOBAL.sql_mode` in SET GLOBAL statements** — The CONCAT and REPLACE examples used `@@sql_mode` (which refers to the session variable) inside `SET GLOBAL` statements. This could produce unexpected results if the session mode differs from the global mode. Fixed both occurrences to use `@@GLOBAL.sql_mode`.

2. **Incorrect TRADITIONAL mode example** — The original example claimed `INSERT INTO orders (quantity) VALUES (-1)` would error under TRADITIONAL mode. However, -1 is a perfectly valid value for a signed INTEGER column. TRADITIONAL mode only rejects truly invalid or out-of-range data. Replaced the example with inserting an invalid date (`'2026-02-30'`), which clearly demonstrates TRADITIONAL mode rejecting invalid data that would otherwise be silently converted to `'0000-00-00'`.

3. **ERROR_FOR_DIVISION_BY_ZERO description oversimplified** — The table described this mode as "Return an error for division by zero." Per the docs, this mode produces only a warning on its own; it produces an error only when combined with strict mode (e.g., STRICT_TRANS_TABLES). Updated the description to "Produce a warning (or error with strict mode) for division by zero."

4. **Overstated 5.7-to-8.0 migration claim** — The post said "the default SQL mode changed significantly" between 5.7 and 8.0. In reality, the only change was the removal of `NO_AUTO_CREATE_USER` (deprecated in 5.7). The strict modes were already defaults in 5.7. Updated to accurately describe the change and note that the real migration risk is for applications that used custom lenient modes.

## Review Notes
- The REPLACE approach for removing a single mode (`REPLACE(@@GLOBAL.sql_mode, 'ONLY_FULL_GROUP_BY,', '')`) is fragile — it assumes the target mode is not the last item in the comma-separated list (where there would be no trailing comma). This works for the default mode string where ONLY_FULL_GROUP_BY is first, but could fail in other configurations. A future improvement could note this caveat.
- `ERROR_FOR_DIVISION_BY_ZERO` is deprecated as of MySQL 8.0.3 and its behavior may be folded into strict mode in a future release. The post does not mention this deprecation.
- The `systemctl restart mysql` command is correct for Debian/Ubuntu systems. On RHEL/CentOS, the service name is typically `mysqld`. This is a minor platform-specific detail.
