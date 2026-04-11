# Validation Summary: How to Persist Server Variables Across Restarts in MySQL 8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- SET PERSIST / SET PERSIST_ONLY
- mysqld-auto.cnf
- performance_schema.persisted_variables
- MySQL privilege system (SYSTEM_VARIABLES_ADMIN, PERSIST_RO_VARIABLES_ADMIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: SET PERSIST syntax — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: persisted_variables table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-persisted-variables-table.html
- MySQL 8.0 Reference Manual: Server System Variable Privileges — https://dev.mysql.com/doc/refman/8.0/en/system-variable-privileges.html
- MySQL 8.0 Reference Manual: RESET PERSIST — https://dev.mysql.com/doc/refman/8.0/en/reset-persist.html
- MySQL 8.0 Reference Manual: mysqld-auto.cnf — https://dev.mysql.com/doc/refman/8.0/en/persisted-system-variables.html

## Issues Found
1. **Incorrect column name in persisted_variables output**: The example output for `SELECT * FROM performance_schema.persisted_variables` showed the column name as `SET_VALUE`. The correct column name is `VARIABLE_VALUE`. Fixed the table header and column alignment accordingly.

## Review Notes
- The `innodb_log_file_size` variable used as the `SET PERSIST_ONLY` example is deprecated as of MySQL 8.0.30 in favor of `innodb_redo_log_capacity`. The example still works since the variable exists (as deprecated), but future readers on MySQL 8.0.30+ should be aware of this deprecation.
- The "Required Privileges" section grants both `SYSTEM_VARIABLES_ADMIN` and `PERSIST_RO_VARIABLES_ADMIN`. Strictly speaking, `PERSIST_RO_VARIABLES_ADMIN` is only needed for `SET PERSIST_ONLY` on read-only variables, not for basic `SET PERSIST`. The GRANT statement itself is fine for a DBA role that needs full persist functionality, but the comment could be more precise about when each privilege is required.
- The `mysqld-auto.cnf` JSON example shows `"Version": 1`. The version number may differ depending on the exact MySQL 8.0.x release (later versions use `"Version": 2`). This is a minor cosmetic detail in an illustrative example.
