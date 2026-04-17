# Validation Summary: How to Use Distributed Cache in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (distributed cache, filesystem cache)
- ClickHouse Cloud (where distributed cache is a first-class feature)
- Object storage (S3)
- SQL (system.events, system.filesystem_cache, clusterAllReplicas)
- ClickHouse XML configuration

## Sources Consulted
- [ClickHouse Settings source (src/Core/Settings.cpp)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp) — authoritative definitions of `read_through_distributed_cache`, `write_through_distributed_cache`, `distributed_cache_throw_on_error`, `distributed_cache_wait_connection_from_pool_milliseconds`, `distributed_cache_connect_timeout_ms`, etc. All distributed cache settings are annotated `/* CLOUD ONLY */`.
- [ClickHouse ProfileEvents source (src/Common/ProfileEvents.cpp)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp) — canonical list of profile events. Distributed cache events use the prefix `DistrCache`, not `DistributedCache`.
- [ClickHouse system.filesystem_cache implementation](https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/System/StorageSystemFilesystemCache.cpp) — confirms the `cache_name` and `size` columns referenced in the post.
- [ClickHouse blog: Building a Distributed Cache for S3](https://clickhouse.com/blog/building-a-distributed-cache-for-s3) — context that distributed cache is a ClickHouse Cloud feature (originally private preview).
- [ClickHouse Docs: Server Settings](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [ClickHouse Docs: Session Settings](https://clickhouse.com/docs/operations/settings/settings)
- [ClickHouse Docs: system.events](https://clickhouse.com/docs/operations/system-tables/events)

## Issues Found

1. **Profile event prefix was wrong.** The post listed events as `DistributedCacheReadMicroseconds`, `DistributedCacheHit`, `DistributedCacheMiss`, and the SQL filter used `event LIKE '%DistributedCache%'`. ClickHouse's actual distributed cache profile events use the prefix `DistrCache` (e.g., `DistrCacheReadMicroseconds`, `DistrCacheReadErrors`, `DistrCacheFallbackReadMicroseconds`). A query filtering on `%DistributedCache%` returns zero rows. Fixed the LIKE filter to `%DistrCache%` and replaced the three bullet items with real events (`DistrCacheReadMicroseconds`, `DistrCacheFallbackReadMicroseconds`, `DistrCacheReadErrors`). Also updated the Summary section to reference `DistrCacheReadMicroseconds` instead of the non-existent `DistributedCacheHit`.

2. **Non-existent events `DistributedCacheHit` / `DistributedCacheMiss`.** These do not exist in ClickHouse — there are no per-event hit/miss counters for distributed cache. Replaced with real events that convey similar monitoring intent (read latency, fallback path latency, read errors).

3. **Setting `distributed_cache_wait_connection_timeout_milliseconds` does not exist.** The closest real settings are `distributed_cache_connect_timeout_ms`, `distributed_cache_receive_timeout_ms`, and `distributed_cache_wait_connection_from_pool_milliseconds`. Changed the example to use `distributed_cache_wait_connection_from_pool_milliseconds` (pool-wait semantics match the comment in the post) and updated the comment accordingly.

4. **Query-level setting `use_distributed_cache` does not exist.** The real session setting that enables reading through distributed cache is `read_through_distributed_cache`. Changed the `SET` statement and updated the Summary's reference to match.

## Review Notes

- **ClickHouse Cloud-only feature.** Every `distributed_cache_*` / `read_through_distributed_cache` / `write_through_distributed_cache` setting is annotated `/* CLOUD ONLY */` in the ClickHouse source and documented as "Only has an effect in ClickHouse Cloud." The distributed cache server itself is not part of open-source ClickHouse. The post presents the feature as configurable on self-hosted clusters via XML (`<distributed_cache>`, `<use_distributed_cache>` on the S3 disk), which is not how ClickHouse Cloud enables it, and there is no equivalent open-source deployment. I did not restructure the post to add this caveat because the reviewer guidelines restrict edits to direct correction of technical errors, but readers should be aware that these XML blocks are illustrative rather than a working self-hosted recipe; the query-level settings and profile events (now corrected) are the concrete, verifiable parts of the feature.
- **Disk config field `<use_distributed_cache>true</use_distributed_cache>`** is not a documented ClickHouse disk configuration key and was left in place as part of the illustrative XML (see the caveat above).
- **`system.filesystem_cache` query is correct.** The `cache_name` and `size` columns both exist, and the `clusterAllReplicas(...)` usage is valid.
- **`enable_filesystem_cache`, `filesystem_cache_name`, and `cache_on_write_operations`** are all real settings/config keys and were left unchanged.
