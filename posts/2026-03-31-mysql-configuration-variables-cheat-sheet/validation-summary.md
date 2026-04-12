# Validation Summary: MySQL Configuration Variables Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL 5.7 / 8.0
- InnoDB storage engine
- MySQL Performance Schema
- MySQL replication (GTID-based)
- MySQL binary logging

## Sources Consulted
- MySQL 8.0 Reference Manual: performance_schema.variables_info table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-variables-info-table.html
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Replication Options — https://dev.mysql.com/doc/refman/8.0/en/replication-options.html
- MySQL 8.0 Reference Manual: Query Cache Removal — https://dev.mysql.com/doc/refman/8.0/en/query-cache.html

## Issues Found

1. **Incorrect column names in `performance_schema.variables_info` query**: The query used `variable_scope` and `is_dynamic` as column names, but these columns do not exist in the `variables_info` table. The actual columns are `VARIABLE_NAME`, `VARIABLE_SOURCE`, `VARIABLE_PATH`, `MIN_VALUE`, `MAX_VALUE`, `SET_TIME`, `SET_USER`, `SET_HOST`. Fixed the query to select `variable_name, variable_source, variable_path` and updated the comment from "Check if a variable is dynamic" to "Check where a variable's current value was set from" to accurately describe what the query returns.

2. **Ambiguous phrasing in Summary section**: The sentence "Always change global variables with SHOW VARIABLES to confirm the change took effect" reads as though `SHOW VARIABLES` is used to change variables, when in fact `SHOW VARIABLES` is read-only. Changed to "After changing global variables, use SHOW VARIABLES to confirm the change took effect" for clarity.

## Review Notes
- `innodb_log_file_size` is deprecated in MySQL 8.0.30+ in favor of `innodb_redo_log_capacity`. The post doesn't specify a MySQL version and the variable still functions, so this is acceptable but worth noting for a future update.
- `binlog_format` is deprecated in MySQL 8.0.34+ since ROW is the default and only recommended format. Again, still valid but worth noting.
- The recommended collation `utf8mb4_unicode_ci` is valid but MySQL 8.0 defaults to `utf8mb4_0900_ai_ci`, which provides better Unicode 9.0 support. This is a preference rather than an error.
- All other SQL syntax, variable names, recommended values, and technical descriptions are accurate.
