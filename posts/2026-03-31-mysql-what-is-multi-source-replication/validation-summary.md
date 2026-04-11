# Validation Summary: What Is Multi-Source Replication in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 5.7+ (multi-source replication introduction)
- MySQL 8.0+ (modern `CHANGE REPLICATION SOURCE TO` syntax, per-channel replication filters)
- MySQL Performance Schema (replication monitoring tables)
- GTID-based replication

## Sources Consulted
- MySQL 8.0 Reference Manual: Multi-Source Replication (https://dev.mysql.com/doc/refman/8.0/en/replication-multi-source.html)
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO Statement (https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html)
- MySQL 8.0 Reference Manual: performance_schema.replication_applier_status (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-table.html)
- MySQL 8.0 Reference Manual: performance_schema.replication_applier_status_by_coordinator (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-coordinator-table.html)
- MySQL 8.0 Reference Manual: CHANGE REPLICATION FILTER Statement (https://dev.mysql.com/doc/refman/8.0/en/change-replication-filter.html)

## Issues Found
1. **Incorrect Performance Schema table name in monitoring query**: The post queried `LAST_ERROR_MESSAGE` from `performance_schema.replication_applier_status`, but this table only has four columns: `CHANNEL_NAME`, `SERVICE_STATE`, `REMAINING_DELAY`, and `COUNT_TRANSACTIONS_RETRIES`. The `LAST_ERROR_MESSAGE` column exists in `performance_schema.replication_applier_status_by_coordinator`. Fixed by changing the table name to `replication_applier_status_by_coordinator`.

## Review Notes
- The post uses MySQL 8.0.23+ syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`). These replaced the older `CHANGE MASTER TO` / `START SLAVE` / `SHOW SLAVE STATUS` syntax. This is correct and current.
- The claim "Mixing GTID and non-GTID channels is not supported" is a reasonable simplification. In MySQL 8.0.23+, the `ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS` option can work around this limitation, but mixing remains non-trivial and generally not recommended.
- The `auto_increment_increment`/`auto_increment_offset` example is presented in the context of the replica, but these settings would typically be configured on the source servers. The post's context is clear enough for a reference guide.
