# Validation Summary: How to Use system.zookeeper in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system.zookeeper virtual table)
- ZooKeeper / ClickHouse Keeper
- ReplicatedMergeTree engine
- ClickHouse system tables (system.replicas, system.replication_queue)

## Sources Consulted
- ClickHouse official documentation for system.zookeeper: https://clickhouse.com/docs/operations/system-tables/zookeeper
- ClickHouse official documentation for system.replicas: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse official documentation for system.replication_queue: https://clickhouse.com/docs/operations/system-tables/replication_queue
- ClickHouse source code (StorageSystemZooKeeper.cpp) for column definitions
- ClickHouse source code (StorageReplicatedMergeTree.cpp) for ZooKeeper path structure and deduplication mechanism

## Issues Found
1. **Invalid column `children` in first SQL query**: The query `SELECT name, path, value, children FROM system.zookeeper` used a non-existent column `children`. The `system.zookeeper` table has no `children` column — the correct column for child count is `numChildren` (Int32). Fixed by replacing `children` with `numChildren`.
2. **Missing `pzxid` column from Key Columns table**: The column `pzxid` (Int64), which records the transaction ID of the last child modification, was omitted from the Key Columns reference table. Added it to the table.

## Review Notes
- The `zookeeperName` (String) column was also omitted from the Key Columns table. This column identifies which ZooKeeper instance is being queried in multi-ZooKeeper configurations. It was not added since the blog does not discuss multi-ZooKeeper setups and its omission does not affect correctness for the typical single-ZooKeeper use case.
- The ZooKeeper path structure diagram lists 5 subnodes (log, replicas, blocks, mutations, quorum) but omits others like metadata, columns, block_numbers, leader_election, temp, and deduplication_hashes. This is acceptable for a focused tutorial but readers should know the actual tree has more nodes.
- All SQL queries are syntactically correct and use valid ClickHouse SQL.
- The `WHERE path = ...` requirement is correctly documented — ClickHouse does require a path filter on this table.
- The block deduplication explanation is accurate.
- The comparison table between system.zookeeper, system.replicas, and system.replication_queue is correct.
