# Validation Summary: How to Understand Data Parts and Granules in MergeTree

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse SQL (system.parts, EXPLAIN indexes)
- Adaptive index granularity (`index_granularity`, `index_granularity_bytes`)
- Sparse primary index, marks, compact/wide part types

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- MergeTree settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- `index_granularity_bytes` setting: https://clickhouse.com/docs/operations/settings/merge-tree-settings#index_granularity_bytes
- `enable_mixed_granularity_parts`: https://clickhouse.com/docs/operations/settings/merge-tree-settings#enable_mixed_granularity_parts
- ALTER PARTITION (DETACH/DROP semantics): https://clickhouse.com/docs/sql-reference/statements/alter/partition
- Sparse primary index guide: https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes
- `system.parts` system table: https://clickhouse.com/docs/operations/system-tables/parts

## Issues Found
1. **Invalid setting `adaptive_index_granularity_enabled`.** The CREATE TABLE example referenced `adaptive_index_granularity_enabled = 1`, which is not a valid MergeTree setting. Adaptive granularity is enabled by default and controlled by the value of `index_granularity_bytes` (set to 0 to disable, non-zero to enable). Replaced the bogus setting with `index_granularity = 8192` and added a clarifying note that adaptive granularity is on by default. The closest legitimate setting (`enable_mixed_granularity_parts`) governs merging behavior between fixed and adaptive parts on legacy tables, not enablement.
2. **Incorrect lifecycle claim for DROP.** The lifecycle diagram stated `DETACH/DROP -> parts moved to detached/ directory`. Per the official `ALTER PARTITION` docs, only DETACH moves parts to `detached/`; DROP marks parts inactive and deletes them (approximately within 10 minutes). Split the line into separate DETACH and DROP entries with accurate semantics.

## Review Notes
- Part name format `partition_minBlock_maxBlock_level` (e.g., `202603_1_5_2`) and example part type rows (`Compact`/`Wide`) are accurate.
- Default `index_granularity_bytes = 10485760` (10 MiB) and default `index_granularity = 8192` rows are confirmed against `MergeTreeSettings.cpp`.
- Sparse primary index "one entry per granule" claim is confirmed.
- `InMemory` part type is no longer relevant in modern ClickHouse (related settings are documented as obsolete); the post correctly only mentions Compact and Wide.
- The "Granule Size vs Query Selectivity" table's "Precise (1 KB)" cell is a loose shorthand (1 KB has no fixed relation to 1024 rows since per-row size varies); left as-is since it is clearly illustrative rather than a hard claim.
