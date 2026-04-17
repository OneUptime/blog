# Validation Summary: How to Alter Table Settings in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- MergeTree engine
- SQL DDL (ALTER TABLE)
- ClickHouse system tables (system.merge_tree_settings, system.tables)

## Sources Consulted
- ClickHouse ALTER SETTING reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/setting
- ClickHouse MergeTree settings reference: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
- Changed "maximum total uncompressed size of parts" to "maximum total on-disk size of parts" in the description of `max_bytes_to_merge_at_max_space_in_pool`. The setting compares against `bytes_on_disk` (compressed/on-disk part size), not the uncompressed row size, so the original wording was technically inaccurate.

## Review Notes
- ALTER TABLE MODIFY SETTING / RESET SETTING syntax (including ON CLUSTER and multiple-setting forms) matches official ClickHouse documentation.
- The note that `index_granularity` cannot be changed on a non-empty existing table is correct; it must be set at CREATE time.
- `parts_to_delay_insert` and `parts_to_throw_insert` are correctly described as per-partition thresholds for active parts.
- `merge_max_block_size` default of 8192 rows is correct.
- Compact vs. Wide part format thresholds (`min_bytes_for_wide_part`, `min_rows_for_wide_part`) and the 10 MiB default for `min_bytes_for_wide_part` are accurate.
- `ttl_only_drop_parts` description is accurate — it skips part rewrites for TTL expiration, only dropping fully expired parts.
- `storage_policy` modification rule (new policy must be a superset of the old one) is consistent with ClickHouse documentation.
- The `system.merge_tree_settings` query and the use of `engine_full` from `system.tables` to inspect per-table SETTINGS are both correct techniques.
