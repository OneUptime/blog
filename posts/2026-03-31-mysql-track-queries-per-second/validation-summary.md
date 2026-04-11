# Validation Summary: How to Track MySQL Queries per Second

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (global status variables, Performance Schema)
- mysqladmin CLI tool
- Bash scripting
- Prometheus mysqld_exporter
- PromQL

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (`Questions`, `Queries`, `Com_xxx`) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: `performance_schema.global_status` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: mysqladmin client — https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- Prometheus mysqld_exporter documentation — https://github.com/prometheus/mysqld_exporter
- Prometheus alerting rules documentation — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- **Inaccurate description of `Questions` variable**: The post stated "`Questions` counts all queries including prepared statement executions." Per MySQL documentation, `Questions` counts only statements sent by clients to the server and excludes statements executed within stored programs (which are counted by the separate `Queries` variable). Changed to: "`Questions` counts statements sent by clients to the server, including prepared statement executions, but excludes statements executed within stored programs."

## Review Notes
- The shell script uses bash integer arithmetic (`$(( ))`) which truncates decimal values. This is acceptable for a simple sampling script but readers should be aware that fractional QPS values will be rounded down to zero.
- The post correctly uses `performance_schema.global_status` rather than the deprecated `INFORMATION_SCHEMA.GLOBAL_STATUS` (removed in MySQL 8.0).
- The Prometheus alert rule and PromQL syntax are valid. The threshold of 5000 QPS is presented as an example, which is appropriate since baselines vary by workload.
