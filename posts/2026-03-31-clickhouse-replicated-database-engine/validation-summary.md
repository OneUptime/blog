# Validation Summary: How to Use Replicated Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Replicated database engine
- ClickHouse ReplicatedMergeTree table engine
- ZooKeeper / ClickHouse Keeper (coordination layer)
- ClickHouse DDL replication
- ClickHouse system tables (`system.zookeeper`, `system.tables`)

## Sources Consulted
- ClickHouse official documentation — Replicated database engine: https://clickhouse.com/docs/engines/database-engines/replicated
- ClickHouse official documentation — system.distributed_ddl_queue: https://clickhouse.com/docs/operations/system-tables/distributed_ddl_queue
- ClickHouse official documentation — Server configuration (distributed_ddl): https://clickhouse.com/docs/operations/server-configuration-parameters/settings

## Issues Found

### 1. Incorrect monitoring query using `system.distributed_ddl_queue`
**What was wrong:** The "Monitoring DDL Replication" section used `system.distributed_ddl_queue` to monitor Replicated database DDL propagation. This table only tracks `ON CLUSTER` DDL operations, not the Replicated database engine's own DDL log. Additionally, the query referenced two non-existent columns: `database` (no such column exists in the table) and `entry_time` (the correct time column is `query_create_time`).

**What was changed:** Replaced the query with two `system.zookeeper` queries that inspect the Replicated database engine's actual DDL log in ZooKeeper: one to list recent DDL log entries, and another to check each replica's log pointer position to verify sync status.

### 2. Incorrect `distributed_ddl` config for Replicated database engine
**What was wrong:** The "Handling Node Failures During DDL" section showed a `<distributed_ddl>` XML config block with `task_max_lifetime` and `cleanup_delay_period` settings. This config section controls the `ON CLUSTER` distributed DDL queue behavior, not the Replicated database engine's DDL retry mechanism. The Replicated database engine manages its own DDL log in ZooKeeper and automatically replays missed entries when a node reconnects — it does not use the `distributed_ddl` task queue.

**What was changed:** Removed the incorrect XML config block and replaced it with an accurate description of how the Replicated database engine handles node failures: it automatically replays missed DDL log entries from ZooKeeper when the node reconnects, requiring no manual intervention or special configuration.

## Review Notes
- The rest of the post is technically accurate: the `CREATE DATABASE ... ENGINE = Replicated(...)` syntax, the use of `{shard}` and `{replica}` macros, creating `ReplicatedMergeTree()` tables without explicit ZooKeeper paths inside a Replicated database, and DDL propagation behavior are all correct per official documentation.
- The post correctly notes that ZooKeeper paths can be omitted from `ReplicatedMergeTree()` when used inside a Replicated database — ClickHouse auto-assigns default paths using the pattern `/clickhouse/tables/{uuid}/{shard}`.
- The `system.zookeeper` virtual table used in the corrected monitoring queries requires that the ClickHouse server has access to the ZooKeeper/Keeper ensemble. In some restricted configurations, access to this table may be limited.
