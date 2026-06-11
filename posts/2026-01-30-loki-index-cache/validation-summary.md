# Validation Summary: How to Build Loki Index Cache

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Loki TSDB and BoltDB shipper index caching
- Memcached
- Redis
- Kubernetes StatefulSet, Service, CronJob, and probe configuration
- Prometheus alerting rules
- LogCLI

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki caching operations guide: https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki storage configuration guide: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki LogCLI getting started and command reference: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- Grafana Loki cardinality guide for `logcli series`: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Loki v3.7.2 source code and generated docs, checked locally from https://github.com/grafana/loki/tree/v3.7.2

## Issues Found
- The post treated `index_queries_cache_config` with embedded, Memcached, and Redis backends as the current TSDB index cache path. Current Loki documentation says TSDB uses downloaded index files on local disk, while the index lookup cache is obsolete for TSDB and mainly relevant to legacy BoltDB index storage. Updated the post to distinguish TSDB local index-file caching from legacy BoltDB index lookup caching.
- The TSDB examples used `tsdb_shipper.shared_store`, which has been removed. Removed `shared_store` and relied on the schema `object_store` setting.
- Memcached `batch_size` and `parallelism` were nested under `memcached_client`, but Loki config defines them under the sibling `memcached` block. Moved those fields in the affected examples.
- The production config used `write_dedupe_cache_config` with TSDB. Loki documents write dedupe cache as deprecated with legacy index types and unnecessary for TSDB. Removed it from the TSDB production example.
- The monitoring examples used outdated or incorrect cache metric names such as `loki_cache_hits_total`, `loki_cache_fetched_keys_total`, `loki_cache_evicted_total`, and `loki_cache_stale_gets_total`. Updated them to current Loki cache metrics: `loki_cache_hits`, `loki_cache_fetched_keys`, `loki_memcache_request_duration_seconds`, and `loki_embeddedcache_evicted_total`.
- The startup warmup example pinned `grafana/loki:2.9.0`, which is outdated relative to the current Loki v3.7.x docs reviewed. Updated it to `grafana/loki:3.7.2`.
- The sizing formula gave an unsupported generic byte estimate for index cache size. Replaced it with observable TSDB index-cache disk sizing guidance based on `/loki/index_cache` usage and chunk-cache working set.

## Review Notes
The post is now technically aligned with current Loki v3.7.x documentation. Some performance targets remain workload-dependent examples rather than guaranteed outcomes.
