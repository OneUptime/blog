# Validation Summary: How to Monitor gRPC Metrics with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- gRPC
- Envoy
- Prometheus
- Prometheus Operator
- Grafana
- Kubernetes
- PromQL

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio secure metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio application requirements and proxy ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy gRPC statistics filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_stats_filter.html
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- gRPC status codes documentation: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The post said Istio's default installation includes Prometheus integration in a way that implied Prometheus is deployed by default. Updated the wording to clarify that Istio exposes Prometheus-formatted metrics by default, but Prometheus itself is not installed by default.
- The validation command used `kubectl get servicemonitor -n istio-system`, which only applies when Prometheus Operator ServiceMonitor resources are installed. Replaced it with a check for the sample Prometheus addon pod.
- The sample addon URLs used `release-1.20`, which is outdated for a current 2026 post. Updated Prometheus and Grafana addon URLs to `release-1.29`, matching current Istio documentation.
- The production scrape example used a `ServiceMonitor` for Envoy sidecars. Replaced it with a `PodMonitor`, which is the Prometheus Operator resource intended to select pods directly, and used the Istio sidecar's `http-envoy-prom` port.
- The Grafana section claimed built-in dashboards show gRPC-specific success panels based on `grpc_response_status`. Updated it to say the dashboards include HTTP/gRPC traffic and that custom gRPC error panels should use `grpc_response_status`.
- The Envoy-level stats examples showed per-status-code stat names such as `.grpc.0` and `.grpc.14`. Updated them to documented gRPC stats such as `.grpc.success` and `.grpc.failure`, and clarified that Istio standard metrics should be used for `grpc_response_status` breakdowns.
- The Telemetry API example used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`, which is the current stable API version in Istio documentation.

## Review Notes
The PromQL examples are syntactically valid and use standard Istio metric names and labels. In production, readers should ensure their Prometheus scrape configuration matches their chosen Istio metrics mode: merged metrics on port `15020` or Envoy-only metrics on port `15090`.
