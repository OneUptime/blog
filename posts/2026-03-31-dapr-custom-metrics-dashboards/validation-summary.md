# Validation Summary: How to Create Custom Dapr Metrics Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus (metrics collection and PromQL queries)
- Grafana (dashboard visualization, template variables, provisioning)
- Kubernetes (ConfigMap-based dashboard provisioning)

## Sources Consulted
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) -- authoritative list of all Dapr Prometheus metric names
- [Dapr Metrics Overview (Official Docs)](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) -- metric label names (`app_id`, `method`, `status`)
- [Dapr Grafana Actor Dashboard (GitHub)](https://github.com/dapr/dapr/blob/master/grafana/grafana-actor-dashboard.json) -- confirmed actual PromQL queries used in official dashboards
- [Dapr Grafana Docs](https://docs.dapr.io/operations/observability/metrics/grafana/) -- Grafana integration and provisioning guidance
- [Dapr Prometheus Docs](https://docs.dapr.io/operations/observability/metrics/prometheus/) -- Prometheus scraping configuration

## Issues Found

1. **Wrong HTTP status label name (`status_code` -> `status`)**: The post used `status_code` as the Prometheus label for HTTP response codes (e.g., `{status_code!~"2.."}`). Dapr uses `status` as the label name. Fixed in Fleet Overview and Service Health Heatmap queries.

2. **Non-existent latency histogram metric name (`dapr_http_server_latency_ms_bucket` -> `dapr_http_server_latency_bucket`)**: The post included `_ms` in the histogram bucket metric name. The actual Dapr metric is `dapr_http_server_latency` (Prometheus auto-appends `_bucket`), with no `_ms` suffix. Confirmed by the official Grafana actor dashboard which uses `dapr_http_server_latency_bucket`. Fixed in Row 3.

3. **Non-existent actor metric (`dapr_actor_active_actors` -> `dapr_runtime_actor_pending_actor_calls`)**: The metric `dapr_actor_active_actors` does not exist in Dapr. The comprehensive metrics reference lists no "active actors" gauge. Replaced with `dapr_runtime_actor_pending_actor_calls`, which is the closest real actor metric suitable for a fleet overview (tracks pending calls awaiting per-actor locks). Updated comment accordingly.

4. **Non-existent state store failure metrics (`dapr_component_state_get_failed_total` / `dapr_component_state_set_failed_total` -> `dapr_component_state_count{status="fail"}`)**: Dapr does not expose separate per-operation failure counters for state stores. The actual metric is `dapr_component_state_count` with a `status` label. To query failures, filter with `{status="fail"}`. Fixed in Row 4.

5. **Non-existent pub/sub drop metric (`dapr_component_pubsub_drop_count` -> `dapr_component_pubsub_ingress_count{status!="success"}`)**: The metric `dapr_component_pubsub_drop_count` does not exist. Dapr exposes `dapr_component_pubsub_ingress_count` and `dapr_component_pubsub_egress_count` with status labels. Replaced with `dapr_component_pubsub_ingress_count{status!="success"}` to capture failed message ingestion. Updated comment from "Pub/sub drops" to "Pub/sub failures".

## Review Notes
- The Grafana dashboard JSON structure (templating variables, ConfigMap provisioning with `grafana_dashboard: "1"` label) is correct and follows standard practices.
- The PromQL patterns (rate, sum by, count, histogram usage) are syntactically correct.
- The `label_values()` function calls in the template variables are valid Grafana/Prometheus syntax.
- The Kubernetes ConfigMap approach for dashboard provisioning is accurate -- Grafana's sidecar container watches for ConfigMaps with the specified label.
- The post would benefit from noting the Dapr version it targets, as metric names could change in future releases.
