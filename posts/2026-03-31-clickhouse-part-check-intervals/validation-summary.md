# Validation Summary: How to Configure ClickHouse Part Check Intervals

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse replication (ReplicatedMergeTree)
- ClickHouse system tables (system.parts, system.replication_queue, system.merges)

## Sources Consulted
- ClickHouse MergeTree settings documentation — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse CHECK TABLE statement — https://clickhouse.com/docs/sql-reference/statements/check-table
- ClickHouse system.parts table — https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.replication_queue table — https://clickhouse.com/docs/operations/system-tables/replication_queue
- ClickHouse ALTER TABLE PARTITION/PART operations — https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse SYSTEM statements — https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse ReplicatedMergeTree documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse server configuration parameters — https://clickhouse.com/docs/operations/server-configuration-parameters/settings

## Issues Found

1. **`check_delay_period`, `cleanup_delay_period`, and `merge_selecting_sleep_ms` shown as top-level config.xml settings**: These are MergeTree table-level settings, not top-level server config settings. Fixed by wrapping them in a `<merge_tree>` section and noting that `check_delay_period` is obsolete in current ClickHouse versions.

2. **`check_sample_column_probability` MergeTree setting does not exist**: This setting was fabricated. No such setting exists in ClickHouse. Removed the entire `ALTER TABLE MODIFY SETTING` example that referenced it.

3. **`CHECK_PART` is not a valid type in `system.replication_queue`**: The valid types are `GET_PART`, `ATTACH_PART`, `MERGE_PARTS`, `DROP_RANGE`, `REPLACE_RANGE`, `MUTATE_PART`, and `ALTER_METADATA`. Changed the WHERE clause to filter on `GET_PART` (which tracks part fetch operations triggered when parts are missing or corrupt) and updated the explanatory text.

4. **CHECK TABLE output column names were wrong**: `part_name` should be `part_path` and `is_ok` should be `is_passed`. Fixed both column names in the example output.

5. **`is_currently_merging` column does not exist in `system.parts`**: This column is not part of the `system.parts` table schema. Replaced the monitoring query with valid columns (`sum(bytes_on_disk)` and `countIf(rows > 0)`) and added a separate query against `system.merges` to show in-progress merges.

6. **"Configuring Check Frequency" section based on obsolete setting**: The entire section recommended tuning `check_delay_period` to various values (5, 30, 120 seconds), but this setting is obsolete and does nothing in current ClickHouse. Rewrote the section to accurately describe the current behavior: part checks run automatically and cannot be tuned via this setting.

7. **Summary section updated**: Revised to reflect the corrected content, removing the claim about balancing check frequency.

## Review Notes
- The `check_delay_period` setting did exist in older ClickHouse versions but is now marked as obsolete. The post's original premise of "configuring part check intervals" is somewhat undermined by this, as there is no direct user-tunable setting for check frequency in current versions. The corrected post now accurately reflects this.
- The `CHECK TABLE` syntax with `PARTITION` clause is correct and useful for manual verification workflows.
- The advice about detaching corrupt parts and using `SYSTEM SYNC REPLICA` for replicated tables is sound.
- The `ALTER TABLE DETACH PART` and `SYSTEM SYNC REPLICA` syntax were both verified as correct.
