# Validation Summary: How to Optimize ClickHouse for Write Throughput

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine, ReplicatedMergeTree, Distributed tables)
- ClickHouse SQL dialect
- ClickHouse server configuration (XML config files)
- ClickHouse HTTP API and CLI client
- Insert formats: RowBinary, Native, JSONEachRow, CSV, TabSeparated

## Sources Consulted
- ClickHouse documentation: MergeTree engine settings (parts_to_delay_insert, parts_to_throw_insert, max_delay_to_insert, fsync_after_insert) — https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse documentation: Server settings (background_pool_size, background_merges_mutations_concurrency_ratio) — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse documentation: INSERT query and formats — https://clickhouse.com/docs/en/sql-reference/statements/insert-into
- ClickHouse documentation: insert_quorum and replication settings — https://clickhouse.com/docs/en/operations/settings/settings#insert_quorum
- ClickHouse documentation: system.parts, system.merges, system.query_log tables — https://clickhouse.com/docs/en/operations/system-tables
- ClickHouse documentation: Distributed table engine — https://clickhouse.com/docs/en/engines/table-engines/special/distributed

## Issues Found

1. **XML config structure for MergeTree settings**: `parts_to_delay_insert`, `parts_to_throw_insert`, and `max_delay_to_insert` are MergeTree table-level settings. They were placed at the top level of `<clickhouse>` but must be nested inside a `<merge_tree>` section to serve as server-wide defaults. Wrapped them in `<merge_tree>`.

2. **Incorrect default for `parts_to_delay_insert`**: The comment stated "Default is 300" but the actual default is 150. (300 is the default for `parts_to_throw_insert`.) Corrected the comment.

3. **Wrong unit for `max_delay_to_insert`**: The comment stated "Delay in ms" but this setting is in seconds (default: 1 second). Corrected to "Delay in seconds".

4. **Invalid session-level `SET fsync_metadata = 0`**: `fsync_metadata` is a MergeTree table-level setting, not a session-level setting, and cannot be used with SET. Additionally, `fsync_after_insert` (the relevant setting for insert fsync behavior) defaults to 0, meaning fsync is already disabled by default. Replaced with a comment explaining the default and showing the correct `ALTER TABLE ... MODIFY SETTING` syntax for tables that have it enabled.

5. **Replication section inaccuracies**: The intro incorrectly stated that inserts are acknowledged after writing to a quorum by default. In reality, `insert_quorum` defaults to 0 (disabled), meaning inserts are acknowledged after writing to the local replica only, with asynchronous replication. Setting `insert_quorum = 1` was presented as "faster but less durable" when it actually enables quorum writes. The `insert_quorum_timeout` default was stated as 0 when the actual default is 600000 ms (10 minutes). Rewrote the section to accurately describe default behavior and correct settings.

## Review Notes
- The `system.parts` monitoring query uses `sum(active)` with `WHERE active = 1`, which is equivalent to `count()` since all filtered rows have `active = 1`. This works correctly but `count()` would be more idiomatic.
- The Native format is described as "zero-copy columnar" — while it is ClickHouse's internal columnar format and the most efficient, "zero-copy" is slightly loose terminology. Acceptable for a blog post.
- The `input_format_parallel_parsing` setting defaults to 1 in modern ClickHouse versions, so `SET input_format_parallel_parsing = 1` is a no-op on recent installations. Kept as-is since it's still valid and useful for documentation.
- The post does not mention the `async_insert` feature in detail despite referencing it in the settings section. A future revision could expand on async inserts with `async_insert_max_data_size`, `async_insert_busy_timeout_ms`, etc.
