# Validation Summary: How to Use system.part_log in ClickHouse

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (system tables, MergeTree engine)
- SQL (ClickHouse dialect)
- ClickHouse server configuration (config.xml)

## Sources Consulted
- ClickHouse official documentation for system.part_log: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse source code default config: `programs/server/config.xml` in the ClickHouse/ClickHouse repository
- ClickHouse documentation for arrayStringConcat: https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions

## Issues Found

1. **Missing event_type enum values**: The `event_type` column description listed `NewPart, MergeParts, DownloadPart, RemovePart, MutatePart, MovePart` but was missing two values: `MergePartsStart` and `MutatePartStart`. These represent the start events for merge and mutation operations respectively. Fixed by adding both values to the enum listing in the Key Columns table.

2. **Incorrect ORDER BY on formatted string in "Merge Throughput by Table" query**: The query used `ORDER BY merged_bytes DESC` where `merged_bytes` was the output of `formatReadableSize()`, which returns a human-readable string (e.g., "1.50 GiB"). Sorting by this string produces alphabetical ordering, not numeric. Fixed by introducing a raw numeric column `merged_bytes_raw` for sorting and applying `formatReadableSize` separately for display.

## Review Notes
- The config.xml example shown is valid but does not match the full default configuration. The default config also includes `<partition_by>`, `<max_size_rows>`, `<reserved_size_rows>`, `<buffer_size_rows_flush_threshold>`, and `<flush_on_crash>`. The `<ttl>` field shown in the blog is not in the default config but is a valid configuration option. Since the blog frames this as "To verify or configure it" rather than "this is the default," this is acceptable.
- The claim "Part logging is enabled by default" is slightly misleading. Technically, it requires explicit configuration, but the default `config.xml` that ships with ClickHouse includes the `<part_log>` block uncommented, so in practice it is enabled out of the box for standard installations.
- The Key Columns table omits many columns that exist in the real table (e.g., `query_id`, `merge_reason`, `merge_algorithm`, `disk_name`, `path_on_disk`, `bytes_uncompressed`, `read_rows`, `read_bytes`, `peak_memory_usage`, `ProfileEvents`). This is acceptable for a focused guide but worth noting for completeness.
- All SQL syntax, function names (`arrayStringConcat`, `formatReadableSize`, `toStartOfMinute`, `countIf`, `sumIf`), and column references are correct ClickHouse SQL.
