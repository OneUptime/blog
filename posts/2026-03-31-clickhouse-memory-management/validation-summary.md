# Validation Summary: How ClickHouse Memory Management Works

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- ClickHouse (memory management, configuration, system tables)
- SQL (ClickHouse SQL dialect)
- XML configuration (ClickHouse server config)

## Sources Consulted
- [ClickHouse Architecture Overview](https://clickhouse.com/docs/development/architecture) — MemoryTracker class and thread group memory tracking
- [ClickHouse Server Settings](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — `max_server_memory_usage_to_ram_ratio`, `tmp_path`, `uncompressed_cache_size`, `mark_cache_size`
- [ClickHouse Memory Overcommit](https://clickhouse.com/docs/operations/settings/memory-overcommit) — user-level and global memory tracker hierarchy
- [ClickHouse Memory Limit Exceeded KB](https://clickhouse.com/docs/knowledgebase/memory-limit-exceeded-for-query) — `max_memory_usage` setting and error message format
- [ClickHouse ALTER USER](https://clickhouse.com/docs/sql-reference/statements/alter/user) — `ALTER USER ... SETTINGS` syntax
- [ClickHouse GROUP BY Clause](https://clickhouse.com/docs/sql-reference/statements/select/group-by) — `max_bytes_before_external_group_by`
- [ClickHouse ORDER BY Clause](https://clickhouse.com/docs/sql-reference/statements/select/order-by) — `max_bytes_before_external_sort`, `tmp_path` as server-level config
- [system.asynchronous_metrics](https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics) — table schema and memory-related metrics
- [system.processes](https://clickhouse.com/docs/operations/system-tables/processes) — table schema with `query_id`, `user`, `memory_usage`, `query` columns
- [ClickHouse Cache Types](https://clickhouse.com/docs/operations/caches) — overview of caching subsystems

## Issues Found

1. **Inaccurate memory tracking description (fixed):** The post claimed ClickHouse uses "a custom allocator that intercepts `malloc`/`free` calls." This is imprecise — ClickHouse uses its internal `MemoryTracker` class (with jemalloc as the underlying allocator), not a custom allocator that intercepts malloc/free. Changed to reference `MemoryTracker` directly.

2. **Misleading section heading "Server-Wide Memory Limit" (fixed):** The section showed `ALTER USER default SETTINGS max_memory_usage` which is a per-user setting, not a server-wide limit. The actual server-wide setting (`max_server_memory_usage_to_ram_ratio`) was also in the section but the heading was misleading. Changed the heading to "Per-User and Server-Wide Memory Limits" and clarified the ALTER USER example applies to the default user specifically.

3. **`SET tmp_path` is not a valid query-level setting (fixed):** The post included `SET tmp_path = '/var/lib/clickhouse/tmp/';` in a SQL block, but `tmp_path` is a server-level configuration parameter that can only be set in `config.xml`, not at query time via SET. Removed the SET statement and replaced it with a prose note explaining that `tmp_path` is configured in `config.xml`.

4. **`system.caches` table does not exist in documented ClickHouse (fixed):** The post queried `SELECT name, total_size_bytes / 1024 / 1024 AS size_mb FROM system.caches;` but `system.caches` is not a documented ClickHouse system table, and `total_size_bytes` could not be verified as a valid column. Replaced with a query against `system.metrics` using `WHERE metric LIKE '%Cache%'`, which is a documented and reliable way to check cache-related metrics.

## Review Notes
- The `ALTER USER default SETTINGS max_memory_usage` syntax works but `ALTER USER default MODIFY SETTING max_memory_usage` would be more precise as it avoids overwriting other user settings.
- The recommendation to set `max_bytes_before_external_group_by` to roughly half of `max_memory_usage` (per official docs) could be a useful addition in a future update.
- All other SQL examples, system table queries, config parameter names, and technical explanations were verified as accurate.
