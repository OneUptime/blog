# Validation Summary: How to Monitor Replication Lag in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (SHOW REPLICA STATUS, Performance Schema)
- Percona Toolkit (pt-heartbeat)
- Prometheus with mysqld_exporter
- Bash scripting

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS - https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html
- MySQL 8.0 Reference Manual: replication_applier_status_by_worker Table - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- Percona Toolkit Documentation: pt-heartbeat - https://docs.percona.com/percona-toolkit/pt-heartbeat.html
- Prometheus mysqld_exporter GitHub repository - https://github.com/prometheus/mysqld_exporter

## Issues Found
No technical issues found.

## Review Notes
- The post consistently uses modern MySQL 8.0.22+ terminology (REPLICA/SOURCE instead of SLAVE/MASTER), which is good practice. The only exception is the mysqld_exporter metric name `mysql_slave_status_seconds_behind_master`, which correctly reflects the actual metric name the exporter uses (it retains the old terminology for backwards compatibility).
- The Performance Schema method (Method 2) comparing `LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP` against `NOW()` assumes clock synchronization between primary and replica via NTP. This is standard practice but worth noting as a prerequisite.
- The heartbeat table approach (Method 3) similarly depends on synchronized clocks between primary and replica for accurate results.
- pt-heartbeat requires either `--create-table` on first run or a pre-existing heartbeat table. The post omits this initial setup detail, but this is a minor operational consideration rather than a technical error.
