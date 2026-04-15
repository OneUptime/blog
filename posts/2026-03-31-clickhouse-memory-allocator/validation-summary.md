# Validation Summary: How ClickHouse Memory Allocator Works

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (OLAP database)
- jemalloc (memory allocator)
- ClickHouse system tables (system.processes, system.query_log, system.asynchronous_metrics, system.dictionaries, system.caches)
- ClickHouse memory management settings (max_memory_usage, max_bytes_before_external_group_by, max_bytes_before_external_sort)
- jemalloc heap profiling (SYSTEM JEMALLOC commands, jeprof)

## Sources Consulted
- ClickHouse official documentation on server settings: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse official documentation on query-level settings: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse official documentation on system.processes: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse official documentation on system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation on system.asynchronous_metrics: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse official documentation on system.dictionaries: https://clickhouse.com/docs/en/operations/system-tables/dictionaries
- ClickHouse official documentation on SYSTEM JEMALLOC statements: https://clickhouse.com/docs/en/sql-reference/statements/system#jemalloc
- ClickHouse source code (contrib/jemalloc) for allocator verification

## Issues Found
1. **Incorrect jemalloc profiling command**: The post used `SYSTEM JEMALLOC DUMP PROFILE` which is not a valid ClickHouse command. Changed to `SYSTEM JEMALLOC FLUSH PROFILE`, which is the correct command that writes the heap profile to disk.

2. **Incorrect uncompressed cache default**: The post stated the uncompressed cache default was "0". The actual `uncompressed_cache_size` server setting defaults to 8 GiB (8589934592 bytes), though the `use_uncompressed_cache` query-level setting defaults to off, meaning queries do not use the cache unless explicitly enabled. Updated the table entry to "default 8GB, use_uncompressed_cache off" to accurately reflect both the allocated size and disabled-by-default behavior.

## Review Notes
- The method suggested to verify jemalloc (`SELECT * FROM system.settings WHERE name = 'memory_profiler_sample_probability'`) is not the most direct way to confirm jemalloc is in use. The `memory_profiler_sample_probability` setting exists regardless of allocator. Better approaches include querying `system.asynchronous_metrics` for jemalloc-specific metrics or using `SYSTEM JEMALLOC STATS`. This is not technically incorrect (the setting does exist), but could be misleading.
- The `system.caches` table was introduced in newer ClickHouse versions (22.x+). It may not be available in older installations.
- The `max_memory_usage` default is 0 (unlimited) in open-source ClickHouse, though some managed deployments (e.g., ClickHouse Cloud) may set a default of 10 GB. The post does not claim a specific default, so this is fine.
- All SQL queries are syntactically correct and use valid column names for the referenced system tables.
- The explanation of MemoryTracker behavior is accurate.
