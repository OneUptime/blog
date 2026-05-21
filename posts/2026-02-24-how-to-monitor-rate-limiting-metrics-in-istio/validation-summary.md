# Validation Summary: How to Monitor Rate Limiting Metrics in Istio

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Istio
- Envoy rate limiting filters
- Prometheus and PromQL
- Grafana dashboards
- Envoy ratelimit service
- Redis and redis_exporter
- Kubernetes manifests and kubectl

## Sources Consulted
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Envoy local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy global rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy ratelimit service documentation: https://github.com/envoyproxy/ratelimit
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- redis_exporter documentation: https://github.com/oliver006/redis_exporter

## Issues Found
- Istio disables the relevant Envoy rate limit statistics by default. Added a `proxyStatsMatcher` annotation example and clarified that metrics appear after the stats are enabled.
- Local rate limit stats used the wrong namespace. Updated examples and PromQL from `http_local_rate_limiter.enabled` / `envoy_http_local_rate_limit_*` to the documented `<stat_prefix>.http_local_rate_limit.*` form and corresponding Prometheus metric names.
- Global rate limit stats used an incomplete namespace. Updated examples and PromQL to use Envoy's documented `cluster.<route target cluster>.ratelimit.<optional stat prefix>.*` namespace and corresponding `envoy_cluster_ratelimit_*` Prometheus metrics.
- The custom Prometheus scrape config built an invalid target address from only the port annotation. Replaced it with Istio's documented Envoy stats scrape pattern that keeps ports ending in `-envoy-prom`.
- The Envoy ratelimit service Prometheus scrape example used debug port 6070. Updated it to the service's documented Prometheus default port 9090 and noted that Prometheus output requires `USE_PROMETHEUS=true`.
- The Redis inspection command used `INFO stats` while also filtering `used_memory`, which is in the memory section. Changed it to `redis-cli info` so all referenced fields are present.
- The redis_exporter example used a bare host:port value. Updated `REDIS_ADDR` to use the documented `redis://` URL format.

## Review Notes
The Grafana JSON is a minimal panel fragment rather than a complete importable dashboard with top-level Grafana metadata. It is technically useful as panel source material, and the post also says the panels can be built manually, so it was left unchanged.
