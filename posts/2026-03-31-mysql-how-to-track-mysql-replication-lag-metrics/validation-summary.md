# Validation Summary: How to Track MySQL Replication Lag Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+ replication (SHOW REPLICA STATUS, Seconds_Behind_Source)
- MySQL performance_schema (replication_applier_status_by_worker)
- Heartbeat tables for lag measurement
- Percona Toolkit pt-heartbeat
- Prometheus mysqld_exporter
- Prometheus alerting rules (PromQL)
- MySQL parallel replication configuration

## Sources Consulted
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual — replication_applier_status_by_worker table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual — Replication and Binary Logging Options (replica_parallel_workers, replica_parallel_type, binlog_transaction_dependency_tracking): https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- Percona Toolkit pt-heartbeat documentation: https://docs.percona.com/percona-toolkit/pt-heartbeat.html
- Prometheus mysqld_exporter GitHub repository: https://github.com/prometheus/mysqld_exporter

## Issues Found
1. **Incorrect column name in performance_schema query**: The query referenced `APPLYING_TRANSACTION_LAST_RETRY_ERR_MSG`, which does not exist in the `replication_applier_status_by_worker` table. The correct column name is `APPLYING_TRANSACTION_LAST_TRANSIENT_ERROR_MESSAGE`. Fixed in the post.

## Review Notes
- The `Seconds_Behind_Source` NULL description says it means "the replica SQL thread is not running." Per the MySQL docs, NULL can also occur when the I/O thread is not running or the replica is not connected to the source. This is a simplification but not incorrect for a blog context.
- The performance_schema lag query uses `NOW()` to compare against `LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP`. On idle systems with no recent writes, this will show growing lag even though the replica is fully caught up. This is a known trade-off and the approach is still commonly used.
- `replica_parallel_type` was deprecated in MySQL 8.0.29 (with LOGICAL_CLOCK becoming the default) and removed in MySQL 8.4.0. `binlog_transaction_dependency_tracking` was deprecated in MySQL 8.0.35 and removed in MySQL 8.4.0. The configuration example remains correct for MySQL 8.0.x but may need updating for MySQL 8.4+.
- All pt-heartbeat flags, mysqld_exporter usage, and Prometheus alerting rule syntax are correct.
