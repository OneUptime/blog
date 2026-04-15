# Validation Summary: How to Monitor ClickHouse Part Count Per Table

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (ClickHouse dialect)
- system.parts, system.part_log, system.merges system tables
- ClickHouse server configuration (XML)

## Sources Consulted
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.part_log documentation: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse system.merges documentation: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse formatReadableSize function: https://clickhouse.com/docs/sql-reference/functions/other-functions

## Issues Found
- **Incorrect "Too many parts" threshold description**: The post stated that ClickHouse throws a "Too many parts" error when a partition has more than 300 active parts, configurable via `max_parts_in_total`. This was wrong in two ways: (1) the per-partition insert rejection threshold is controlled by `parts_to_throw_insert`, not `max_parts_in_total` (which controls the total number of parts across all partitions in a table); (2) since ClickHouse 23.6, the default for `parts_to_throw_insert` is 3000, not 300 (the old pre-23.6 default). Fixed the description to correctly reference `parts_to_delay_insert` (default 1000), `parts_to_throw_insert` (default 3000), and `max_parts_in_total` (default 100000) with their actual roles and defaults.

## Review Notes
- The ALTER TABLE example uses `parts_to_delay_insert = 150` and `parts_to_throw_insert = 300`, which are valid custom values (more aggressive than current defaults of 1000 and 3000). These are reasonable choices for tables where you want earlier warnings, so they were left as-is since the example is showing how to customize settings, not claiming these are defaults.
- All SQL queries use valid ClickHouse syntax including `countIf()`, `formatReadableSize()`, `dateDiff()`, `toStartOfHour()`, and `count()`.
- All referenced system table columns (`database`, `table`, `active`, `rows`, `bytes_on_disk`, `modification_time`, `partition`, `event_time`, `event_type`, `result_part_name`, `elapsed`, `progress`, `total_size_bytes_compressed`) are verified to exist.
- The `system.part_log` event types `NewPart`, `MergeParts`, and `RemovePart` are all valid values.
- Server config parameters `background_pool_size` and `background_merges_mutations_concurrency_ratio` are valid.
