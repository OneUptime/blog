# Validation Summary: How to Configure MergeTree Settings for Optimal Performance

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (DDL and system table queries)

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER TABLE MODIFY SETTING documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/setting
- ClickHouse system.merge_tree_settings documentation: https://clickhouse.com/docs/en/operations/system-tables/merge_tree_settings
- ClickHouse compression codecs documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec

## Issues Found

1. **`index_granularity` shown as modifiable via ALTER TABLE (line 33):** The post included `ALTER TABLE events MODIFY SETTING index_granularity = 4096;` as an example of changing settings on an existing table. `index_granularity` is immutable after table creation because it defines the physical granule structure written to disk. Existing data parts are already indexed with the original granularity. Fixed by removing the `index_granularity` ALTER example and adding a note that some settings are immutable after creation.

2. **`compression_codec` shown as a table-level SETTINGS parameter (lines 101-107):** The post used `SETTINGS compression_codec = 'ZSTD(3)'` as if compression is a MergeTree table setting. In ClickHouse, compression is specified per-column using the `CODEC(...)` clause in the column definition, not as a table-level setting. Fixed by replacing with correct per-column CODEC syntax.

3. **`max_parts_in_total` behavior described as "throttled" (line 82):** The post stated inserts are "throttled" when `max_parts_in_total` is exceeded. In reality, inserts are rejected outright with a "Too many parts" error. Throttling (delayed inserts) is the behavior of `parts_to_delay_insert`. Fixed the description to say inserts are "rejected."

## Review Notes
- The `parts_to_delay_insert` and `parts_to_throw_insert` example values (150 and 300) match the old defaults prior to ClickHouse v23.6. Since v23.6, the defaults were changed to 1000 and 3000 respectively. The post does not explicitly claim these are the defaults, so the examples are valid as custom values, but readers on modern ClickHouse versions should be aware the defaults are now higher.
- The `min_bytes_for_wide_part` default of 10485760 (10 MB) is correct for self-hosted ClickHouse. ClickHouse Cloud uses a different default (1 GB).
- The `system.merge_tree_settings` query with `WHERE changed = 1` shows globally changed settings, not per-table overrides. The post correctly also shows the `system.tables` query for per-table settings via `engine_full`.
