# Validation Summary: How to Use SET PERSIST in MySQL 8

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- MySQL system variables and configuration management
- `SET PERSIST`, `SET PERSIST_ONLY`, `SET GLOBAL`
- `mysqld-auto.cnf` configuration file
- `performance_schema.persisted_variables` table

## Sources Consulted
- MySQL 8.0 Reference Manual: SET Syntax for Variable Assignment — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: Persisted System Variables — https://dev.mysql.com/doc/refman/8.0/en/persisted-system-variables.html
- MySQL 8.0 Reference Manual: RESET PERSIST Statement — https://dev.mysql.com/doc/refman/8.0/en/reset-persist.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL (SYSTEM_VARIABLES_ADMIN, PERSIST_RO_VARIABLES_ADMIN) — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: Server System Variable Reference — https://dev.mysql.com/doc/refman/8.0/en/server-system-variable-reference.html
- MySQL 8.0 Reference Manual: innodb_log_files_in_group (deprecated in 8.0.30) — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_log_files_in_group

## Issues Found

1. **SET GLOBAL use case description was incorrect (comparison table):** The original text described SET GLOBAL as a "Temporary change for current session." This is wrong — `SET GLOBAL` changes the global server variable value affecting all new sessions, not just the current one. The change persists until the server is restarted. Changed to "Runtime change, lost on server restart."

2. **Sample output for persisted_variables showed invalid shorthand value:** The `performance_schema.persisted_variables` table stores variable values as numeric strings, not human-readable suffixes. The original showed `innodb_buffer_pool_size = 4G`, but the actual table would show `4294967296`. Fixed the sample output to use the numeric value.

3. **Incomplete privilege documentation for SET PERSIST_ONLY on read-only variables:** The original stated only `SYSTEM_VARIABLES_ADMIN` (or `SUPER`) is required. For `SET PERSIST_ONLY` on non-dynamic (read-only) variables, MySQL additionally requires the `PERSIST_RO_VARIABLES_ADMIN` privilege. Added this requirement since the post explicitly covers the read-only variable use case with `SET PERSIST_ONLY`.

## Review Notes
- The `innodb_log_files_in_group` variable used in the "Persisting Read-Only Variables" example was deprecated in MySQL 8.0.30 and removed in MySQL 8.2.0 (replaced by `innodb_redo_log_capacity`). The example is still valid for MySQL 8.0 versions prior to 8.0.30, but readers on newer versions should use a different variable. This was not changed in the post since it remains a valid illustrative example for much of the MySQL 8.0 lifecycle.
- The `SUPER` privilege is deprecated as of MySQL 8.0 in favor of more granular privileges like `SYSTEM_VARIABLES_ADMIN`. Added a note that `SUPER` is deprecated.
- The `mysqld-auto.cnf` example shows `"Version": 1`; later MySQL 8.0 versions (8.0.14+) use format version 2. This is a minor illustrative detail and was not changed.
- The precedence order (compiled-in defaults -> my.cnf -> mysqld-auto.cnf -> command-line options) is accurately documented and matches official MySQL documentation.
