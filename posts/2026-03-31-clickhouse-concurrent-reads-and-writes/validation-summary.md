# Validation Summary: How to Handle Concurrent Reads and Writes in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse system tables (`system.processes`, `system.merges`)
- ClickHouse async INSERT feature
- ClickHouse server and session settings

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse MergeTree table settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- `system.processes` documentation: https://clickhouse.com/docs/operations/system-tables/processes
- `system.merges` documentation: https://clickhouse.com/docs/operations/system-tables/merges
- MergeTree engine (concurrency, part visibility): https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- `async_insert_busy_timeout_max_ms` (with `async_insert_busy_timeout_ms` alias): https://clickhouse.com/docs/operations/settings/settings#async_insert_busy_timeout_max_ms

## Issues Found
1. **Invalid setting `insert_timeout`.** The post used `SET insert_timeout = 60;` / `SET insert_timeout = 300;`, but `insert_timeout` is not a ClickHouse setting and would raise "Unknown setting" in strict mode. Replaced with `SET max_execution_time = 60;` / `SET max_execution_time = 300;`, which is the canonical setting for capping overall query/insert execution time. Updated the inline comment from "The default: wait up to 60 seconds..." (misleading — the real default of `max_execution_time` is 0 = unlimited) to "Cap overall query/insert execution time to 60 seconds".
2. **Malformed XML in the config snippet.** The commented snippet contained `<merge_tree settings>` (not valid XML) and had no closing tag. Fixed to a proper `<merge_tree> ... </merge_tree>` block.

## Review Notes
- `async_insert_busy_timeout_ms` (used in the post) is still accepted as an alias of the newer canonical name `async_insert_busy_timeout_max_ms`. Left as-is since both work and the post's intent is clear.
- `max_concurrent_queries` is a server-level setting (config.xml), not a session `SET` value — the post correctly shows it inside a `config.xml` comment, so no change needed.
- `max_parts_in_total` is a per-table MergeTree setting (can also be specified in the default MergeTree settings section of the server config). The post's framing is acceptable.
- The "MVCC-like semantics" phrasing is a loose analogy — ClickHouse does not implement classical MVCC with row-level versioning. However, its "snapshot of active parts at query start" behavior is effectively analogous, so the statement is acceptable as an explanatory shorthand.
- "ClickHouse acknowledges INSERTs only after the data is committed to disk" is accurate at the filesystem-visibility level, but by default ClickHouse does not `fsync` per insert (`fsync_after_insert=0`). For strict durability against power loss, users should enable the fsync MergeTree settings — not a correction to flag here, just a caveat for readers.
- System table column references (`memory_usage`, `elapsed` in `system.processes`; `database`, `table`, `elapsed`, `progress`, `num_parts` in `system.merges`) all verified against current documentation.
