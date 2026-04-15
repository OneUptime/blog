# Validation Summary: How to Use DETACH and ATTACH Partitions in ClickHouse Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ZooKeeper / ClickHouse Keeper (replication coordination)
- Partition operations (DETACH, ATTACH, REPLACE, MOVE, DROP)
- Tiered storage (DISK/VOLUME)

## Sources Consulted
- ClickHouse official documentation — Manipulating Partitions and Parts: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse official documentation — system.detached_parts: https://clickhouse.com/docs/operations/system-tables/detached_parts
- ClickHouse official documentation — system.parts: https://clickhouse.com/docs/operations/system-tables/parts

## Issues Found

1. **Incorrect columns in `system.detached_parts` query (DETACH PARTITION section)**: The query used `partition`, `rows`, and `path` as columns. The `system.detached_parts` table uses `partition_id` (not `partition`) and does not have a `rows` column. Changed to `partition_id`, `bytes_on_disk`, `disk`, and `path`.

2. **Wrong ATTACH PARTITION replication behavior**: The post claimed that `ATTACH PARTITION` on one replica does NOT automatically replicate to other replicas. This is incorrect. Per ClickHouse docs, `ATTACH PARTITION` IS replicated — the initiator attaches from its local `detached` directory, and non-initiator replicas will either use matching parts from their own `detached` directory or download the data from a replica that has it. Fixed the description and simplified the restore workflow accordingly (no longer requires copying files to all replicas).

3. **Wrong MOVE PARTITION replication claim**: The post stated "MOVE PARTITION is replicated. All replicas move the partition to the equivalent disk or volume." This is incorrect — the ClickHouse docs explicitly state that MOVE is NOT replicated because different replicas can have different storage policies. Fixed to state that MOVE PARTITION must be run on each replica individually.

4. **Invalid `DROP PARTITION WHERE` syntax**: The post included `ALTER TABLE events DROP PARTITION WHERE toYear(event_date) = 2023;` which is not valid ClickHouse syntax. `DROP PARTITION` only accepts a partition expression/ID, not a WHERE clause. Removed this invalid example.

5. **Incomplete `ATTACH PARTITION FROM` requirements**: The comment stated tables need "the same structure and ORDER BY key." The actual requirements include same structure, same partition key, same primary key, and same ORDER BY key. Updated the comment to include partition key and primary key.

## Review Notes
- The detached part reason values (`broken`, `unexpected`, `noquorum`) are accurate.
- The `REPLACE PARTITION` atomicity claim is confirmed correct per official docs.
- The `DETACH PARTITION` replication behavior (replicated to all replicas via ZooKeeper) is confirmed correct.
- The `DROP DETACHED PART` syntax with `SETTINGS allow_drop_detached = 1` is correct.
