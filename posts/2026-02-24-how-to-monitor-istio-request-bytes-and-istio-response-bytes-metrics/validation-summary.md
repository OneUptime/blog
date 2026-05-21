# Validation Summary: How to Monitor istio_request_bytes and istio_response_bytes Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Prometheus
- PromQL
- Prometheus Operator PrometheusRule
- Envoy metrics
- Grafana
- Kubernetes YAML

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Envoy Stats configuration and default histogram buckets: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto.html
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Istio proxy source for metric recording behavior: https://github.com/istio/proxy/blob/master/source/extensions/filters/http/istio_stats/istio_stats.cc
- Istio source for Telemetry metric enum mapping: https://github.com/istio/istio/blob/master/pilot/pkg/model/telemetry.go

## Issues Found
- The post said the request and response byte histograms measure the uncompressed HTTP body size. Istio's official metric reference describes these as HTTP request and response body size metrics, without stating they are uncompressed. I removed the unsupported "uncompressed" wording.
- The default bucket boundaries listed in the post did not match Envoy's current default histogram bucket settings. I updated the list to Envoy's documented default boundaries, including the `+Inf` bucket exposed by Prometheus histograms.
- The latency correlation example commented that it showed average response size for slow requests, but the query only filtered successful HTTP 200 responses and did not filter by latency. I changed the comment to "successful requests."
- The compression effectiveness paragraph depended on the unsupported uncompressed-size claim. I changed it to recommend comparing Istio size metrics with application-level uncompressed payload metrics and network metrics.
- The Telemetry API example used `REQUEST_BYTES` and `RESPONSE_BYTES`, which are not valid current Istio metric enum values. I changed them to `REQUEST_SIZE` and `RESPONSE_SIZE`, which map to `istio_request_bytes` and `istio_response_bytes`.

## Review Notes
The PromQL examples use standard Prometheus histogram patterns with `rate()` and `histogram_quantile()` and preserve the `le` label when aggregating classic histogram buckets. The PrometheusRule YAML structure is consistent with the Prometheus Operator API. Future improvements could mention that Istio histogram buckets can be customized via Envoy/Istio proxy stats histogram bucket configuration.
