# Validation Summary: How to Track MySQL Aborted Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (status variables, performance_schema, server configuration)
- Bash scripting (monitoring script)
- Prometheus (alerting rules)
- mysqld_exporter (Prometheus MySQL metrics)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Status Variables (`Aborted_connects`, `Aborted_clients`): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — `performance_schema.global_status`: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — `performance_schema.host_cache`: https://dev.mysql.com/doc/refman/8.0/en/host-cache-table.html
- MySQL 8.0 Reference Manual — `FLUSH HOSTS` deprecation (8.0.23): https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual — `wait_timeout` and `interactive_timeout` system variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- Prometheus mysqld_exporter metric names: https://github.com/prometheus/mysqld_exporter

## Issues Found
1. **Inaccurate description of `Aborted_connects`**: The intro described it as "connections that failed before authentication," but `Aborted_connects` counts all failed connection attempts *including* authentication failures (e.g., wrong password). Changed to "failed connection attempts, including authentication failures."

2. **Misleading `wait_timeout` phrasing**: The sentence "When `wait_timeout` is low (e.g., 28800 seconds default)" implied that 28800 seconds (8 hours) is a "low" value, which is incorrect. Reworded to clearly state the default and explain that the issue occurs when pool idle timeout exceeds the configured `wait_timeout`.

3. **Deprecated `FLUSH HOSTS` command**: `FLUSH HOSTS` was deprecated in MySQL 8.0.23. Replaced with the modern equivalent `TRUNCATE TABLE performance_schema.host_cache` and added a comment noting the deprecation.

## Review Notes
- All SQL syntax verified correct against MySQL 8.0 reference.
- The `performance_schema.host_cache` table and `SUM_CONNECT_ERRORS` column are correct.
- The bash monitoring script uses proper `-se` flags and arithmetic correctly.
- The Prometheus alert uses the correct `mysql_global_status_aborted_connects` metric name from mysqld_exporter.
- The `[mysqld]` config snippet format is correct for my.cnf / my.ini files.
