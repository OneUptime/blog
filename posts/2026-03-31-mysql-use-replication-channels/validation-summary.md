# Validation Summary: How to Use Replication Channels in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ replication channels
- Multi-source replication
- Performance Schema replication tables
- GTID-based replication

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema replication_applier_status_by_coordinator table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-coordinator-table.html
- MySQL 8.0 Reference Manual: Performance Schema replication_applier_status_by_worker table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: Replication Options (Replica) — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- MySQL 8.0 Reference Manual: Replication Channels — https://dev.mysql.com/doc/refman/8.0/en/replication-channels.html

## Issues Found

1. **Wrong column name in `replication_applier_status_by_coordinator` query**: The post used `last_applied_transaction` but the correct column in the coordinator table is `last_processed_transaction`. The coordinator dispatches transactions to workers — it does not apply them, so MySQL uses "processed" terminology for this table. Fixed to `last_processed_transaction`.

2. **Deprecated config options `master_info_repository = TABLE` and `relay_log_info_repository = TABLE`**: These options were deprecated in MySQL 8.0.23 and `TABLE` became the default. Since the post uses `CHANGE REPLICATION SOURCE TO` syntax (introduced in 8.0.23) and `START/STOP REPLICA` (introduced in 8.0.22), these deprecated options are unnecessary and would cause warnings or errors in newer MySQL versions (removed in MySQL 8.4). Removed both options from the config block.

3. **Incorrect comment on `SHOW REPLICA STATUS\G`**: The comment said "Show status of default (unnamed) channel" but `SHOW REPLICA STATUS` without a `FOR CHANNEL` clause shows status for ALL channels (one result row per channel), not just the default. Fixed the comment to "Show status of all channels".

4. **Unnecessary and potentially incorrect `CONVERT_TZ` in monitoring lag query**: The original query used `CONVERT_TZ(last_applied_transaction_end_apply_timestamp, '+00:00', @@global.time_zone)` then compared with `NOW()`. Since Performance Schema TIMESTAMP columns and `NOW()` both operate in the session timezone context, the `CONVERT_TZ` was unnecessary and could produce incorrect results if the session timezone differed from the global timezone. Simplified to a direct `TIMESTAMPDIFF` between the timestamp column and `NOW()`.

## Review Notes
- The post correctly uses modern MySQL 8.0.22+ syntax (`REPLICA` instead of `SLAVE`, `REPLICATION SOURCE` instead of `MASTER`), which is good for forward compatibility.
- The `CHANGE REPLICATION FILTER ... FOR CHANNEL` syntax for per-channel filters is correct and well-demonstrated.
- The overall structure and flow of the tutorial is sound and covers the key operations for multi-source replication channels.
