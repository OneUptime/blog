# Validation Summary: How to Set Up Latency Percentile Monitoring in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio telemetry and standard metrics
- Envoy Prometheus histogram metrics
- Prometheus and PromQL
- Grafana dashboards
- Prometheus Operator alerting rules
- Kubernetes workload annotations

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Resource Annotations, including `sidecar.istio.io/statsHistogramBuckets`: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics and metrics scraping documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Prometheus histogram best practices and `histogram_quantile`: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana Prometheus `$__rate_interval` documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The default histogram bucket list was incomplete. Updated it to the bucket boundaries documented by Istio's `sidecar.istio.io/statsHistogramBuckets` annotation.
- The Telemetry API examples used `telemetry.istio.io/v1alpha1`. Updated them to `telemetry.istio.io/v1`, matching the current Istio documentation.
- The post incorrectly said histogram buckets can be customized with the Telemetry API. Clarified that Telemetry customizes metric generation and dimensions, then replaced the ineffective example with the documented `sidecar.istio.io/statsHistogramBuckets` pod-template annotation for bucket boundaries.
- The mesh `proxyStatsMatcher` example was not a bucket customization mechanism. Replaced it with the Istio histogram bucket annotation.
- The post labeled `request_protocol` as HTTP method. Changed the text and heading to request protocol.
- The client-vs-server latency section described subtracting quantiles as exact network time. Clarified that it is an approximate signal for extra client-side, proxy, or network overhead, not an exact per-request network latency measurement.
- The same section mentioned DNS resolution delays as a likely interpretation of that delta. Removed that claim because Istio proxy request duration metrics do not generally measure application-side DNS lookup time before the request reaches the proxy.

## Review Notes
The PromQL percentile queries preserve the required `le` label during aggregation and are consistent with Prometheus histogram guidance. The `PrometheusRule` example uses the current Prometheus Operator API shape. The histogram bucket annotation is documented by Istio as alpha, so future Istio upgrades should re-check that annotation before relying on it in production documentation.
