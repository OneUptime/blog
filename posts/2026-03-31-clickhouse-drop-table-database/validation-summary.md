# Validation Summary: How to Use DROP TABLE and DROP DATABASE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL / DDL (DROP TABLE, DROP DATABASE, RENAME TABLE, EXISTS, TRUNCATE)
- ReplicatedMergeTree table engine
- ON CLUSTER DDL

## Sources Consulted
- ClickHouse DROP reference: https://clickhouse.com/docs/en/sql-reference/statements/drop
- ClickHouse ReplicatedMergeTree / Data Replication docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse EXISTS reference: https://clickhouse.com/docs/en/sql-reference/statements/exists
- ClickHouse TRUNCATE reference: https://clickhouse.com/docs/en/sql-reference/statements/truncate

## Issues Found
- **Incorrect claim about ReplicatedMergeTree DROP semantics.** The original text said: *"For ReplicatedMergeTree tables the drop is replicated automatically to all replicas once issued on one node, but ON CLUSTER ensures the Distributed table or shadow on every shard is removed as well."* This is wrong. Per the official replication docs: *"The `DROP TABLE` query deletes the replica located on the server where the query is run."* Other replicas are not automatically dropped; `ON CLUSTER` (or running DROP on each node) is required. I rewrote the paragraph to reflect the correct behavior: without `ON CLUSTER`, `DROP TABLE` on a ReplicatedMergeTree only removes the local replica; `ON CLUSTER` tears it down on every shard and replica.

## Review Notes
- The SYNC description is accurate for the default Atomic database engine, where drops are delayed by `database_atomic_delay_before_drop_table_sec` (default 480s). For the older Ordinary engine, drops are already synchronous, so SYNC is effectively a no-op there - not called out in the post, but this is a minor caveat rather than an error.
- The DROP/DROP DATABASE syntax, `IF EXISTS`, `ON CLUSTER`, and `SYNC` usage all match the official grammar: `DROP [TEMPORARY] TABLE [IF EXISTS] [IF EMPTY] [db.]name [ON CLUSTER cluster] [SYNC]` and `DROP DATABASE [IF EXISTS] db [ON CLUSTER cluster] [SYNC]`.
- The `EXISTS TABLE ...` usage and the `RENAME TABLE ... TO ...` syntax are correct.
- The practical example assumes the `analytics_old` database already exists before the rename; a pedagogical note could be added, but this is not a technical error.
- The DROP vs TRUNCATE table is accurate: DROP removes schema + data; TRUNCATE keeps schema, removes data.
