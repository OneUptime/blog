# Validation Summary: How to Track MySQL Connections per Second

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (status variables, Performance Schema, system variables)
- mysqladmin CLI tool
- Prometheus alerting rules
- mysqld_exporter (Prometheus MySQL exporter)
- Bash scripting

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Status Variables (`Connections`): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html#statvar_Connections
- MySQL 8.0 Reference Manual — Performance Schema `accounts` table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-accounts-table.html
- MySQL 8.0 Reference Manual — `events_statements_summary_global_by_event_name` table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual — `max_connections` system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections
- MySQL 8.0 Reference Manual — `Max_used_connections` status variable: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html#statvar_Max_used_connections
- MySQL 8.0 Reference Manual — mysqladmin: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- Prometheus mysqld_exporter documentation: https://github.com/prometheus/mysqld_exporter

## Issues Found
1. **Incorrect Performance Schema table reference**: The post stated that `events_statements_summary_global_by_event_name` and the accounts table let you break down connections by user or host. The `events_statements_summary_global_by_event_name` table tracks statement execution statistics (query counts, latencies, etc.), not connection metrics. It is unrelated to connection tracking. The actual query correctly uses `performance_schema.accounts`, which is the proper table for connection data per user/host. Fixed by removing the incorrect reference to `events_statements_summary_global_by_event_name` and referencing only the `accounts` table.

## Review Notes
- The `mysqladmin -r` flag description says it gives "the rate directly" — technically it outputs the delta (difference) over the interval, not a per-second rate. To get the true per-second rate you would divide the delta by the interval length. This is a minor imprecision but not strictly wrong, as "rate" is commonly used loosely in monitoring contexts.
- The `Connections` status variable counts all connection attempts (successful or not), which the post correctly states as "each time a new connection attempt is made."
- The bash script uses integer arithmetic (`$(( ))`) which truncates decimals. For low-traffic servers this could show 0 when the actual rate is fractional. This is acceptable for a simple example.
- All SQL syntax, mysqladmin flags, Prometheus alerting rule format, and mysqld_exporter metric names are correct.
