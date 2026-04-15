# Validation Summary: How to Use system.settings to View All ClickHouse Settings

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, settings, SQL queries)
- ClickHouse `system.settings` table
- ClickHouse `system.merge_tree_settings` table
- ClickHouse CLI (`clickhouse-client`)
- Bash scripting for settings export

## Sources Consulted
- ClickHouse official documentation: system.settings table (https://clickhouse.com/docs/operations/system-tables/settings)
- ClickHouse official documentation: system.merge_tree_settings table (https://clickhouse.com/docs/operations/system-tables/merge_tree_settings)
- ClickHouse official documentation: Permissions for queries / readonly setting (https://clickhouse.com/docs/operations/settings/permissions-for-queries)
- ClickHouse official documentation: ALTER TABLE MODIFY SETTING (https://clickhouse.com/docs/sql-reference/statements/alter/setting)
- ClickHouse official documentation: Query complexity restrictions (https://clickhouse.com/docs/operations/settings/query-complexity)
- ClickHouse GitHub PR #10362: Rework total memory tracker (deprecation of max_memory_usage_for_all_queries)

## Issues Found

1. **Non-existent setting `read_from_replicas`**: The "Key Replication and Consistency Settings" query included `read_from_replicas`, which does not exist in ClickHouse. Replaced with `replication_alter_partitions_sync`, a real replication-related setting that controls synchronous waiting for ALTER operations on replicated tables.

2. **Incorrect verification of per-table MergeTree settings**: After `ALTER TABLE ... MODIFY SETTING`, the blog suggested verifying by querying `system.merge_tree_settings`. That table shows global MergeTree defaults, not per-table overrides. Changed the verification to use `SHOW CREATE TABLE default.events`, which correctly shows per-table settings in the output.

3. **Misleading explanation of `readonly` settings**: The blog stated that readonly settings "must be changed in configuration files and require a server restart or reload." In reality, `readonly = 1` in `system.settings` means the current user's profile or constraints prevent changing the setting with `SET`. An administrator can adjust these constraints via user profile configuration (including SQL-based access control) without a server restart. Corrected the explanation accordingly.

4. **Deprecated setting `max_memory_usage_for_all_queries`**: This setting has been obsolete since approximately ClickHouse v20.4 (replaced by server-level `max_server_memory_usage`). It was listed in both the "Key Performance Settings" and "Verify Memory Limits" queries as if it were an active, useful setting. Removed it from both queries to avoid misleading readers.

## Review Notes
- All SQL syntax is correct and follows ClickHouse conventions.
- The `allow_experimental_parallel_reading_from_replicas` setting referenced in the performance section is experimental and may be renamed or changed in future ClickHouse versions. This is acceptable since the blog already uses its current official name.
- The `system.settings` column listing is described as "key columns" and does not claim to be exhaustive, which is appropriate since additional columns (e.g., `default`, `alias_for`) exist in newer versions.
- The `readonly` column actually supports values 0, 1, and 2 (where 2 means changeable within constraints). The blog's filter `WHERE readonly = 1` is valid but readers should be aware of the three-value semantics.
