# Validation Summary: How to Create and Manage Projections in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse
- ClickHouse MergeTree engine
- ClickHouse Projections (Normal/Reorder and Aggregate)
- ClickHouse system tables (`system.projections`, `system.projection_parts`, `system.mutations`)

## Sources Consulted
- [ClickHouse ALTER PROJECTION docs](https://clickhouse.com/docs/en/sql-reference/statements/alter/projection)
- [ClickHouse Projections data modeling docs](https://clickhouse.com/docs/data-modeling/projections)
- [ClickHouse system.projections system table docs](https://clickhouse.com/docs/en/operations/system-tables/projections)
- [ClickHouse system.projection_parts system table docs](https://clickhouse.com/docs/en/operations/system-tables/projection_parts)
- [Altinity KB: ClickHouse Projections examples](https://kb.altinity.com/altinity-kb-queries-and-syntax/projections-examples/)
- [ClickHouse source: StorageSystemProjectionParts.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/System/StorageSystemProjectionParts.cpp)

## Issues Found
No technical issues found.

All SQL constructs verified against official ClickHouse documentation:
- `ALTER TABLE ... ADD PROJECTION name ( SELECT ... [GROUP BY] [ORDER BY] )` syntax matches the documented form.
- `ALTER TABLE ... MATERIALIZE PROJECTION name` is the correct command for materializing existing data.
- `ALTER TABLE ... DROP PROJECTION name` is the correct removal command, and the post correctly notes that ClickHouse has no in-place ALTER PROJECTION (drop-and-recreate is the documented approach).
- Inline `PROJECTION name (...)` definition inside `CREATE TABLE` is valid and matches official examples.
- `system.projections` exposes `name`, `query`, `type` columns alongside `database`, `table`, `sorting_key`, and `settings`.
- `system.projection_parts` exposes `bytes_on_disk` and is queryable per-projection in the documented manner (matches the Altinity KB query pattern).
- `system.mutations` tracks `MATERIALIZE PROJECTION` operations and exposes `parts_to_do`, `is_done`, and `command`.
- Functions and types used (`toStartOfHour`, `count`, `avg`, `sum`, `formatReadableSize`, `LowCardinality(String)`, `DateTime`, `UInt16`, `Float64`) are standard ClickHouse.

## Review Notes
- The claim that projections are "transparent to the query planner" and "automatically selected when they improve query performance" is accurate, though in practice the optimizer's decision depends on the `optimize_use_projections` setting (default on) and the projection actually matching the query shape.
- The aggregate projection example omits an explicit `ORDER BY` in the projection definition; this is allowed (ClickHouse will derive a sort order from the GROUP BY keys), so the example is valid.
- For per-projection storage queries, filtering `system.projection_parts` by `active = 1` (as in the Altinity KB example) would avoid double-counting inactive parts during merges; the post's query is functionally correct but could be tightened in a future revision.
- ClickHouse versions older than 22.x may not expose `system.projections`; the post implicitly targets a reasonably modern release, which is appropriate for current readers.
