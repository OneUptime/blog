# Validation Summary: How to Implement Tempo Query Frontend

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Grafana Tempo (distributed tracing backend)
- Tempo Query Frontend component
- TraceQL query language
- Redis and Memcached (cache backends)
- Kubernetes / Helm chart deployment
- Prometheus alerting rules
- OTLP receiver (gRPC + HTTP)
- S3 object storage backend
- Parquet block format (vParquet4)

## Sources Consulted
- [Grafana Tempo Configuration Reference](https://grafana.com/docs/tempo/latest/configuration/)
- [Tempo configuration source on main branch](https://raw.githubusercontent.com/grafana/tempo/main/docs/sources/tempo/configuration/_index.md)
- [Improve performance with caching | Grafana Tempo documentation](https://grafana.com/docs/tempo/latest/operations/caching/)
- [Tune search performance | Grafana Tempo documentation](https://grafana.com/docs/tempo/latest/operations/backend_search/)
- [Monolithic and microservices modes | Grafana Tempo documentation](https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/plan/deployment-modes/)
- [Tempo v2.5.0 release notes (trace-by-ID hedging removal)](https://github.com/grafana/tempo/releases/tag/v2.5.0)
- [Tempo v2.8.0 release notes (serverless / prefer_self removal)](https://github.com/grafana/tempo/releases/tag/v2.8.0)
- [Grafana Tempo 2.4 release: tiered caching announcement](https://grafana.com/blog/grafana-tempo-2-4-release-traceql-metrics-tiered-caching-and-tco-improvements/)
- [tempo/modules/overrides/config.go (nested overrides struct)](https://raw.githubusercontent.com/grafana/tempo/main/modules/overrides/config.go)

## Issues Found

The post contained a number of configuration fields that were either invalid, removed in recent Tempo releases, or structured incorrectly. Each was corrected as follows:

1. **`query_frontend.search.cache_results: true` and inline `cache:` sub-blocks** (Basic, Sharding, Caching, TraceQL, and Production sections)
   - **Wrong:** Caching was configured by nesting `cache_results: true` and an inline `cache:` block (with `redis:` / `memcached:`) under both `query_frontend.search` and `query_frontend.trace_by_id`. This API no longer exists.
   - **Fix:** Replaced with the modern top-level `cache:` block that contains a `caches:` list, each entry having a `roles:` array. Valid roles include `bloom`, `parquet-footer`, `parquet-page`, `parquet-column-idx`, `parquet-offset-idx`, `trace-id-index`, and `frontend-search`.

2. **`query_frontend.trace_by_id.hedge_requests_at` and `hedge_requests_up_to`** (Sharding section + Production config)
   - **Wrong:** Trace-by-ID hedging was removed in Tempo v2.5.0 (called out as an anti-pattern in the release notes).
   - **Fix:** Removed both fields. Added `concurrent_shards` (which is valid for `trace_by_id`) as a more useful sharding tunable.

3. **`query_frontend.search.enable_streaming: true`** (TraceQL section)
   - **Wrong:** Not a valid configuration field under `query_frontend.search`.
   - **Fix:** Removed. Added `default_spans_per_span_set` and `max_query_expression_size_bytes` as legitimate TraceQL-related tunables.

4. **`query_frontend.search.sharder` sub-block with `max_shards` and `query_backend_after`** (Sharding section + Production config)
   - **Wrong:** No `sharder` sub-block exists under `query_frontend.search`. `query_backend_after` is a direct field of `search`, not of a nested `sharder`.
   - **Fix:** Removed the `sharder:` block and kept `query_backend_after` at the correct level.

5. **`query_frontend.search.query_ingesters_until`** (Basic, Sharding, TraceQL sections + Production config)
   - **Wrong:** This field was removed from `query_frontend.search` in favor of using `query_backend_after` alone to govern the ingester/backend boundary.
   - **Fix:** Removed every occurrence; kept `query_backend_after` which is the current single source of truth.

6. **`target: scalable-single-binary`** (Production config)
   - **Wrong:** The `scalable-single-binary` target was removed in Tempo 3.0 and is being phased out. The Tempo docs explicitly recommend `all` for single-binary deployments.
   - **Fix:** Changed to `target: all`.

7. **`querier.search.prefer_self: 10`** (Production config)
   - **Wrong:** `prefer_self` was a serverless-related setting; serverless features were deprecated in Tempo 2.7 and fully removed in 2.8, taking `prefer_self` with them.
   - **Fix:** Removed the `querier.search` sub-block entirely (it had no other valid fields in the example).

8. **`storage.trace.block.v2_index_downsample_bytes` and `v2_encoding: zstd`** (Production config)
   - **Wrong:** These are legacy v2-format block settings that no longer apply to the default `vParquet*` block formats. Showing them as recommended production settings is misleading.
   - **Fix:** Replaced with `version: vParquet4`, which is the current production-recommended block format.

9. **Flat `overrides.defaults.*` structure** (Production config)
   - **Wrong:** The post placed `ingestion_rate_limit_bytes`, `ingestion_burst_size_bytes`, `max_traces_per_user`, and `max_search_duration` directly under `overrides.defaults`. The current Tempo overrides struct groups these under nested `ingestion:` and `read:` sub-blocks.
   - **Fix:** Restructured to `overrides.defaults.ingestion.{rate_limit_bytes, burst_size_bytes, max_traces_per_user}` and `overrides.defaults.read.max_search_duration`.

10. **Performance Tuning Tips: "Use hedged requests"** (Tuning section)
    - **Wrong:** Recommended enabling trace-by-ID hedged requests, but the underlying configuration was removed in v2.5.0.
    - **Fix:** Replaced the bullet with guidance on assigning cache roles thoughtfully (low-level caches see ~90% hit rates; frontend-search hits only on repeated queries — per the official caching guide).

11. **Memcached `addresses:` field name** (Memcached cache section)
    - **Wrong:** Used `addresses:` for the memcached cluster.
    - **Fix:** Changed to `host:` which is the field name used in the current Tempo memcached client configuration.

## Review Notes

- The Mermaid architecture and sequence diagrams are conceptually accurate and were left unchanged. They correctly depict the role of the Query Frontend, Scheduler, Queriers, Ingesters, and object storage.
- Prometheus metric names (`tempo_query_frontend_request_duration_seconds_bucket`, `tempo_query_frontend_queue_length`, `tempo_query_frontend_cache_*`) were left as-is; these are plausible Tempo metric names. Readers should still validate the exact metric names exposed by their Tempo version before deploying the alerting rules.
- The Helm chart `values.yaml` snippet uses generic field names (`queryFrontend`, `querier`, `redis`) that match the structure of the official `tempo-distributed` Helm chart. It is a reasonable illustrative example, not a chart-version-pinned reference.
- The post uses `tag: latest` for the container image, which is not best practice for production. The author's tone is illustrative rather than prescriptive here, so this was left alone.
- Tempo is undergoing larger architectural changes in 3.0 (renaming `ingester` to `live_store`, replacing `compactor` with `backend_scheduler`/`backend_worker`, removing v2 block formats). The post targets the 2.8-era configuration that is currently shipping; readers upgrading to 3.0+ will need to revisit ingester/compactor block names.
