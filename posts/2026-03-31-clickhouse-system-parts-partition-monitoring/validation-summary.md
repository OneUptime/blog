# Validation Summary: How to Use system.parts for Partition Monitoring in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- `system.parts` system table
- `system.merges` system table (mentioned)
- ClickHouse SQL functions: `formatReadableSize()`, `toStartOfHour()`, `round()`, `count()`, `sum()`, `max()`

## Sources Consulted
- ClickHouse official documentation for `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation for MergeTree settings (`parts_to_delay_insert`, `parts_to_throw_insert`): https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse official documentation for `system.merges`: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse official documentation for `formatReadableSize()`: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize

## Issues Found
- **Inaccurate insert throttling threshold description**: The post originally stated "When `active_parts` exceeds ~300 in a partition, ClickHouse may throttle inserts." This conflated two distinct mechanisms. At ~300 parts (the `parts_to_throw_insert` default), ClickHouse **rejects** inserts entirely, not just throttles them. Throttling/delay begins earlier at the `parts_to_delay_insert` threshold (default 150). Updated the text to accurately describe both thresholds and their behaviors.

## Review Notes
- All 11 column names referenced from `system.parts` (`partition`, `name`, `rows`, `bytes_on_disk`, `data_compressed_bytes`, `data_uncompressed_bytes`, `marks`, `modification_time`, `database`, `table`, `active`) are confirmed correct per official documentation.
- The `active` column is `UInt8`, so `active = 1` / `active = 0` is idiomatic and correct.
- All SQL queries are syntactically valid ClickHouse SQL.
- The `parts_to_delay_insert` and `parts_to_throw_insert` defaults (150 and 300 respectively) are historical defaults that may vary in newer ClickHouse versions (post-23.6). The post does not specify a ClickHouse version, so this is acceptable.
- The compression ratio calculation `sum(data_compressed_bytes) / sum(data_uncompressed_bytes)` is correct and will return a value between 0 and 1 (lower is better compression). No division-by-zero guard is included, but this is acceptable for a monitoring query where uncompressed bytes should always be > 0 for active parts with rows.
