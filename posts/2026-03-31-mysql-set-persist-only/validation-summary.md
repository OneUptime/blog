# Validation Summary: How to Use SET PERSIST_ONLY in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SET PERSIST_ONLY statement
- performance_schema (persisted_variables, global_variables, variables_info tables)
- mysqld-auto.cnf configuration persistence

## Sources Consulted
- MySQL 8.0 Reference Manual: SET PERSIST_ONLY syntax and behavior (https://dev.mysql.com/doc/refman/8.0/en/set-variable.html)
- MySQL 8.0 Reference Manual: performance_schema.persisted_variables table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-persisted-variables-table.html)
- MySQL 8.0 Reference Manual: Server System Variables — innodb_log_file_size, innodb_log_files_in_group, log_bin, skip_log_bin (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: Privilege requirements for SET PERSIST_ONLY (https://dev.mysql.com/doc/refman/8.0/en/system-variable-privileges.html)
- MySQL 8.0 Reference Manual: RESET PERSIST syntax (https://dev.mysql.com/doc/refman/8.0/en/reset-persist.html)

## Issues Found

### 1. Incorrect column name in persisted_variables query
- **What was wrong:** The query used `SET_VALUE` as a column name for `performance_schema.persisted_variables`. This column does not exist.
- **What was changed:** Replaced `SET_VALUE` with `VARIABLE_VALUE`, which is the correct column name. Also updated the example output table to reflect the corrected column name and alignment.
- **Why:** The `persisted_variables` table has only two columns: `VARIABLE_NAME` and `VARIABLE_VALUE`.

### 2. Invalid use of `skip_log_bin` with SET PERSIST_ONLY
- **What was wrong:** The example `SET PERSIST_ONLY skip_log_bin = ON;` is invalid. `skip_log_bin` is not a system variable — it is a command-line-only server option (`--skip-log-bin`). The corresponding system variable `log_bin` is read-only and not persistable via SET PERSIST_ONLY.
- **What was changed:** Replaced the `skip_log_bin` example with `SET PERSIST_ONLY innodb_buffer_pool_instances = 8;`, which is a valid non-dynamic (read-only) system variable that requires a restart and can be persisted.
- **Why:** Using `SET PERSIST_ONLY skip_log_bin = ON` would produce an error at runtime since MySQL does not recognize `skip_log_bin` as a system variable.

## Review Notes
- `innodb_log_file_size` and `innodb_log_files_in_group` were deprecated in MySQL 8.0.30 in favor of the unified `innodb_redo_log_capacity` variable. The examples in the post still work for MySQL 8.0 versions prior to 8.0.30 and remain functional (with deprecation warnings) in later 8.0.x releases, but readers using MySQL 8.0.30+ should prefer `innodb_redo_log_capacity`.
- The privileges section states that `SET PERSIST_ONLY` requires both `SYSTEM_VARIABLES_ADMIN` and `PERSIST_RO_VARIABLES_ADMIN`. Strictly speaking, `PERSIST_RO_VARIABLES_ADMIN` is only required for read-only variables; for dynamic variables, `SYSTEM_VARIABLES_ADMIN` alone suffices. The post does clarify this in the line that follows, and the GRANT statement granting both is reasonable practice.
