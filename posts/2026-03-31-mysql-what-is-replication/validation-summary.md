# Validation Summary: What Is MySQL Replication

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL replication (binary log, relay log, replication threads)
- MySQL binary logging formats (STATEMENT, ROW, MIXED)
- MySQL performance_schema replication tables
- MySQL Router
- Group Replication, InnoDB Cluster, NDB Cluster (mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication - https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOG STATUS - https://dev.mysql.com/doc/refman/8.0/en/show-binary-log-status.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO - https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS - https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: performance_schema replication_applier_status_by_worker table - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: Replication Privilege Checking - https://dev.mysql.com/doc/refman/8.0/en/replication-howto-repuser.html

## Issues Found
1. **`SHOW MASTER STATUS` used instead of `SHOW BINARY LOG STATUS`**: The post consistently uses MySQL 8.0.22+ syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`) but used the deprecated `SHOW MASTER STATUS` command. This was deprecated in MySQL 8.0.22 and removed in MySQL 8.4.0. Changed to `SHOW BINARY LOG STATUS` for consistency.

2. **Invalid column `COUNT_TRANSACTIONS_BEHIND_SOURCE` in performance_schema query**: The column `COUNT_TRANSACTIONS_BEHIND_SOURCE` does not exist in the `performance_schema.replication_applier_status_by_worker` table. Replaced with `LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP` and `APPLYING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP`, which are actual columns in that table and provide accurate replication lag information via timestamp comparison.

## Review Notes
- The `binlog_format` system variable was deprecated in MySQL 8.0.34 and removed in MySQL 8.4.0 (which defaults to ROW-only). The post's discussion of STATEMENT/ROW/MIXED formats is accurate for MySQL 8.0.x but readers using MySQL 8.4+ should be aware that only ROW format is supported.
- The `FLUSH PRIVILEGES` after `CREATE USER`/`GRANT` is not strictly necessary (these statements automatically reload the grant tables), but it is not incorrect and is a common practice.
- The `REPLICATION SLAVE` privilege name is still the correct privilege name even in MySQL 8.0.22+ (it was not renamed to `REPLICATION REPLICA`).
