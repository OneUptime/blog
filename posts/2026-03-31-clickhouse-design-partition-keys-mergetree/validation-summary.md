# Validation Summary: How to Design Partition Keys for MergeTree Tables in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- SQL (ClickHouse dialect)
- Partition keys, ordering keys, TTL
- `system.parts` system table

## Sources Consulted
- ClickHouse official docs: MergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse official docs: Custom partitioning key (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key)
- ClickHouse official docs: ALTER TABLE ... PARTITION (https://clickhouse.com/docs/en/sql-reference/statements/alter/partition)
- ClickHouse official docs: Manipulating TTL (https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl)
- ClickHouse official docs: `system.parts` (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse official docs: Date functions `toYYYYMM`, `toDate`, `toYear`

## Issues Found
- **`MOVE PARTITION '2024-01'` was incorrect.** With `PARTITION BY toYYYYMM(event_time)`, the partition expression produces a `UInt32` value (e.g. `202401` for January 2024), which is also the partition ID. The string `'2024-01'` does not match either the partition value or the partition ID and would fail at runtime. I changed the example to `MOVE PARTITION 202401` and added a clarifying comment noting how the partition ID is derived from `toYYYYMM`.

## Review Notes
- The guideline "keep total active parts below 1000 per table" is a reasonable rule of thumb for operators. ClickHouse's actual hard thresholds are controlled by `parts_to_delay_insert` and `parts_to_throw_insert` (applied per partition, defaults have trended upward in recent versions), but the table-level heuristic in the post is a useful simplification and not incorrect.
- `PARTITION BY tenant_id` is fine for a small, bounded number of tenants but becomes dangerous at scale; the post does flag high-cardinality partitioning as an anti-pattern later, so the two sections remain consistent.
- The `system.parts` query, `toYYYYMM`/`toDate`/`toYear` usage, the TTL ALTER statement, the ordering-key vs partition-key contrast, and the 8192-row default granule are all accurate against current ClickHouse documentation.
