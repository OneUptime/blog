# Validation Summary: How to Create Loki Chunk Cache

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana Loki
- Loki chunk cache and results cache
- Memcached
- Redis
- Kubernetes StatefulSet, Deployment, and Service resources
- Prometheus / PromQL
- Grafana dashboards and alerting rules

## Sources Consulted
- Grafana Loki caching documentation: https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki upgrade notes for cache metric changes: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki cache instrumentation source: https://github.com/grafana/loki/blob/main/pkg/storage/chunk/cache/instrumented.go
- Grafana Loki store cache prefix source: https://github.com/grafana/loki/blob/main/pkg/storage/store.go
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Memcached documentation: https://docs.memcached.org/

## Issues Found
- The post said Loki stores decompressed chunk data in the chunk cache. Updated this to say chunk data is cached by chunk reference, matching Loki's documented `chunkRef` cache behavior.
- The Memcached examples placed `expiration` under `memcached_client`, but Loki's current `cache_config` schema defines Memcached TTL under `memcached.expiration`. Moved TTL fields to the correct block.
- The Memcached examples used `update_cache_timestamp`, which is not a current Loki cache configuration field. Removed it.
- The basic Memcached example included `chunk_store_config.max_look_back_period`, which is not part of the current `chunk_store_config` schema. Removed it.
- The Memcached example described `batch_size` as a wait time. Corrected the comment to describe it as the number of keys fetched per batch.
- The Memcached StatefulSet used a floating `memcached:1.6-alpine` image. Updated it to `memcached:1.6.32-alpine`, the version currently recommended by Grafana's Loki caching documentation.
- The Redis cluster example used `cluster_enabled`, which is not a current Loki Redis cache field. Replaced it with a comma-separated list of Redis Cluster seed endpoints, as supported by the Loki configuration reference.
- The TTL section showed Memcached TTL under `memcached_client`. Updated it to use `memcached.expiration`.
- The advanced embedded cache examples used deprecated/old `enable_fifocache` and `fifocache` fields. Replaced them with the current `embedded_cache` block and `max_size_mb`, `max_size_items`, and `ttl` fields.
- The "Write-Behind Cache for Ingesters" section incorrectly described chunk cache as an ingester write-path feature. Reframed it as an embedded first-level cache for queriers.
- The Redis eviction explanation implied Redis always evicts with LRU. Updated it to clarify that Redis needs a cache-friendly `maxmemory-policy`, such as `allkeys-lru`.
- The PromQL examples used `cache="chunks"` and `loki_cache_misses_total`, but current Loki cache metrics use a `name` const label and expose fetched-key and hit counters rather than a miss counter. Updated hit-rate, miss-rate, latency, dashboard, and alert expressions to use `name=~"chunks.*"` and derive misses from fetched keys minus hits.
- The post referenced non-current chunk fetched byte metrics. Replaced that example with the current Loki cache value-size histogram.
- The production configuration repeated the old embedded cache and Memcached TTL fields. Updated it to the current Loki cache schema.

## Review Notes
I attempted to run Loki 3.7.2 with `-verify-config=true` as an additional check, but Docker bind mounts were not visible to the container in this environment. The final review therefore relies on the official Loki documentation and current Loki source for metric labels and cache prefixes.
