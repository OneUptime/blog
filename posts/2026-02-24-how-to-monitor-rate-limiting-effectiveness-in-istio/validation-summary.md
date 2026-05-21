# Validation Summary: How to Monitor Rate Limiting Effectiveness in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy local rate limit filter
- Envoy global rate limit filter
- Prometheus / PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards
- Kubernetes / kubectl
- Redis

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Envoy statistics configuration: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy HTTP rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy HTTP local rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface statistics endpoint: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
- The post said Envoy rate limit stats are automatically available with standard Istio monitoring. Istio scrapes proxy metrics, but many Envoy stats are disabled by default, including rate-limit-specific stats unless matched by `proxyStatsMatcher`. Added that caveat and the relevant matcher patterns.
- The stat-check command only grepped for `ratelimit`, which would miss local rate limit stats containing `rate_limit`. Updated it to match both forms.
- The global rate limit raw stat examples used `ratelimit.my-domain.*`, which does not match Envoy's HTTP rate limit filter stat namespace. Updated the examples to `cluster.<route_target_cluster>.ratelimit.*` and kept rate limit service upstream stats under the service cluster namespace.
- The rate limit service health queries selected only a fixed cluster name and did not include timeout failures. Updated the examples to match common rate limit service cluster names and include `envoy_cluster_upstream_rq_timeout`.
- The post used `ratelimit_failure_mode_allowed_total`, which is not the Envoy Prometheus metric for the HTTP rate limit filter's `failure_mode_allowed` counter. Replaced it with a PromQL `__name__` matcher that covers Envoy's exported `envoy_cluster...ratelimit_failure_mode_allowed` form.

## Review Notes
Envoy metric labels and extracted metric names can vary by Envoy/Istio build and stats tag extraction settings. The post now uses safer patterns, but operators should still confirm the exact scraped metric names in their Prometheus before wiring alerts to production.
