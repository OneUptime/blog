# Validation Summary: How to Tune ClickHouse for Maximum Query Throughput

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (server configuration, query settings, query cache, system tables)
- Linux OS tuning (sysctl, file descriptors, transparent huge pages, I/O scheduler)
- Python (clickhouse-driver, clickhouse-pool)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation — Query Cache: https://clickhouse.com/docs/operations/query-cache
- ClickHouse official documentation — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse official documentation — system.query_cache: https://clickhouse.com/docs/operations/system-tables/query_cache
- ClickHouse official documentation — Server Settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse official documentation — Parallel Replicas: https://clickhouse.com/docs/deployment-guides/parallel-replicas
- ClickHouse source code — Settings.h (read_backoff settings, max_streams_to_max_threads_ratio)
- ClickHouse GitHub PR #48284 — query_cache_max_size_in_bytes per-user quota
- ClickHouse GitHub PR #63151 — parallel_replicas_for_non_replicated_merge_tree
- clickhouse-pool on PyPI: https://pypi.org/project/clickhouse-pool/
- ClickHouse blog — Introduction to the ClickHouse Query Cache

## Issues Found

### 1. Non-existent setting `read_backoff_min_throughput` in server config
**What was wrong:** The server configuration XML included `<read_backoff_min_throughput>0</read_backoff_min_throughput>` with the comment "Increase read-ahead for sequential scans." This setting does not exist in ClickHouse. The actual setting is `read_backoff_max_throughput`, which is a query-level setting (not a config.xml setting), and it controls when ClickHouse reduces the number of reading threads due to slow I/O — it has nothing to do with read-ahead for sequential scans.
**What was changed:** Removed the incorrect setting and its comment from the server config XML block.

### 2. Incorrect `system.query_log` column names for query cache metrics
**What was wrong:** The query cache monitoring SQL used `query_cache_hits` and `query_cache_misses` as direct columns in `system.query_log`. These are not direct columns — they are ProfileEvents, accessible via `ProfileEvents['QueryCacheHits']` and `ProfileEvents['QueryCacheMisses']`. The table does have a `query_cache_usage` enum column for per-query cache status.
**What was changed:** Updated the query to use `query_cache_usage` and `ProfileEvents['QueryCacheHits']` / `ProfileEvents['QueryCacheMisses']` for correct column access.

### 3. Misleading comment on `query_cache_max_size_in_bytes`
**What was wrong:** The comment said "1 GB cache size" which implies this controls the total server-wide cache size. In reality, `query_cache_max_size_in_bytes` is a per-user quota setting that limits how much of the shared query cache a single user may occupy. The total server-wide cache size is configured via `<query_cache><max_size_in_bytes>` in config.xml.
**What was changed:** Updated the comment to "1 GB per-user cache quota" for accuracy.

### 4. Imprecise version claim for query cache
**What was wrong:** The comment said "ClickHouse 23.5+" implying the query cache was introduced in 23.5. The query cache was actually introduced experimentally in ClickHouse 23.1 and became production-ready in 23.5.
**What was changed:** Updated the comment to "production-ready since ClickHouse 23.5" for precision.

## Review Notes
- `max_threads` is technically a query/session-level setting rather than a server config.xml setting, but ClickHouse does allow setting query-level defaults at the server level in some configurations. The blog's placement in config.xml may need adjustment depending on the ClickHouse version; it would be more conventionally placed in `users.xml` under a `<profiles>` block.
- `max_server_memory_usage_to_ram_ratio` is set to 0.9 in the blog, which is already the default value. This is not wrong but could be noted.
- `background_merges_mutations_concurrency_ratio` is set to 2, which is also the default. Same note applies.
- `max_streams_to_max_threads_ratio` still exists but ClickHouse docs suggest `max_streams_for_merge_tree_reading` may be more effective for performance tuning.
- `parallel_replicas_for_non_replicated_merge_tree` was formalized in v24.10 as part of a parallel replicas settings rework, which is later than the 23.3+ version mentioned alongside the parallel replicas settings. The setting may not be available in all 23.x versions.
- The `clickhouse-pool` library API and usage pattern are correct as documented on PyPI.
