# Validation Summary: How to Set Up MySQL Delayed Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.23+ (uses `CHANGE REPLICATION SOURCE TO` syntax)
- MySQL Delayed Replication (`SOURCE_DELAY`)
- MySQL GTID-based replication
- MySQL Performance Schema replication tables
- mysqlbinlog utility
- mysqldump utility

## Sources Consulted
- MySQL 8.0 Reference Manual: Delayed Replication — https://dev.mysql.com/doc/refman/8.0/en/replication-delayed.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: START REPLICA — https://dev.mysql.com/doc/refman/8.0/en/start-replica.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html
- MySQL 8.0 Reference Manual: replication_applier_status — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-table.html
- MySQL 8.0 Reference Manual: replication_applier_configuration — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-configuration-table.html

## Issues Found

1. **Mermaid diagram used deprecated `MASTER_DELAY` label** (line 28): The sequence diagram referenced `MASTER_DELAY` while the rest of the post consistently uses the MySQL 8.0.23+ `SOURCE_DELAY` syntax. Changed to `SOURCE_DELAY` for consistency.

2. **Performance Schema query used incorrect column names** (lines 123-129): The query selected `SQL_DELAY` and `SQL_REMAINING_DELAY` from `performance_schema.replication_applier_status`, but those columns do not exist in that table. The correct columns are `DESIRED_DELAY` (in `replication_applier_configuration`) and `REMAINING_DELAY` (in `replication_applier_status`). Fixed by joining the two tables and using the correct column names.

## Review Notes
- The post uses MySQL 8.0.23+ syntax throughout (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`). Users on older MySQL versions would need to use the legacy `CHANGE MASTER TO` / `MASTER_DELAY` syntax.
- The limitations section states "The delay is per-event, not per-transaction time." This is technically correct in mechanism (the SQL thread checks each event's timestamp against the delay), but in practice events within the same transaction share the same timestamp, so the delay is effectively per-transaction. The wording is a reasonable simplification but could be more precise.
- The `SHOW REPLICA STATUS` output comment shows `Replica_SQL_Running_State: Waiting until SOURCE_DELAY seconds after source executed event`, which is the MySQL 8.0.26+ wording. Earlier 8.0 versions show `Waiting until MASTER_DELAY seconds after master executed event`.
