# Validation Summary: Common ClickHouse Partitioning Mistakes and How to Fix Them

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- ClickHouse
- MergeTree table engine
- SQL (ClickHouse dialect)
- Partitioning / TTL / DDL

## Sources Consulted
- ClickHouse Date/Time Functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse ALTER PARTITION docs: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse MergeTree engine & TTL docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse `system.parts` system table: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse Custom Partitioning Key: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
1. **Non-existent function `toYYYYMMDDHH`** (Mistake 1). ClickHouse provides `toYYYYMM`, `toYYYYMMDD`, and `toYYYYMMDDhhmmss`, but there is no `toYYYYMMDDHH`. Replaced with `toStartOfHour(event_time)`, which is the idiomatic way to bucket by hour in ClickHouse.
2. **Parts vs. partitions confusion in `system.parts` query** (Mistake 1). `count()` grouped by `table` on `system.parts` returns the number of active *parts*, not *partitions*. A partition can contain many parts before they merge. Changed to `uniqExact(partition) AS partition_count` and added a `count() AS part_count` column so both are visible.
3. **Incorrect `DROP PARTITION` syntax with quoted string** (Mistake 5). With `PARTITION BY toYYYYMM(event_time)` the partition expression is numeric (`UInt32`). A quoted literal without the `ID` keyword is the wrong form — correct options per the docs are `DROP PARTITION 202401` (partition expression) or `DROP PARTITION ID '202401'` (partition ID). Changed to `DROP PARTITION ID '202401'` to match the string value shown by the preceding `SELECT partition FROM system.parts` query.

## Review Notes
- The guidance to prefer monthly partitioning and to separate the role of the partition key (lifecycle) from the sorting key (query acceleration) aligns with ClickHouse's official recommendations.
- The TTL example `TTL event_time + INTERVAL 90 DAY DELETE` is valid. `DELETE` is the default action and may be omitted, but explicit is fine.
- Partition pruning via `WHERE toYYYYMM(event_time) IN (...)` works; modern ClickHouse can also prune via direct `event_time` range predicates using the partition minmax index.
- ClickHouse community guidance often recommends keeping the total number of active parts per table below ~10,000 (and commonly well under 1,000) — worth mentioning if the post is expanded later.
