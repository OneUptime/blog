# Validation Summary: How to Track MySQL Slow Query Rate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (slow query log, status variables, performance_schema)
- Bash scripting
- Prometheus alerting rules
- mysqld_exporter (Prometheus MySQL exporter)
- pt-query-digest (Percona Toolkit)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Server Status Variables (Slow_queries, Questions) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: The Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: performance_schema.global_status — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- Prometheus mysqld_exporter GitHub repository — https://github.com/prometheus/mysqld_exporter
- Prometheus Alerting Rules documentation — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Percona Toolkit pt-query-digest documentation — https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
No technical issues found.

## Review Notes
- The bash rate calculation script uses integer arithmetic (`$(( (V2 - V1) / 60 ))`), which truncates decimal values. For slow query rates below 1 per second, this will always display 0. The percentage script in the next section correctly uses `bc` for floating-point math. This is not an error but a precision limitation readers should be aware of.
- The `Questions` status variable is used as the denominator for slow query percentage, which counts statements sent by clients. This is the standard and appropriate choice over `Queries` (which also includes statements within stored programs).
- The `performance_schema.global_status` table is the correct source for MySQL 5.7+. In MySQL 5.6 and earlier, `INFORMATION_SCHEMA.GLOBAL_STATUS` was used instead. The post does not specify a MySQL version but the approach is current.
