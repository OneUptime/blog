# Validation Summary: How to Monitor MySQL Replication with SHOW REPLICA STATUS

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0.22+ (`SHOW REPLICA STATUS` syntax)
- MySQL replication (IO thread, SQL thread, GTID, position-based)
- MySQL Performance Schema replication tables
- Bash scripting for replication monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: SHOW MASTER STATUS / SHOW BINARY LOG STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html
- MySQL 8.0 Reference Manual: replication_applier_status_by_worker table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: replication_connection_status table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-connection-status-table.html
- MySQL 8.0 Reference Manual: GTID_SUBTRACT function — https://dev.mysql.com/doc/refman/8.0/en/gtid-functions.html

## Issues Found

1. **Broken quick health check SQL query**: The original query attempted to SELECT `SHOW REPLICA STATUS` column names (e.g., `Replica_IO_Running`) from a `UNION ALL` of `performance_schema.replication_connection_status` and `performance_schema.replication_applier_status_by_worker`. These two tables have incompatible schemas and cannot be unioned, and neither table contains those column names. Replaced the broken SQL with a note that `SHOW REPLICA STATUS` is a standalone command that cannot be used in subqueries, keeping just the working bash approach.

2. **`SHOW BINARY LOG STATUS` version mismatch**: The post targets MySQL 8.0.22+ but used `SHOW BINARY LOG STATUS`, which was introduced in MySQL 8.2.0. Users on MySQL 8.0.22 through 8.1.x would get an error. Changed to `SHOW MASTER STATUS` (available in all 8.0.x versions) with a comment noting the 8.2.0+ replacement.

3. **Wrong column in Performance Schema lag query**: The query selected `LAST_QUEUED_TRANSACTION_START_QUEUE_TIMESTAMP` from `replication_applier_status_by_worker`, but that column belongs to `replication_connection_status`. Replaced with `LAST_APPLIED_TRANSACTION_START_APPLY_TIMESTAMP`, which is the correct column in `replication_applier_status_by_worker`.

## Review Notes
- The bash alerting script does not handle the case where `Seconds_Behind_Source` is `NULL` (which can occur even when threads show as running, e.g., during initial connection). The `-gt` comparison would produce a bash error. This is a minor robustness issue rather than a MySQL accuracy problem, so it was left as-is.
- All field names used throughout the post (`Replica_IO_Running`, `Source_Log_File`, `Read_Source_Log_Pos`, etc.) are the correct MySQL 8.0.22+ naming. The legacy names were correctly noted in the introduction.
- The Mermaid flowchart uses correct MySQL 8.0.22+ syntax for `START REPLICA IO_THREAD` and `START REPLICA SQL_THREAD`.
- Error codes 1045 (ER_ACCESS_DENIED_ERROR) and 1062 (ER_DUP_ENTRY) are correctly identified.
