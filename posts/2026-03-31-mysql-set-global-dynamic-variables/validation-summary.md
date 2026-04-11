# Validation Summary: How to Set Server Variables Dynamically with SET GLOBAL in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- SET GLOBAL statement
- performance_schema
- MySQL server variable administration

## Sources Consulted
- MySQL 8.0 Reference Manual: SET Syntax for Variable Assignment — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: performance_schema.variables_info Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-variables-info-table.html
- MySQL 8.0 Reference Manual: performance_schema.global_variables Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html
- MySQL 8.0 Reference Manual: Server System Variables (innodb_buffer_pool_size, innodb_data_home_dir) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: SET PERSIST and SET PERSIST_ONLY — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: Privileges (SYSTEM_VARIABLES_ADMIN) — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html

## Issues Found

1. **Incorrect multi-variable SET GLOBAL syntax**: The post showed `SET GLOBAL` once followed by comma-separated variables without repeating the `GLOBAL` keyword. In MySQL's SET syntax, each variable in a comma-separated list needs its own scope modifier. Without it, subsequent variables default to SESSION scope. Fixed by adding `GLOBAL` before each variable.

2. **Deprecated `information_schema.GLOBAL_VARIABLES` table**: The post used `information_schema.GLOBAL_VARIABLES` to verify variable values. This table was removed in MySQL 8.0 (it was deprecated in 5.7.6). Replaced with `performance_schema.global_variables`, which is the correct table for MySQL 8.0+.

3. **Non-existent columns in `variables_info` query**: The query referenced `VARIABLE_SCOPE` and `VARIABLE_TYPE` columns in `performance_schema.variables_info`, but these columns do not exist. The actual columns are `VARIABLE_NAME`, `VARIABLE_SOURCE`, `VARIABLE_PATH`, `MIN_VALUE`, `MAX_VALUE`, `SET_TIME`, `SET_USER`, `SET_HOST`. Fixed the query to use correct columns (`VARIABLE_NAME`, `VARIABLE_SOURCE`, `SET_TIME`, `SET_USER`).

4. **Contradictory `innodb_buffer_pool_size` example**: The post claimed `SET GLOBAL innodb_buffer_pool_size` would fail, then immediately noted it is allowed in MySQL 8.0. In fact, `innodb_buffer_pool_size` has been dynamically settable since MySQL 5.7.5, making it a poor example of a non-dynamic variable. Replaced with `innodb_data_home_dir`, which is genuinely a read-only (non-dynamic) variable, along with the actual error message MySQL returns.

5. **Wrong `VARIABLE_SOURCE` filter in audit query**: The audit query filtered on `VARIABLE_SOURCE = 'GLOBAL'`, but in `performance_schema.variables_info`, the value `'GLOBAL'` means "set from the global option file at startup." Variables changed at runtime via SET GLOBAL or SET PERSIST have `VARIABLE_SOURCE = 'DYNAMIC'`. Fixed the filter value.

## Review Notes
- The post correctly notes that `SET PERSIST` (MySQL 8.0+) is the preferred way to make runtime changes permanent. This is good advice.
- The `SYSTEM_VARIABLES_ADMIN` privilege information is accurate for MySQL 8.0+.
- The session vs global scope explanation is accurate and well-presented.
- The post could mention that `SET PERSIST_ONLY` exists for changing persisted values without changing the runtime value, but this is not an error, just a potential enhancement.
