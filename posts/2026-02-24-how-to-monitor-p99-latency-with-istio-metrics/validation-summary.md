# Validation Summary: How to Monitor P99 Latency with Istio Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Prometheus
- PromQL
- Prometheus Operator PrometheusRule
- Grafana
- Kubernetes YAML

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio metric customization with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio resource annotations, including `sidecar.istio.io/statsHistogramBuckets`: https://istio.io/latest/docs/reference/config/annotations/
- Istio observability best practices: https://istio.io/latest/docs/ops/best-practices/observability/
- Envoy stats configuration reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto.html
- Envoy administration interface Prometheus histogram output: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Prometheus `histogram_quantile()` function: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post listed the default Istio request-duration histogram buckets as starting at `1` and ending at `300000` milliseconds. Istio sidecar metrics use Envoy histogram bucket defaults that include `0.5`, `600000`, `1800000`, and `3600000`, so the bucket list was updated.
- The post showed `proxyStatsMatcher` and an empty Telemetry API override as ways to customize request-duration histogram buckets. `proxyStatsMatcher` controls which Envoy stats are instantiated, and Telemetry metric overrides customize metrics and tags, not bucket boundaries. The examples were replaced with Istio's supported `sidecar.istio.io/statsHistogramBuckets` pod annotation.

## Review Notes
- The PromQL examples correctly preserve the `le` label when aggregating classic histogram buckets for `histogram_quantile()`.
- The recording and alerting examples use valid Prometheus/Prometheus Operator rule structure. In production, teams may want to scope these queries by `reporter`, namespace, or cluster to avoid mixing source and destination reporter perspectives.
