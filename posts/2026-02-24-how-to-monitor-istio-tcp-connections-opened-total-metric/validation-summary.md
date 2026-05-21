# Validation Summary: How to Monitor istio_tcp_connections_opened_total Metric

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio telemetry metrics
- Envoy proxy statistics
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Kubernetes `kubectl exec`
- Grafana dashboards
- Mermaid diagrams

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Collecting Metrics for TCP Services: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy Cluster Manager Statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Prometheus Alerting Rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API Reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said TCP metrics do not include `request_protocol`. Istio documents `request_protocol` as a standard metric label that can be set to the request or connection protocol, while `response_code` is HTTP-only. Updated the sentence to distinguish HTTP-only labels from labels that may still be present on TCP metrics.
- The post said a small difference between opened and closed counters indicates long-lived connections. The raw difference estimates currently open connections for the matching label set; long-lived pools are better identified by a stable non-zero difference with low open and close rates. Updated the explanation accordingly.
- The debugging command used `curl` inside the `istio-proxy` container. Istio's current documentation recommends `pilot-agent request GET stats`, which avoids relying on `curl` being available in the proxy image. Updated the command.

## Review Notes
The PromQL examples are syntactically plausible and align with Prometheus counter usage. Envoy statistics names and availability can vary with Istio proxy stats matcher configuration, so the Envoy active connection metric should be validated in the target cluster before building long-lived alerts or dashboards around it.
