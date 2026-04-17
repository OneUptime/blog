# Validation Summary: How to Estimate ClickHouse Memory Requirements

## Status
validated

## Post Type
Guide / Capacity-planning tutorial

## Technologies Covered
- ClickHouse (server configuration, system tables, memory limits)
- ClickHouse SQL (system.query_log, system.metrics, system.asynchronous_metrics)
- XML server configuration (config.xml settings)

## Sources Consulted
- [ClickHouse Server Settings docs](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — verified `mark_cache_size` and `max_server_memory_usage_to_ram_ratio`.
- [ClickHouse system.asynchronous_metrics docs](https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics) — verified location of `MarkCacheBytes` / `UncompressedCacheBytes`.
- [Altinity KB: asynchronous_metrics](https://kb.altinity.com/altinity-kb-setup-and-maintenance/asynchronous_metrics_descr/) — confirmed `MarkCacheBytes` lives in `system.asynchronous_metrics`.
- [Altinity KB: memory configuration settings](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-memory-configuration-settings/) — verified `max_server_memory_usage_to_ram_ratio` default of 0.9 and per-query `max_memory_usage`.
- ClickHouse `system.query_log` schema — verified columns `query_id`, `peak_memory_usage`, `read_rows`, `query`, `type` and value `'QueryFinish'`.

## Issues Found
- **Monitoring SQL — wrong system table for cache metrics.** The original query selected `MarkCacheBytes` and `UncompressedCacheBytes` from `system.metrics`, but those metrics live in `system.asynchronous_metrics`. Only `MemoryTracking` is in `system.metrics`. Replaced the single query with a `UNION ALL` that pulls `MemoryTracking` from `system.metrics` and the two cache metrics from `system.asynchronous_metrics`.

## Review Notes
- The mark-cache rule of thumb (0.5–1% of compressed data) is a reasonable heuristic; actual usage depends on `index_granularity`, column count, and how many parts are touched. Defaults at 5 GB align with the worked example.
- `max_memory_usage` value `10000000000` is ~9.31 GiB; the inline comment calls it "10 GB" (decimal), which is consistent with how ClickHouse and most vendors report sizes.
- `MemoryTracking` is a tracker counter and may slightly under-report total RSS; for OOM prevention, also watching OS-level RSS (`MemoryResident` in `system.asynchronous_metrics`) is worthwhile but out of scope for the post.
- Cache hit/miss visibility (`MarkCacheHits`, `MarkCacheMisses` in `system.events`) would complement the monitoring section in a future update.
