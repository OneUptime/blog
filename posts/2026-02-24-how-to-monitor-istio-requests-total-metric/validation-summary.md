# Validation Summary: How to Monitor istio_requests_total Metric

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
- Kubernetes custom resources

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Envoy access log usage and response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage

## Issues Found
- The post described `istio_requests_total` as sidecar-only. Istio documentation describes it as a counter incremented for every request handled by an Istio proxy, so the wording was changed to include Istio proxies more generally.
- The post implied every request always creates exactly two data points. Istio's `reporter` label can be `source` for a client proxy or gateway and `destination` for a server proxy, so the wording was narrowed to sidecar-to-sidecar traffic commonly producing both source and destination series.
- The post listed `"tcp"` as a `request_protocol` value for `istio_requests_total`. Current Istio docs define `istio_requests_total` for HTTP, HTTP/2, and gRPC traffic, with TCP covered by separate Istio TCP metrics, so the TCP reference was removed.
- The sample included `grpc_response_status=""` for a non-gRPC HTTP metric and described the label as empty for non-gRPC requests. Istio documents this label as present only on gRPC metrics, so the sample and description were corrected.
- The `connection_security_policy` description listed only `"mutual_tls"` and `"none"`. Current Istio docs explicitly describe `"mutual_tls"` for secured destination reports and `"unknown"` for source reports, so the description was updated.

## Review Notes
The PromQL examples and PrometheusRule structure are syntactically consistent with Prometheus and Prometheus Operator documentation. `promtool` was not installed locally, so rule validation was reviewed against official syntax and API documentation rather than executed with `promtool`.
