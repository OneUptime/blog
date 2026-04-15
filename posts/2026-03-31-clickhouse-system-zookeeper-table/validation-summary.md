# Validation Summary: How to Use system.zookeeper Table in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- ClickHouse system.zookeeper table
- ZooKeeper / ClickHouse Keeper
- Replicated MergeTree replication metadata
- Distributed DDL

## Sources Consulted
- ClickHouse official docs: system.zookeeper table — https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse official docs: ReplicatedMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse official docs: distributed_ddl server config — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#distributed_ddl
- ClickHouse source code (StorageReplicatedMergeTree.cpp) for ZooKeeper node structure verification

## Issues Found
1. **Section title "Checking Block Numbers (Quorum)" was misleading.** The `/quorum` ZooKeeper node is used for insert quorum tracking (ensuring writes are confirmed on multiple replicas before acknowledging), not for "block numbers" (which live under `/block_numbers`). Changed the section title to "Checking Insert Quorum Status" and updated the corresponding summary sentence to say "check insert quorum status" instead of "check quorum metadata".

## Review Notes
- The post states that `system.zookeeper` "requires a `WHERE path = '...'` clause". Per official docs, `WHERE path IN (...)` is also supported. This is a minor omission but not technically wrong since `path =` is the most common usage pattern.
- All 8 column names mentioned in the post (`name`, `path`, `value`, `dataLength`, `numChildren`, `pzxid`, `ctime`, `mtime`) are confirmed real columns. The table actually has 15 columns total; the post correctly uses "Columns include:" to signal this is not exhaustive.
- The ZooKeeper path structure `/clickhouse/tables/{shard}/{database}/{table}` used in examples matches the documented default.
- The DDL task queue path `/clickhouse/task_queue/ddl` is confirmed correct per server configuration docs.
- All referenced sub-nodes (`/log`, `/replicas`, `/leader_election`, `/quorum`) are confirmed to exist under replicated table paths in the ClickHouse source code.
- All SQL queries are syntactically correct and would execute as expected when connected to a ZooKeeper/Keeper instance.
