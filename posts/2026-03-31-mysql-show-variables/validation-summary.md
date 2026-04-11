# Validation Summary: How to Use SHOW VARIABLES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW VARIABLES, SET GLOBAL/SESSION, SET PERSIST)
- MySQL performance_schema
- MySQL system variable management

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW VARIABLES Statement (https://dev.mysql.com/doc/refman/8.0/en/show-variables.html)
- MySQL 8.0 Reference Manual: Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: SET PERSIST Syntax (https://dev.mysql.com/doc/refman/8.0/en/set-variable.html)
- MySQL 8.0 Reference Manual: performance_schema System Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html)
- MySQL 8.0 Reference Manual: RESET PERSIST Statement (https://dev.mysql.com/doc/refman/8.0/en/reset-persist.html)

## Issues Found
1. **Section heading incorrectly referenced information_schema instead of performance_schema**: The heading "Reading Variables from information_schema" was incorrect — the SQL query underneath correctly used `performance_schema.global_variables`. In MySQL 8.0, system variable tables were moved from `information_schema` to `performance_schema` (the `information_schema` versions were deprecated in MySQL 5.7.6 and removed in 8.0). Fixed the heading to read "Reading Variables from performance_schema".

## Review Notes
- The post correctly notes that query cache variables were removed in MySQL 8.0.
- `innodb_log_file_size` (mentioned in the performance tuning section) was deprecated in MySQL 8.0.30 in favor of `innodb_redo_log_capacity`. The variable still functions in MySQL 8.0.x, so this is not an error, but readers targeting MySQL 8.0.30+ should be aware.
- `binlog_format` was deprecated in MySQL 8.0.34 and removed in MySQL 8.4. It remains valid for MySQL 8.0.x versions prior to 8.4.
- All SQL syntax, variable names, SET PERSIST/RESET PERSIST usage, and scope explanations are accurate per the MySQL 8.0 documentation.
