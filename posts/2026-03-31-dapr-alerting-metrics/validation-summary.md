# Validation Summary: How to Set Up Alerting for Dapr Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics, service invocation API)
- Prometheus (PromQL alerting rules, histogram_quantile)
- Prometheus Operator (PrometheusRule CRD)
- Alertmanager (routing, Slack and PagerDuty receivers)
- kube-state-metrics (container status metrics)
- Kubernetes (ConfigMaps, kubectl)

## Sources Consulted
- Dapr Metrics Reference: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Metrics Development Docs: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Prometheus Operator API Reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics Pod Metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Alertmanager Configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found

1. **Wrong label name `status_code` on `dapr_http_server_request_count`**: Dapr uses `status` as the label name, not `status_code`. Fixed in both the standalone alert rules block and the PrometheusRule example. Changed `status_code!~"2.."` to `status!~"2.."`.

2. **Incorrect metric name `dapr_http_server_latency_ms_bucket`**: The correct Dapr metric is `dapr_http_server_latency_bucket` (no `_ms` suffix). The values are in milliseconds but the metric name does not include `_ms`. Fixed to `dapr_http_server_latency_bucket`.

3. **Non-existent metric `dapr_component_state_error_count`**: This metric does not exist in Dapr. The correct approach is to use `dapr_component_state_count` with the `success="false"` label filter. Fixed the expression to `rate(dapr_component_state_count{success="false"}[5m]) > 0` to properly detect state store errors over time.

4. **Deprecated Alertmanager `match` field**: The `match` field in Alertmanager route configuration is deprecated in favor of `matchers`. Updated to use the `matchers` syntax for forward compatibility.

## Review Notes
- The Dapr service invocation API path `http://localhost:3500/v1.0/invoke/<appID>/method/<method>` is correct.
- The `kube_pod_container_status_running{container="daprd"}` metric and expression are valid kube-state-metrics patterns.
- The Prometheus Operator `PrometheusRule` CRD uses the correct `monitoring.coreos.com/v1` API version.
- The Alertmanager receiver configs (slack_configs, pagerduty_configs) use correct field names and structure.
- The Prometheus alerts API endpoint `/api/v1/alerts` is correct.
- The `histogram_quantile` usage with `sum by (le, app_id)` is the correct PromQL pattern for computing percentiles.
