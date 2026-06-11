# Validation Summary: How to Implement Loki Results Cache

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki query frontend and query scheduler
- Memcached
- Redis
- Prometheus alerting and PromQL
- Grafana dashboards

## Sources Consulted
- Grafana Loki documentation: Configure caches to speed up queries - https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki documentation: Configuration parameters - https://grafana.com/docs/loki/latest/configure/
- Grafana Loki documentation: Components, query frontend caching - https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki source code cache instrumentation - https://github.com/grafana/loki/blob/main/pkg/storage/chunk/cache/instrumented.go
- Grafana Loki source code cache type names - https://github.com/grafana/loki/blob/main/pkg/logqlmodel/stats/context.go

## Issues Found
- The post described results caching as storing the computed output of all LogQL queries. Updated it to match Loki docs: metric and supported metadata query responses are cached, while log queries use negative caching for empty quantized ranges.
- The post described the index cache as a general current cache. Updated the wording to clarify that the index lookup cache is legacy BoltDB-specific and TSDB uses a different model.
- The results cache compression options listed unsupported values such as lz4 and gzip. Updated the examples to state that current results cache compression supports `snappy` or an empty value to disable compression.
- The first and complete configuration examples placed `split_queries_by_interval` and `parallelism` under `query_range`. Updated these to use documented `limits_config.split_queries_by_interval` and `limits_config.max_query_parallelism`.
- Removed the unsupported `limits_config.results_cache_ttl` example. Cache TTL is configured through cache backend validity/expiration settings such as `default_validity`.
- The post claimed Loki normalizes LogQL query strings enough that whitespace variants produce the same cache key. Replaced this with guidance to keep dashboard query strings consistent.
- The dashboard time range examples used invalid LogQL syntax for `now-...:now`. Replaced them with Grafana-style `from` and `to` examples.
- The PromQL cache metrics used a non-existent `cache="results"` label and referenced non-existent miss and stored byte metrics. Updated the examples to use Loki cache metric labels exposed by the cache instrumentation, including `name=~"frontend.*"`, `method=~"frontend.*"`, `loki_cache_hits_total`, `loki_cache_fetched_keys_total`, `loki_cache_request_duration_seconds_bucket`, and `loki_cache_value_size_bytes_bucket`.
- Updated comments for `frontend.compress_responses` to clarify that it compresses HTTP responses, not cached storage.

## Review Notes
The examples are aligned with current Loki documentation as of June 11, 2026. Deployments using older Loki versions may still have different cache defaults or deprecated FIFO cache settings, so operators should confirm against their deployed Loki version with `-print-config-stderr`.
