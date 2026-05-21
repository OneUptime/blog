# Validation Summary: How to Set Up Request Duration Histogram in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy sidecars
- Prometheus
- PromQL
- Grafana
- Kubernetes
- Prometheus Operator alerting rules

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The post listed `request method` as a default Istio metric label. Istio's documented standard labels include `request_protocol`, not `request_method`, so this was changed to request protocol.
- The default request duration bucket list was incomplete. Updated it to the current Istio default bucket list documented for `sidecar.istio.io/statsHistogramBuckets`.
- The Prometheus and Grafana sample addon URLs used Istio `release-1.20`, which is outdated. Updated both to `release-1.30`, matching the current Istio integration documentation.
- The bucket customization examples were incorrect. The Telemetry API example removed a tag, `proxyStatsMatcher` controls which Envoy stats are emitted, and the EnvoyFilter example did not customize histogram buckets. Replaced them with the supported `sidecar.istio.io/statsHistogramBuckets` pod annotation and clarified that Telemetry API is for metric dimensions, not bucket boundaries.
- The explanation of `reporter="destination"` overstated that it directly measures service processing time. Reworded it as the server-side view after the request reaches the destination proxy.
- The alerting example used `PrometheusRule` without noting that this CRD comes from Prometheus Operator. Added that prerequisite context.
- The client-vs-server latency explanation was too definitive. Reworded it to say a larger client-side value can point to network, proxy, retry, or other client-side effects.
- The summary mentioned breaking down by method even though method is not a default Istio label. Changed it to protocol.

## Review Notes
The PromQL examples use the correct classic histogram pattern: `histogram_quantile()` over `sum(rate(..._bucket[5m])) by (le, ...)`, retaining the required `le` label. The `sidecar.istio.io/statsHistogramBuckets` annotation is currently documented as Alpha, so users should validate it against their deployed Istio version before relying on it in production.
