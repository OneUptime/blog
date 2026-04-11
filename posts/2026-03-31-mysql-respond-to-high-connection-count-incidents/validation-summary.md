# Validation Summary: How to Respond to MySQL High Connection Count Incidents

## Status
validated

## Post Type
Runbook / Incident Response Guide

## Technologies Covered
- MySQL (server administration, connection management)
- SQL (diagnostic queries, information_schema / performance_schema)
- Node.js (`mysql` / `mysql2` npm package connection pooling)
- Bash (CLI monitoring script)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables (`max_connections`, `wait_timeout`, `interactive_timeout`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Server Status Variables (`Threads_connected`, `Max_used_connections`, `Connection_errors_max_connections`): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — `SHOW PROCESSLIST` and `information_schema.PROCESSLIST`: https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual — Performance Schema status/variables tables (replacement for removed `information_schema.GLOBAL_STATUS` / `GLOBAL_VARIABLES`): https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — Migrating from `information_schema` to `performance_schema` for status and system variables: https://dev.mysql.com/doc/refman/8.0/en/migrating-to-performance-schema.html
- npm `mysql` package documentation (pool options: `connectionLimit`, `waitForConnections`, `queueLimit`, `acquireTimeout`): https://github.com/mysqljs/mysql#pool-options

## Issues Found
1. **Monitoring query used removed `information_schema` tables.** The query in the "Monitoring and Alerting" section referenced `information_schema.GLOBAL_STATUS` and `information_schema.GLOBAL_VARIABLES`. These tables were deprecated in MySQL 5.7.6 and removed entirely in MySQL 8.0. Changed to `performance_schema.global_status` and `performance_schema.global_variables`, which are the correct replacements for MySQL 8.0+.

## Review Notes
- The `VARIABLE_VALUE` column in `performance_schema.global_status` and `performance_schema.global_variables` is a VARCHAR type. The arithmetic in the monitoring query relies on MySQL's implicit string-to-number conversion, which works correctly for numeric status values but could be made more explicit with `CAST()` if desired.
- The `SHOW PROCESSLIST` command and `information_schema.PROCESSLIST` table used elsewhere in the post remain valid in MySQL 8.0, though `performance_schema.processlist` is now preferred for better performance on busy servers.
- The Node.js pool example uses options from the `mysql` (mysqljs) package. The `mysql2` package supports the same pool options, so the example works for both.
