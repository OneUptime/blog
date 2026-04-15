# Validation Summary: How to Handle Replication Queue in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ZooKeeper (replication coordination)
- ClickHouse system tables (replication_queue, replicas, parts, mutations, disks)
- ClickHouse SYSTEM commands (RESTART REPLICA, STOP/START REPLICATION QUEUES, STOP/START FETCHES, STOP/START MERGES)

## Sources Consulted
- ClickHouse official docs: system.replication_queue — https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse official docs: system.replicas — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official docs: system.parts — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official docs: system.mutations — https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse official docs: system.disks — https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse official docs: SYSTEM statements — https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse official docs: KILL MUTATION — https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse official docs: MergeTree settings — https://clickhouse.com/docs/en/operations/settings/merge-tree-settings

## Issues Found

1. **Non-existent columns in system.replication_queue query**: `fetch_started_time` and `profile_counters` are not real columns in `system.replication_queue`. Replaced with `last_postpone_time`, which is a valid and useful column.

2. **Incorrect queue entry types**: `MOVE_PART` and `DROP_PART` are not documented replication queue entry types. Replaced with `REPLACE_RANGE` (drop a range of parts and replace with new ones) and `ALTER_METADATA` (apply alter modification to metadata and columns), which are actual documented types.

3. **Non-existent columns in system.replicas query**: `active_parts_count` and `total_parts_count` do not exist in `system.replicas`. Replaced with valid columns: `total_replicas`, `active_replicas`, `queue_size`, `inserts_in_queue`, and `merges_in_queue`, which provide useful replica status information.

4. **Incorrect config placement for background_pool_size**: `background_pool_size` was placed under `<merge_tree>` in the XML config, but it is a server-level parameter (and is obsolete in recent versions). Removed it from the config example to avoid confusion.

5. **Invalid session-level SET command**: `SET max_replicated_fetches_network_bandwidth = 52428800` is not valid as a session-level setting. This is a MergeTree table-level setting. Replaced with an `ALTER TABLE ... MODIFY SETTING` statement, which is the correct way to apply this setting per-table.

## Review Notes
- The `now() - create_time` expression in the monitoring query works correctly in ClickHouse since DateTime is stored internally as seconds since epoch, but using `dateDiff('second', create_time, now())` would be more explicit and self-documenting.
- The post omits some less-common but documented queue entry types: `CLEAR_COLUMN` and `CLEAR_INDEX` (both deprecated). These were intentionally left out of the fix since they are deprecated.
- The ZooKeeper CLI section for clearing corrupted queue entries is accurate but carries inherent risk. The post appropriately frames this as a rare/last-resort action.
- All SYSTEM commands (RESTART REPLICA, STOP/START REPLICATION QUEUES, STOP/START FETCHES, STOP/START MERGES) were verified as correct.
- All queries against system.parts, system.mutations, system.disks, and the KILL MUTATION syntax are correct.
