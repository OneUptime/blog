# Validation Summary: How to Use Data Skipping with Sparse Indexes in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- Sparse primary index
- Data-skipping (secondary) indexes: `set`, `minmax`, `bloom_filter`
- Partition pruning
- Adaptive granularity
- `EXPLAIN indexes = 1`
- System tables: `system.parts`, `system.query_log`, `system.merge_tree_settings`, `system.tables`

## Sources Consulted
- MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- Data-skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- `system.tables` columns: https://clickhouse.com/docs/en/operations/system-tables/tables
- `system.parts` columns: https://clickhouse.com/docs/en/operations/system-tables/parts
- `system.query_log` columns: https://clickhouse.com/docs/en/operations/system-tables/query_log
- `system.merge_tree_settings`: https://clickhouse.com/docs/en/operations/system-tables/merge_tree_settings
- MergeTree settings (including `index_granularity_bytes`): https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- EXPLAIN statement: https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found

1. **"Granule Anatomy" query referenced non-existent columns on `system.tables`.**
   The original query selected `index_granularity` and `index_granularity_bytes` from `system.tables`, but those columns do not exist there. They are MergeTree settings, accessible via `system.merge_tree_settings` (for global defaults) or the table's `create_table_query` / `engine_full`. Replaced the query with one that selects `create_table_query` from `system.tables` for the per-table definition plus a second query against `system.merge_tree_settings` for the global defaults.

2. **Adaptive granularity example used an unrealistic `index_granularity_bytes` value.**
   The original SETTINGS clause used `index_granularity_bytes = 8192`, which is 8 KiB — extremely small and misleading, since the actual default is `10485760` (10 MiB). The original comment also claimed "target bytes per granule" without noting the default. Changed to `10485760` and updated the comments to reference the documented defaults, so the example faithfully represents the default adaptive-granularity behavior the surrounding text describes.

## Review Notes
- `set(10) GRANULARITY 4` is valid; `10` is `max_rows` (max unique values per skip-index block) and `GRANULARITY 4` means the skip index covers 4 primary granules per skip-index granule. These choices are reasonable but readers should know `set(0)` stores all unique values.
- The illustrative granule counts (`150/1000`, `22/150`) are plausible but synthetic; real numbers depend on data distribution.
- Memory comparison (dense ~8GB vs sparse ~1MB for 1B rows) is a rough estimate; actual sparse index memory also depends on key width and compression, but the order-of-magnitude claim is sound.
- The recommendation about `bloom_filter` for high-cardinality string equality is accurate; `tokenbf_v1` / `ngrambf_v1` exist for substring matches but were not discussed (out of scope for this post).
