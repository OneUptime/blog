# Validation Summary: How to Configure MergeTree Settings for Optimal Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse SQL DDL (CREATE TABLE, ALTER TABLE, SETTINGS)
- ClickHouse compression codecs (ZSTD, DoubleDelta, LZ4)
- ClickHouse storage policies / tiered storage
- ClickHouse TTL

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse MergeTree settings reference: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse compression codecs: https://clickhouse.com/docs/sql-reference/statements/create/table#column_compression_codec
- ClickHouse ALTER ... MODIFY SETTING: https://clickhouse.com/docs/sql-reference/statements/alter/setting
- ClickHouse TTL / multiple volumes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
1. **Deprecated setting `write_final_mark`** — The first example in "Setting Syntax" included `write_final_mark = 1`. This setting has been obsolete since ClickHouse 22.x and now lives in the obsolete-settings section of the docs (final marks are always written). Removed the line from the example.
2. **Outdated defaults for `parts_to_delay_insert` / `parts_to_throw_insert`** — The post used 150 / 300 in the "Parts Per Partition Limit" section and in the "Recommended Production Settings Summary". These were the defaults in older versions; current ClickHouse defaults are **1000 / 3000** per partition. Updated both the example and the recommended summary to the current defaults, and added the default values inline.
3. **Compact format phrasing** — The post described Compact format as "(one file per part)". This was slightly misleading (a part also has marks and metadata files). Rewrote to "(a single data file for all columns)" which more accurately contrasts with Wide format's per-column files.

## Review Notes
- `merge_max_block_size = 8192` is used as the example value, which happens to also be the default. This is not wrong, but a different illustrative value (e.g., 16384) would make the example more meaningful as a tuning knob. Left as-is since it is technically valid.
- `merge_with_ttl_timeout = 86400` in the examples is fine; the ClickHouse default is 14400 (4 hours), and 86400 (1 day) is a valid tuning choice for reducing TTL-merge churn on append-heavy tables.
- `min_bytes_for_wide_part = 10485760` (10 MiB) matches the current ClickHouse default; listing it in the production summary is redundant but not incorrect.
- The tiered-storage example references a `hot_cold` policy that must be defined in `storage_configuration` in `config.xml`; the post correctly notes this.
- All compression codecs cited (`ZSTD(3)`, `DoubleDelta`, `LZ4`) are valid and commonly used.
- SQL syntax for `CREATE TABLE ... SETTINGS`, `ALTER TABLE ... MODIFY SETTING`, and `TTL ... TO DISK` are all correct.
