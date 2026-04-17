# Validation Summary: How to Use enable_mixed_granularity_parts in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Adaptive index granularity
- Fixed index granularity (legacy)
- SQL DDL (CREATE TABLE, ALTER TABLE, OPTIMIZE)
- ClickHouse server XML configuration
- `system.parts` system table

## Sources Consulted
- ClickHouse MergeTree settings documentation (https://clickhouse.com/docs/en/operations/settings/merge-tree-settings)
- ClickHouse MergeTree engine documentation (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse `system.parts` reference (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse source `src/Storages/MergeTree/MergeTreeSettings.cpp` (default value definitions)
- ClickHouse changelog for 19.11 (introduction of adaptive index granularity)

## Issues Found
- **Claim about default version**: The table row stated "`1` (default since ~21.x)". The default `enable_mixed_granularity_parts = true` was set much earlier than 21.x — it has been the default since shortly after adaptive granularity was introduced in 19.11. Replaced with "default in modern ClickHouse" to avoid the inaccurate version pin while preserving the author's intent.

## Review Notes
- The `rows / marks` heuristic used to classify granularity type is approximate — adaptive-granularity parts can also produce exactly 8192 rows per mark when rows are small enough that the byte cap is never reached. The post explicitly calls this out as "approximate", which is acceptable.
- The `ORDER BY min_time DESC` in the sample query is only meaningful when the partition key includes a DateTime column. For the bare `ENGINE = MergeTree() ORDER BY (ts, user_id)` example with no PARTITION BY, `min_time` may be populated based on the primary key time column but readers should be aware it relies on a time-typed partition/sorting key to be useful. Left as-is since it is not strictly incorrect.
- Descriptive claim that "narrow rows produce larger granules" is loose phrasing — in adaptive mode, narrow rows produce granules with *more rows* (up to `index_granularity` as the cap), not necessarily larger in bytes. The intent is clear in context, so no change needed.
- `enable_mixed_granularity_parts` is modifiable via `ALTER TABLE ... MODIFY SETTING`, as is `index_granularity_bytes`. `index_granularity` itself (not shown being altered in the post) is NOT modifiable after table creation — worth noting for readers extending these examples.
- Server-level `<merge_tree>` XML configuration block is valid and matches standard ClickHouse config conventions.
