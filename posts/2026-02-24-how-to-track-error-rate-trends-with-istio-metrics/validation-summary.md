# Validation Summary: How to Track Error Rate Trends with Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio standard metrics
- Prometheus and PromQL
- Grafana dashboards
- Prometheus Operator `PrometheusRule`
- Kubernetes `kubectl`

## Sources Consulted
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Prometheus PromQL functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Operator project and CRD status: https://github.com/prometheus-operator/prometheus-operator
- Kubernetes deployment rollout documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Grafana heatmap visualization: https://grafana.com/docs/grafana/latest/features/panels/heatmap/

## Issues Found
- The opening metric description said Istio tracks every request through `istio_requests_total` and identifies errors by HTTP response code. Istio documents `istio_requests_total` for HTTP, HTTP/2, and gRPC traffic, but the `response_code` label is an HTTP metric label and gRPC also has `grpc_response_status`. I narrowed the wording to HTTP requests so the article's 4xx/5xx examples are accurate.
- The Kubernetes events command sorted by `.lastTimestamp`, a deprecated event timestamp field. I changed it to `.metadata.creationTimestamp`, which is a stable Kubernetes metadata field and suitable for listing recent events.
- The proxy access log grep assumed JSON access logs containing `response_code`, while Istio's documented default access log format is text. I changed the grep to match either the default text format's `5xx` response-code position or a JSON `response_code` field.

## Review Notes
- The PromQL examples follow the documented `rate()`, `increase()`, `deriv()`, aggregation, binary operator, and subquery syntax. `deriv()` is documented for gauges; applying it to an error-rate expression is reasonable because the expression is gauge-like, even though it is derived from counters.
- The Grafana `$service` examples are valid for single-value variables. If multi-value or "All" is enabled, Grafana's Prometheus docs recommend using regex matchers such as `destination_service_name=~"$service"`.
- `kubectl` and `promtool` were not installed in the local environment, so CLI execution and PromQL parsing were reviewed against official documentation rather than local command output.
