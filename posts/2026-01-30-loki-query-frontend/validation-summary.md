# Validation Summary: How to Create Loki Query Frontend

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- Grafana Loki
- Loki Query Frontend
- Loki Query Scheduler
- Loki queriers
- Loki result caching with embedded cache, Memcached, and Redis
- Kubernetes Deployments, Services, and ConfigMaps
- Prometheus alerting rules

## Sources Consulted
- Grafana Loki current configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki scalability documentation for Query Scheduler: https://grafana.com/docs/loki/latest/operations/scalability/
- Grafana Loki caching documentation: https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki v2.9 configuration reference for comparison with the original pinned image: https://grafana.com/docs/loki/v2.9.x/configure/
- Grafana Loki Docker image help output and `/metrics` output from `grafana/loki:2.9.0` and `grafana/loki:3.7.2`

## Issues Found
- The post used `query_frontend` as a YAML block name. Loki uses `frontend`, so the examples were updated to use `frontend`.
- `split_queries_by_interval` and `max_parallel` were shown under `query_range`. For Loki 2.9, splitting and frontend parallelism limits belong in `limits_config` as `split_queries_by_interval` and `max_query_parallelism`; the examples were corrected.
- `max_queriers_per_user` was not a valid Loki setting. It was replaced with `max_queriers_per_tenant`.
- Unsupported `query_priority` runtime overrides were removed and replaced with supported per-tenant limit overrides.
- The scheduler snippet comment incorrectly described `querier_forget_delay` as DNS discovery. It now describes the disconnected-querier forget delay.
- The post claimed the frontend deduplicates duplicate queries. This was changed to retries, which is supported by the query frontend middleware.
- The post implied all split sub-queries run simultaneously. It now notes that execution is bounded by the configured parallelism limit.
- The monitoring examples used non-existent or incorrect metric names. They were updated to metrics exposed by the checked Loki images, including `cortex_query_scheduler_queue_duration_seconds`, `loki_cache_hits`, `loki_cache_fetched_keys`, `loki_request_duration_seconds_count`, and `cortex_query_frontend_retries`.
- The Kubernetes section called the manifest "complete" even though it only covered the query frontend and assumed existing Loki storage/schema/scheduler/querier configuration. It now describes the manifest as a deployment fragment to merge into an existing Loki configuration.
- The query sharding tip referenced unsupported `query_frontend.shard_queries`. It now references `query_range.parallelise_shardable_queries` and `limits_config.tsdb_max_query_parallelism`.
- The Kubernetes example pinned `grafana/loki:2.9.0`, which is outdated. It was updated to `grafana/loki:3.7.2`, the current release verified during review.

## Review Notes
The corrected snippets were checked against the current Loki documentation and smoke-tested with the Loki 3.7.2 container. Operators should still merge these frontend settings into a full Loki configuration that includes their storage schema and deployment-mode-specific components.
