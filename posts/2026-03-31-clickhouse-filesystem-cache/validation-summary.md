# Validation Summary: How to Use Filesystem Cache in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (filesystem cache, storage configuration, storage policies)
- S3 / object storage (GCS, Azure Blob mentioned)
- XML server configuration
- SQL (system tables, ProfileEvents, query settings)
- `clickhouse-client` CLI

## Sources Consulted
- [ClickHouse Docs — External disks for storing data](https://clickhouse.com/docs/operations/storing-data)
- [ClickHouse Docs — system.filesystem_cache](https://clickhouse.com/docs/operations/system-tables/filesystem_cache)
- [ClickHouse Docs — system.filesystem_cache_settings](https://clickhouse.com/docs/operations/system-tables/filesystem_cache_settings)
- [ClickHouse Docs — Cache types](https://clickhouse.com/docs/operations/caches)
- [ClickHouse GitHub — storing-data.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/storing-data.md)
- [ClickHouse GitHub — ProfileEvents.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp)
- [ClickHouse Discussion #61205 — How to drop local cache for S3 manually?](https://github.com/ClickHouse/ClickHouse/discussions/61205)
- [Altinity Blog — Caching in ClickHouse Definitive Guide](https://altinity.com/blog/caching-in-clickhouse-the-definitive-guide-part-1)

## Issues Found
1. **Invalid `<cache_enabled>true</cache_enabled>` attribute on the S3 disk.** ClickHouse does not document a `cache_enabled` attribute on a disk entry. Providing `<cache_name>` is sufficient to link the disk to a named cache registered under `<filesystem_caches>`. Removed the spurious `<cache_enabled>` line from the XML example.

2. **Wrong column names in the `system.filesystem_cache_settings` monitoring query.** The query referenced `name`, `hits`, `misses`, `size_limit`, and `used_size`, none of which exist in that system table. The actual table exposes configuration/status columns such as `cache_name`, `path`, `max_size`, `current_size`, `max_elements`, and `current_elements_num`. Hit/miss counters are not part of this table — they are ProfileEvents (which the second query already uses correctly). Rewrote the first query to use real columns and retitled its comment to "Check cache size and configuration".

3. **Incorrect setting for bypassing the cache.** `read_from_filesystem_cache_if_exists_otherwise_bypass_cache = 1` does not force a fresh S3 read — it still reads from cache if data is present; it only prevents newly read data from being cached. The correct setting to fully bypass the filesystem cache for a query is `enable_filesystem_cache = 0`. Updated the example accordingly.

## Review Notes
- The post's approach of registering a cache under `<filesystem_caches>` and referencing it from the S3 disk via `<cache_name>` is valid, but the more prominently documented pattern in recent ClickHouse docs is to define a separate disk of `<type>cache</type>` that wraps the S3 disk and to reference the cache disk in the storage policy. Both approaches work; the post's chosen pattern was left intact after fixing the specific errors.
- `CachedReadBufferReadFromCacheHits`, `CachedReadBufferReadFromCacheMisses`, and `CachedReadBufferReadFromSourceBytes` are valid ProfileEvents and the second monitoring query is correct.
- The `max_size` example value `107374182400` (100 GiB) is valid. ClickHouse also supports human-readable suffixes (e.g., `100Gi`) in modern versions; either form is accepted.
- `cache_hits_threshold = 0` means data is cached on the first read (no threshold); this is the default and the explanation is consistent with current behavior.
- The cache eviction section mentions LRU. ClickHouse now defaults to SLRU (since the 2025 change referenced in PR #75072) but still supports LRU via `cache_policy`. The statement is not incorrect for clusters that keep the legacy policy, so no change was made.
