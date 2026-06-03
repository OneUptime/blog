# Validation Summary: How to Set Up Thanos Query Frontend for Caching Kubernetes Metric Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Thanos Query Frontend v0.32.0
- Thanos Store Gateway
- Memcached
- Kubernetes Deployments, StatefulSets, Services, and ConfigMaps
- Grafana Prometheus data source provisioning
- Prometheus / PromQL alerting and dashboard queries

## Sources Consulted
- Thanos v0.32 Query Frontend documentation: https://thanos.io/v0.32/components/query-frontend.md/
- Thanos v0.32 Store Gateway documentation: https://thanos.io/v0.32/components/store.md/
- Thanos v0.32.0 container CLI help for `query-frontend` and `store`: `quay.io/thanos/thanos:v0.32.0`
- Thanos v0.32.0 `/metrics` output for Query Frontend cache and frontend metric names
- Memcached 1.6 container help output: `memcached:1.6-alpine`
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post described Query Frontend as providing query queuing and used the non-existent `--query-frontend.max-outstanding-requests` flag. Replaced this with Thanos v0.32.0's valid `--query-range.max-query-parallelism` setting and adjusted the explanation to parallelism limits and retries.
- The cache TTL example used non-existent flags: `--query-frontend.instant-query.cache-ttl` and `--query-frontend.range-query.cache-ttl`. Replaced them with `--query-range.response-cache-max-freshness` and Memcached cache `expiration`, which are supported by Thanos v0.32.0.
- The Store Gateway example included `--index-cache-size=0` while also setting `--index-cache.config-file`. In Thanos v0.32.0, `--index-cache-size` is ignored when an index cache config file is provided, so the redundant line was removed.
- The query splitting example used `--query-range.align-range-with-step=true`. The Thanos v0.32.0 flag is a boolean flag, so it was changed to `--query-range.align-range-with-step`.
- The monitoring, dashboard, and alert examples used incorrect metric names and labels, including `thanos_query_frontend_queries_total{result="hit"}`, `thanos_query_frontend_split_queries_total_bucket`, `thanos_query_frontend_queue_length`, `http_request_duration_seconds_bucket`, and `thanos_memcached_operations_total`. Replaced these with metrics verified from the v0.32.0 Query Frontend `/metrics` output, including `cortex_cache_hits_total`, `cortex_cache_fetched_keys_total`, `thanos_frontend_split_queries_total`, `cortex_query_frontend_retries_count`, `cortex_cache_background_queue_length`, and `thanos_query_frontend_queries_total{op="query_range"}`.
- The "multiple cache layers" example showed an unsupported named cache list. Replaced it with separate supported cache config flags for query range responses and label/series requests.
- The debugging section used `memcached-tool`, which is not present in the shown `memcached:1.6-alpine` image, and suggested grepping for `cache_key` logs that are not a reliable Thanos v0.32.0 debugging path. Replaced these with a Memcached `stats` command using `nc` and a PromQL check for oversized Memcached set skips.
- The post made overly broad performance and Grafana routing claims. Adjusted wording so it states that range queries benefit from the configured caching/splitting and that performance improvements are possible rather than guaranteed.

## Review Notes
The examples are validated against Thanos v0.32.0 because the post pins `quay.io/thanos/thanos:v0.32.0`. Newer Thanos versions may expose additional Query Frontend behavior and flags, so the snippets should be rechecked before updating the image tag.
