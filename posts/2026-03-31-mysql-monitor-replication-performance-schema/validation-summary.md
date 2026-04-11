# Validation Summary: How to Monitor Replication with Performance Schema in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Performance Schema
- MySQL Replication (async and group replication)
- Multi-Threaded Replication (MTS)
- InnoDB Cluster / Group Replication

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html
- MySQL 8.0 Reference Manual: `replication_applier_status` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-table.html
- MySQL 8.0 Reference Manual: `replication_applier_status_by_worker` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: `replication_connection_status` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-connection-status-table.html
- MySQL 8.0 Reference Manual: `replication_group_members` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html
- MySQL 8.0 Reference Manual: `replication_group_member_stats` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-member-stats-table.html

## Issues Found
- **Incorrect columns in `replication_applier_status` query**: The "Monitoring Applier Lag" section queried `LAST_APPLIED_TRANSACTION`, `LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP`, and `APPLYING_TRANSACTION` from `performance_schema.replication_applier_status`. These columns do not exist on that table — they belong to `replication_applier_status_by_worker`. The `replication_applier_status` table only has 4 columns: `CHANNEL_NAME`, `SERVICE_STATE`, `REMAINING_DELAY`, and `COUNT_TRANSACTIONS_RETRIES`. Fixed the query to use the correct columns for this table.

## Review Notes
- The lag calculation using `TIMESTAMPDIFF(SECOND, LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP, NOW())` is a common and valid approach, though it measures time since the transaction was originally committed on the source rather than true network + apply delay. This is an acceptable simplification for a monitoring guide.
- All other table names, column names, and SQL syntax verified correct against MySQL 8.0 documentation.
- The list of key replication tables is accurate. Additional tables added in MySQL 8.0.22+ (e.g., `replication_asynchronous_connection_failover`) are not listed, which is fine for a general overview.
