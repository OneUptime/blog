# Validation Summary: How to Monitor MySQL Server Uptime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.6+ / 8.0+)
- MySQL performance_schema
- mysqladmin CLI tool
- Bash scripting
- Prometheus mysqld_exporter
- Grafana

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Status Variables (Uptime, Uptime_since_flush_status): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — performance_schema.global_status table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — SHOW STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-status.html
- MySQL 8.0 Reference Manual — mysqladmin: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MySQL 8.0 Reference Manual — Mathematical Functions (MOD operator): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html
- MySQL 8.0 Reference Manual — Date and Time Functions (DATE_SUB, NOW): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — FLUSH STATUS: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- Prometheus mysqld_exporter documentation: https://github.com/prometheus/mysqld_exporter

## Issues Found
No technical issues found.

## Review Notes
- The post uses `performance_schema.global_status`, which is the correct modern approach for MySQL 5.7.6+ and 8.0+. The older `information_schema.global_status` was removed in MySQL 8.0.3+. The post does not specify a version requirement, but this is a minor omission since the performance_schema approach is the current standard.
- `VARIABLE_VALUE` in `performance_schema.global_status` is typed as `VARCHAR(1024)`. The arithmetic operations in the queries rely on MySQL's implicit type conversion, which works correctly but is worth noting.
- The availability calculation assumes a fixed 300 seconds of downtime per restart, which is clearly labeled as an estimate. This is a reasonable simplification for a tutorial.
- The monitoring script passes the password via `-p"$MYSQL_PASS"` on the command line, which may produce a MySQL warning about insecure password usage. This is acceptable for a simple example script but worth noting for production use.
