# Validation Summary: How to Collect Metrics for TCP Services in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar telemetry
- Istio TCP standard metrics
- Istio protocol selection and Kubernetes Service port naming
- Istio Telemetry API
- Istio DestinationRule connection pools
- Envoy cluster and circuit breaker metrics
- Prometheus and PrometheusRule alerting
- Grafana dashboard concepts

## Sources Consulted
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Collecting Metrics for TCP Services task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy cluster manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy circuit breaking architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said Istio TCP service metrics include connection durations. Istio's standard TCP metrics are opened connections, closed connections, sent bytes, and received bytes, so the sentence was corrected to mention only connection counts and bytes transferred.
- The port-naming section said Istio might parse unnamed TCP traffic as HTTP and generate errors. Istio's current protocol-selection behavior is automatic HTTP/HTTP2 detection with fallback to plain TCP when the protocol cannot be identified, with caveats for server-first protocols. The wording was corrected.
- The protocol-prefix section implied `mysql-`, `mongo-`, and `redis-` always apply protocol-specific handling. Istio documents these as experimental application-protocol handlers that require corresponding environment variables; otherwise they are treated as opaque TCP. The caveat was added.
- The TCP labels section said TCP metrics do not include `request_protocol`. Istio's standard metrics reference lists `request_protocol` as set to the request or connection protocol, while `response_code` is HTTP-only. The statement was corrected.
- The Telemetry API example used `value: "destination.port"` for a custom tag. Istio's Telemetry API expects CEL expressions for tag values and documents `string(destination.port)` for this case, so the example was corrected.

## Review Notes
The Prometheus queries and Kubernetes/Istio YAML examples are syntactically plausible. The Envoy metric examples depend on Envoy stats being scraped and converted to Prometheus labels in the usual Istio/Envoy format.
