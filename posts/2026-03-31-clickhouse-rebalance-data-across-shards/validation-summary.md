# Validation Summary: How to Rebalance Data Across ClickHouse Shards

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (distributed cluster operations, sharding, partitioning)
- clickhouse-copier utility
- Distributed table engine
- ClickHouse system tables (system.parts)
- ZooKeeper (used by clickhouse-copier for task coordination)

## Sources Consulted
- ClickHouse documentation on Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on clickhouse-copier: https://clickhouse.com/docs/en/operations/utilities/clickhouse-copier
- ClickHouse documentation on ALTER TABLE DROP PARTITION: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse documentation on remote() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/remote
- ClickHouse documentation on clusterAllReplicas(): https://clickhouse.com/docs/en/sql-reference/table-functions/cluster

## Issues Found

1. **DROP PARTITION with ON CLUSTER would delete data from all shards including destination** (Strategy 1):
   - **What was wrong:** The command `ALTER TABLE events_local ON CLUSTER my_cluster DROP PARTITION '202401'` used `ON CLUSTER`, which would execute the DROP PARTITION on every shard in the cluster. After redistributing data through the Distributed table, the newly copied data on other shards would also be deleted, defeating the purpose of the rebalance.
   - **What was changed:** Removed `ON CLUSTER my_cluster` from the command and added clarifying text that this should be run directly on the source node only.
   - **Why:** The DROP should only target the source shard where the data was originally over-concentrated, not all shards.

2. **Monitoring query used non-existent column `event_time` from system.parts** (Monitor Rebalancing Progress):
   - **What was wrong:** The query used `toYYYYMM(min(event_time))` and `toYYYYMM(max(event_time))`, but `event_time` is not a column in the `system.parts` table. The table has `partition` (the partition ID/key value), `min_date`/`max_date`, and `min_time`/`max_time`.
   - **What was changed:** Replaced `toYYYYMM(min(event_time))` with `min(partition)` and `toYYYYMM(max(event_time))` with `max(partition)`, which directly returns partition identifiers and is the idiomatic way to check partition ranges in system.parts.
   - **Why:** The original query would fail with "Unknown identifier: event_time" since that column does not exist in system.parts.

## Review Notes
- The `clickhouse-copier` tool is functional but considered a legacy utility. ClickHouse documentation notes that newer alternatives or custom INSERT-SELECT workflows may be preferred for some use cases. The post's coverage is still valid.
- The post correctly notes that ClickHouse does not auto-rebalance — this is an important and accurate operational detail.
- Strategy 1 (INSERT SELECT) could lead to duplicate data if not handled carefully. The post mentions verifying before deleting, which is good practice, but users should be aware that there is no built-in deduplication unless using ReplacingMergeTree or similar engines.
