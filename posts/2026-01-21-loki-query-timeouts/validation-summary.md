# Validation Summary: How to Troubleshoot Loki Query Timeouts

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Grafana Loki
- LogQL
- Prometheus and PromQL
- Loki YAML configuration
- Grafana dashboards
- Docker Compose
- Kubernetes HorizontalPodAutoscaler
- JavaScript Fetch API

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki query and LogQL documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki caching documentation: https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki bloom filter documentation: https://grafana.com/docs/loki/latest/operations/bloom-filters/
- Grafana Loki Docker installation documentation: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki v3.7 release notes: https://grafana.com/docs/loki/latest/release-notes/v3-7/
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- Replaced the "Missing indexes" timeout cause with "Broad selectors" because Loki indexes timestamps and labels, and query slowness is usually caused by selectors that cannot narrow index lookups effectively rather than a user-created missing index.
- Fixed the slow-query PromQL examples. The original examples multiplied request counts by a histogram quantile, which does not produce a meaningful latency threshold check. They now compare `histogram_quantile(...)` directly to the latency threshold.
- Corrected Loki configuration snippets so `query_timeout`, `max_query_length`, and `split_queries_by_interval` are shown under `limits_config`, matching the current Loki configuration reference.
- Removed invalid `querier.query_timeout` and `querier.engine.timeout` YAML keys from the timeout example.
- Clarified `frontend.downstream_url` as a downstream Loki URL rather than a frontend timeout.
- Removed the unsupported `cache_results_for_unaligned_queries` setting from the result cache example.
- Corrected the Memcached cache example to put expiration under `memcached` and connection settings under `memcached_client`.
- Replaced the invalid LogQL `| limit 1000` stage with an API query example using the `limit` query parameter.
- Reworked the time-range example to show Grafana `from` and `to` ranges instead of invalid standalone LogQL range selectors.
- Fixed the combined-filter LogQL example so it preserves the intended "contains error, timeout, and database" behavior using substring filters.
- Wrapped `unwrap` examples in `avg_over_time(...)` so they are valid metric queries.
- Updated the Loki Docker image example from `grafana/loki:2.9.4` to `grafana/loki:3.7.0`, matching the current official Docker installation documentation checked during review.
- Updated the bloom filter example to include `bloom_build`, `bloom_gateway.client.addresses`, and the required `limits_config` bloom settings documented by Grafana.

## Review Notes
The post is technically relevant and useful after correction. Bloom filters remain experimental in Loki and are not supported for single-binary deployments, so future revisions could add deployment-mode caveats if the article is expanded.
