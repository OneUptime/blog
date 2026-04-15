# Validation Summary: How to Configure ClickHouse Max Part Size for Merges

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse MergeTree merge settings (`max_bytes_to_merge_at_max_space_in_pool`, `max_bytes_to_merge_at_min_space_in_pool`)
- ClickHouse wide vs compact part format (`min_bytes_for_wide_part`, `min_rows_for_wide_part`)
- ClickHouse `system.parts` system table

## Sources Consulted
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse source code (MergeTreeSettings.cpp): https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeSettings.cpp

## Issues Found
1. **Incorrect "uncompressed" qualifier on setting description**: The post originally stated that `max_bytes_to_merge_at_max_space_in_pool` controls the "maximum uncompressed size" of a merged part, and that the default is "about 150 GB uncompressed." The official ClickHouse documentation describes it as "the maximum total parts size (in bytes)" without specifying compressed or uncompressed. The merge selector internally uses `getBytesOnDisk()` (on-disk/compressed bytes) when evaluating parts for merging. Removed the "uncompressed" qualifier in both locations to match the official documentation and avoid misleading readers.

## Review Notes
- The default value of 150 GiB (150 * 1024^3 = 161,061,273,600 bytes) was confirmed from ClickHouse source code. The blog's approximation of "about 150 GB" is acceptable.
- The `max_bytes_to_merge_at_min_space_in_pool` default of 1 MB (1,048,576 bytes) was confirmed from source code.
- The `min_rows_for_wide_part` default in ClickHouse is 0 (not 512000). The blog uses 512000 as an example value in an ALTER TABLE statement, which is fine since it is not claiming that as the default.
- All SQL syntax, XML configuration format, system table columns, and ClickHouse functions used in the post are correct and current.
- The advice to keep parts in the 5-50 GB range for event tables is a reasonable practical guideline, though optimal values depend on specific workloads.
