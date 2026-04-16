# Validation Summary: How to Use min_bytes_for_wide_part in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse MergeTree engine
- Compact vs Wide data part storage formats
- `min_bytes_for_wide_part` / `min_rows_for_wide_part` settings
- `system.parts` system table
- ClickHouse DDL (CREATE TABLE, SETTINGS, ENGINE clauses)
- ClickHouse configuration (config.xml, users.xml)

## Sources Consulted
- ClickHouse source code: `src/Storages/MergeTree/MergeTreeData.cpp` — `choosePartFormat` function (https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeData.cpp)
- ClickHouse source code: `src/Storages/MergeTree/MergeTreeSettings.cpp` — default values for `min_bytes_for_wide_part`, `min_rows_for_wide_part`, `min_level_for_wide_part`
- ClickHouse MergeTree settings documentation (https://clickhouse.com/docs/en/operations/settings/merge-tree-settings)
- ClickHouse system.parts documentation (https://clickhouse.com/docs/en/operations/system-tables/parts)

## Issues Found
- **Compressed vs uncompressed bytes threshold (incorrect).** The post stated: "If a new part's compressed size is below `min_bytes_for_wide_part`, it is stored in compact format." Verified against the `choosePartFormat` function in `MergeTreeData.cpp`, the parameter passed is explicitly named `bytes_uncompressed`, and the comparison is `bytes_uncompressed < min_bytes_for_wide_part`. Changed "compressed size" → "uncompressed size".
- **Same issue in the Merges section.** The line "If the merged part size exceeds `min_bytes_for_wide_part`, it is written as wide." was clarified to say "the merged part's uncompressed size" for accuracy.

## Review Notes
- The post states the default for `min_bytes_for_wide_part` is 10 MB (10,485,760). This is correct for standard/OSS ClickHouse installations. ClickHouse Cloud uses a different default (1 GiB = 1,073,741,824). The post's statement is a reasonable simplification for OSS users but does not cover the Cloud difference — worth flagging in a future revision if Cloud users are a target audience.
- The actual `choosePartFormat` logic in current ClickHouse master also considers a third setting, `min_level_for_wide_part` (default 0), in an OR'd condition with bytes and rows. The post does not mention this setting; for most practical tuning purposes this is fine since the default is 0, but advanced readers may encounter it.
- The logic for compact vs wide is: if `bytes_uncompressed < min_bytes_for_wide_part` OR `rows_count < min_rows_for_wide_part` OR `part_level < min_level_for_wide_part`, the part is Compact; otherwise Wide. The post's "at or above the threshold" framing is accurate under the default where `min_rows_for_wide_part = 0` (so the rows criterion is effectively never satisfied).
- File extension details (`.bin` for column data, `.mrk2` for marks in wide parts, `data.bin` single-file for compact) are accurate. Note: compact parts actually use `data.mrk3` for marks alongside `data.bin`; the post only mentions `data.bin`, but this simplification doesn't affect correctness of the conceptual explanation.
- The `system.parts` query, column names (`part_type`, `rows`, `data_compressed_bytes`, `active`, `database`, `table`), and `formatReadableSize()` function are all valid.
- The `CREATE TABLE` examples, `LowCardinality(String)`, `MATERIALIZED` columns, `PARTITION BY toYYYYMM(...)`, and server-level XML configuration syntax are all correct.
- Defaults for `index_granularity` (8192), `index_granularity_bytes` (10485760), and `enable_mixed_granularity_parts` (1) shown in the full-table example are accurate.
