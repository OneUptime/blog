# Validation Summary: How to Configure ClickHouse Mark Cache Size

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse server configuration (`config.xml` / `config.d/`)
- ClickHouse MergeTree engine and mark files (`.mrk`, `.mrk2`)
- ClickHouse system tables: `system.asynchronous_metrics`, `system.events`, `system.parts`
- SQL DDL: `SYSTEM DROP MARK CACHE`

## Sources Consulted
- [ClickHouse Server Settings — `mark_cache_size`](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [ClickHouse `system.metrics` docs (notes obsolete `MarkCacheBytes`/`MarkCacheFiles`)](https://clickhouse.com/docs/operations/system-tables/metrics)
- [ClickHouse `system.events` docs](https://clickhouse.com/docs/operations/system-tables/events)
- [ClickHouse `system.asynchronous_metrics` docs](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/system-tables/asynchronous_metrics.md)
- [ClickHouse issue #65536 — `DEFAULT_MARK_CACHE_MAX_SIZE = 5368_MiB`](https://github.com/ClickHouse/ClickHouse/issues/65536)
- [Altinity — Caching in ClickHouse: The Definitive Guide Part 1](https://altinity.com/blog/caching-in-clickhouse-the-definitive-guide-part-1)
- [Instaclustr — Boost ClickHouse performance with mark cache](https://www.instaclustr.com/blog/boost-clickhouse-performance-with-mark-cache-a-complete-guide/)

## Issues Found
- **Wrong system table for current cache usage.** The original "Monitoring Mark Cache Usage" section queried `MarkCacheBytes` and `MarkCacheFiles` from `system.metrics`, but these entries in `system.metrics` are documented as obsolete ("shows nothing"). The current cache size and file count are exposed via `system.asynchronous_metrics`. Updated the query to read from `system.asynchronous_metrics`.
- **Mislabeled query purpose.** A second query against `system.asynchronous_metrics WHERE metric LIKE '%MarkCache%'` was described as showing "hit/miss rates", but hit/miss counters live in `system.events` (`MarkCacheHits`, `MarkCacheMisses`), not in asynchronous metrics. Removed the redundant/mislabeled async-metrics query and kept the correct `system.events` query, with a clearer caption noting the counters are cumulative since server start.

## Review Notes
- The default value of 5 GiB (5368 MiB / 5368709120 bytes) for `mark_cache_size` is correct for recent ClickHouse versions.
- The human-readable suffix form (`<mark_cache_size>5Gi</mark_cache_size>`) is supported in modern ClickHouse versions and is left intact.
- The total mark cache is also implicitly capped by `cache_size_to_ram_max_ratio` (default 0.5 of available RAM) — not strictly an error, but readers sizing a very large cache should be aware of it.
- The hit-rate calculation query is functionally correct; the `sumIf` approach works because both `MarkCacheHits` and `MarkCacheMisses` rows are filtered in by the `WHERE` clause.
- `marks_bytes` in `system.parts` is a real, current column and the example query is accurate.
- `SYSTEM DROP MARK CACHE` is the correct, current statement.
