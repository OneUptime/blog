# Validation Summary: How to Scale MySQL with Read Replicas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (binary log replication, read replicas)
- MySQL Performance Schema (replication monitoring)
- MySQL semi-synchronous replication
- Python (`mysql-connector-python` library)
- ProxySQL / MySQL Router (mentioned, not demonstrated)

## Sources Consulted
- MySQL 8.0 Reference Manual: Setting Up Binary Log File Position Based Replication — https://dev.mysql.com/doc/refman/8.0/en/replication-howto.html
- MySQL 8.0 Reference Manual: `replication_applier_status` Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-table.html
- MySQL 8.0 Reference Manual: `replication_applier_status_by_coordinator` Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-coordinator-table.html
- MySQL 8.0 Reference Manual: `replication_applier_status_by_worker` Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: Installing Semisynchronous Replication — https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-installation.html
- MySQL 8.0 Reference Manual: `SHOW REPLICA STATUS` — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html

## Issues Found

1. **Incorrect Performance Schema query (lines 114-116)**: The query referenced `LAST_ERROR_MESSAGE` and `COUNT_TRANSACTIONS_BEHIND` columns on `performance_schema.replication_applier_status`. Neither column exists in that table. `replication_applier_status` only has `CHANNEL_NAME`, `SERVICE_STATE`, `REMAINING_DELAY`, and `COUNT_TRANSACTIONS_RETRIES`. `COUNT_TRANSACTIONS_BEHIND` does not exist in any MySQL Performance Schema table. Fixed by changing the table to `replication_applier_status_by_coordinator` (which contains `CHANNEL_NAME`, `SERVICE_STATE`, `LAST_ERROR_NUMBER`, and `LAST_ERROR_MESSAGE`) and correcting the column list.

2. **Terminology error in Summary (line 136)**: The summary referred to "write-after-read consistency" when the correct term (and the term used in the section heading above) is "read-after-write consistency". Fixed the wording.

## Review Notes
- `SHOW MASTER STATUS` (line 39) is deprecated as of MySQL 8.0.26. The replacement command `SHOW BINARY LOG STATUS` was introduced in MySQL 8.2.0. Since the rest of the post targets MySQL 8.0.23+ syntax (where `SHOW BINARY LOG STATUS` does not yet exist), this is acceptable but worth noting for future updates.
- `FLUSH PRIVILEGES` (line 33) is unnecessary after `CREATE USER` / `GRANT` in MySQL 8.0+ since the grant tables are reloaded automatically. It is not harmful, but it is superfluous.
- The semi-sync plugin syntax (`rpl_semi_sync_source` / `semisync_source.so`) is confirmed correct for MySQL 8.0.26+.
- The Python code using `mysql-connector-python` is syntactically correct and demonstrates the read/write splitting pattern accurately.
