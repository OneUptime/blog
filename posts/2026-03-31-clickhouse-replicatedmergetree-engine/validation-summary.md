# Validation Summary: How to Use ReplicatedMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplicatedMergeTree engine
- ClickHouse Keeper / ZooKeeper
- ClickHouse replication and high availability

## Sources Consulted
- ClickHouse official documentation: ReplicatedMergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication)
- ClickHouse official documentation: system.replicas table (https://clickhouse.com/docs/en/operations/system-tables/replicas)
- ClickHouse official documentation: SYSTEM statements (https://clickhouse.com/docs/en/sql-reference/statements/system)
- ClickHouse official documentation: Data replication settings (https://clickhouse.com/docs/en/operations/settings/merge-tree-settings)

## Issues Found

1. **Incorrect use of `SYSTEM RESTORE REPLICA` (lines 104-109)**: The post recommended `SYSTEM RESTORE REPLICA events ON CLUSTER my_cluster` for resyncing severely lagged replicas. This command is for restoring ClickHouse Keeper/ZooKeeper metadata when it has been lost or corrupted, not for catching up lagged replicas. Replaced with `SYSTEM SYNC REPLICA events`, which blocks until the replica finishes processing its replication queue.

2. **Wrong column name `last_exception` in `system.replicas` query (line 98)**: The `system.replicas` table does not have a column called `last_exception`. The correct column name is `last_queue_update_exception`. Fixed the query accordingly.

3. **Misleading deduplication comment (line 117)**: The comment "Set deduplication window (default 100 blocks)" was placed above `SET insert_deduplicate = 1`, which is a boolean toggle for enabling/disabling deduplication, not for setting the window size. The actual window size is controlled by the `replicated_deduplication_window` table-level setting. Clarified the comments to distinguish between the toggle and the window setting.

## Review Notes
- The ZooKeeper configuration snippet, macros configuration, table creation syntax, and replication monitoring queries are all correct and follow recommended ClickHouse conventions.
- The post correctly recommends ClickHouse Keeper over ZooKeeper for modern deployments.
- The use of `{shard}` and `{replica}` macros in the ZooKeeper path follows best practices for portable cluster configurations.
- The `system.replication_queue` query for monitoring is correct.
