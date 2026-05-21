# Validation Summary: How to Monitor Error Rates per Service in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh telemetry
- Envoy response flags and access logs
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule` resources
- Grafana dashboards
- Kubernetes `kubectl`

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio Envoy Access Logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- gRPC status codes: https://grpc.io/docs/guides/status-codes/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Operator alerting and recording rules: https://prometheus-operator.dev/docs/developer/alerting/
- Grafana heatmap visualization: https://grafana.com/docs/grafana/latest/features/panels/heatmap/
- Grafana status history visualization: https://grafana.com/docs/grafana/latest/panels/visualizations/status-history/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The response flag queries used `response_flags!=""`, but Istio/Envoy uses `-` to indicate no response flags in standard telemetry/log output. Changed these filters to `response_flags!="-"` so the queries actually isolate responses with Envoy flags.
- The Grafana "Error Heat Map" section recommended the Heatmap panel with service names on the Y-axis. Grafana heatmaps are intended for bucketed distributions; the service-by-time view described in the post matches a Status history panel. Updated the panel recommendation accordingly.
- The Envoy access log grep only matched JSON-formatted logs with a `response_code` field. Istio's default access log format is text, and access logging must be enabled. Updated the text to say "if access logging is enabled" and changed the grep to match default text logs as well as JSON logs.

## Review Notes
- The PromQL examples follow the standard `rate()`-then-aggregate pattern for counters.
- The alert expressions use ratio-valued recording rules, so `humanizePercentage` is appropriate.
- The recording and alerting examples assume the Prometheus Operator `PrometheusRule` CRD is installed and selected by the Prometheus instance's rule selector.
