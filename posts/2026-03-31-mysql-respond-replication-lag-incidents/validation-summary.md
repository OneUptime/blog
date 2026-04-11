# Validation Summary: How to Respond to MySQL Replication Lag Incidents

## Status
validated

## Post Type
Tutorial / Incident Response Guide

## Technologies Covered
- MySQL 8.0.22+ replication (uses modern `REPLICA` terminology)
- MySQL Performance Schema (`performance_schema.replication_applier_status_by_worker`)
- MySQL parallel replication (`replica_parallel_workers`, `replica_parallel_type`)
- mysqldump for table-level re-sync
- Bash (`watch` command for monitoring)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: Replication Applier Status by Worker table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: sql_replica_skip_counter — https://dev.mysql.com/doc/refman/8.0/en/set-global-sql-slave-skip-counter.html
- MySQL 8.0 Reference Manual: replica_parallel_workers — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html#sysvar_replica_parallel_workers
- MySQL 8.0 Reference Manual: replica_parallel_type — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html#sysvar_replica_parallel_type
- MySQL 8.0 Reference Manual: CHECKSUM TABLE — https://dev.mysql.com/doc/refman/8.0/en/checksum-table.html

## Issues Found
1. **Incorrect column in Post-Incident Prevention query**: The query referenced `VARIABLE_VALUE` as a column in `performance_schema.replication_applier_status_by_worker`, but this column does not exist in that table. The table contains timestamp columns for transaction tracking, not `VARIABLE_VALUE`. Fixed by replacing the query with a correct approach that uses `TIMESTAMPDIFF(SECOND, APPLYING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP, NOW())` to compute replication lag from the available timestamp columns.

## Review Notes
- The post uses `SHOW MASTER STATUS` in Step 1, which is the correct command for MySQL 8.0.x but was deprecated in MySQL 8.2.0 in favor of `SHOW BINARY LOG STATUS`. Since the rest of the post uses the newer `REPLICA` terminology (introduced in 8.0.22), this is technically consistent for the 8.0.22–8.1.x range but may need updating for MySQL 8.2+.
- `SET GLOBAL SQL_REPLICA_SKIP_COUNTER` was introduced in MySQL 8.0.26 as an alias. The post assumes MySQL 8.0.26+ throughout, which is consistent.
- The `replica_parallel_type` system variable was removed in MySQL 8.3.0 (where `LOGICAL_CLOCK` became the only mode and `replica_parallel_workers` defaults to 4). If targeting MySQL 8.3+, Step 3 would need updating to omit the `replica_parallel_type` setting.
- The mysqldump re-sync example in Step 2 does not mention stopping replication before loading data, which is recommended to avoid conflicts. This is a best-practice omission rather than a correctness error.
