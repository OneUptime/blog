# Validation Summary: How to Use min_bytes_for_wide_part Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- `min_bytes_for_wide_part` MergeTree setting
- `min_rows_for_wide_part` companion setting
- Compact vs Wide part format in MergeTree
- `system.parts` and `system.merge_tree_settings` system tables

## Sources Consulted
- ClickHouse official documentation on MergeTree settings: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#min_bytes_for_wide_part
- ClickHouse official documentation on system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation on system.merge_tree_settings: https://clickhouse.com/docs/en/operations/system-tables/merge_tree_settings
- ClickHouse source code (`MergeTreeDataWriter.cpp`) for Wide/Compact format decision logic

## Issues Found
1. **Incorrect claim about "compressed" byte size**: The opening paragraph described `min_bytes_for_wide_part` as controlling "the minimum compressed byte size" for the compact-to-wide transition. The official ClickHouse documentation describes it simply as "Minimum number of bytes in a data part that can be stored in Wide format" without specifying compressed or uncompressed. In the ClickHouse source code, the comparison at write time is performed against the uncompressed in-memory block size (`block.bytes()`), not the compressed on-disk size. Removed the word "compressed" to align with official documentation and actual behavior.

## Review Notes
- All SQL syntax (CREATE TABLE with SETTINGS, ALTER TABLE MODIFY SETTING, ALTER TABLE RESET SETTING, SELECT from system tables) is correct and current.
- The default value of 10,485,760 bytes (10 MiB) is accurate.
- The OR logic between `min_bytes_for_wide_part` and `min_rows_for_wide_part` is correctly described — a part uses Wide format if it exceeds either threshold.
- The description of compact format (single combined file) and wide format (one file per column) is accurate.
- The claim that existing parts retain their format until merged after an ALTER is correct.
- The `system.parts` query correctly uses the `part_type` column and `formatReadableSize()` function.
- The practical guidance about lowering the threshold for wide tables (many columns) and raising it for narrow/high-frequency-insert tables is sound advice.
