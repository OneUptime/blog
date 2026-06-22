# Validation Summary: How to Implement Data Tiering in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree storage policies
- ClickHouse TTL rules
- ClickHouse S3 disks
- ClickHouse system tables

## Sources Consulted
- ClickHouse Docs: External disks for storing data - https://clickhouse.com/docs/operations/storing-data
- ClickHouse Docs: Manage data with TTL - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse Docs: Manipulating Partitions and Parts - https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse Docs: system.storage_policies - https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse Docs: system.parts - https://clickhouse.com/docs/operations/system-tables/parts

## Issues Found
- The manual data movement example used `ALTER TABLE ... MOVE PARTITION ID 'all' WHERE timestamp < '2024-01-01' TO VOLUME 'cold';`. ClickHouse's `MOVE PARTITION|PART` syntax only supports moving a specific partition or part to a disk or volume; it does not support a `WHERE` clause. I replaced it with a second valid monthly partition move.
- The first monthly partition move used `MOVE PARTITION '202401'` for a table partitioned by `toYYYYMM(timestamp)`. I changed it to `MOVE PARTITION 202401`, matching the numeric value produced by that partition expression.

## Review Notes
The storage policy, S3 disk configuration, `TTL ... TO VOLUME`, `TTL ... DELETE`, `system.parts`, and `system.storage_policies` examples align with the current ClickHouse documentation. The hot/warm/cold TTL workflow is documented as not applicable to ClickHouse Cloud; this post does not mention ClickHouse Cloud, so no content change was required.
