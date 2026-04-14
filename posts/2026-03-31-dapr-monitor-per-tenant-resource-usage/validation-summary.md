# Validation Summary: How to Monitor Per-Tenant Resource Usage in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar runtime)
- Prometheus (metrics collection and querying)
- Grafana (dashboard visualization)
- Kubernetes (container resource metrics via cAdvisor)
- PromQL (query language)
- Bash scripting (chargeback report generation)

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Metrics Development Reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr component monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go
- Dapr HTTP monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go
- Prometheus Alertmanager rule syntax: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found

### 1. Incorrect state store metric names
- **What was wrong:** The post used `dapr_component_state_get_total` and `dapr_component_state_set_total` as separate metrics. These metrics do not exist in Dapr. The actual metric is `dapr_component_state_count` with an `operation` label that distinguishes between `get`, `set`, `delete`, `query`, `bulk_get`, `bulk_delete`, and `transaction`.
- **What was changed:** Replaced `dapr_component_state_get_total{...component="statestore"}` with `dapr_component_state_count{...component="statestore", operation="get"}` in the example metrics block.
- **Why:** Verified against Dapr source code (`pkg/diagnostics/component_monitoring.go`) which registers `component/state/count` with tag keys `[appIDKey, componentKey, namespaceKey, operationKey, successKey]`.

### 2. Incorrect pub/sub metric name
- **What was wrong:** The post used `dapr_component_pubsub_publish_total`. This metric does not exist. The actual metric for outgoing pub/sub messages is `dapr_component_pubsub_egress_count`.
- **What was changed:** Replaced `dapr_component_pubsub_publish_total{...topic="orders"}` with `dapr_component_pubsub_egress_count{...component="pubsub", topic="orders"}`.
- **Why:** Verified against Dapr source code which registers `component/pubsub_egress/count` with tag keys `[appIDKey, componentKey, namespaceKey, successKey, topicKey]`.

### 3. Incorrect PromQL for state operations
- **What was wrong:** The state operations query added two non-existent metrics: `rate(dapr_component_state_get_total[5m]) + rate(dapr_component_state_set_total[5m])`. This would return no data.
- **What was changed:** Replaced with `rate(dapr_component_state_count{operation=~"get|set"}[5m])`, which correctly uses the real metric with a regex filter on the `operation` label.
- **Why:** Since get and set are tracked as values of the `operation` label on a single metric, a regex selector is the correct approach to filter for these operations.

## Review Notes
- The `namespace` label on `dapr_http_server_request_count` is not natively emitted by Dapr's HTTP metrics instrumentation (which only includes `app_id`, `method`, `path`, `status`). However, in standard Kubernetes + Prometheus deployments, the `namespace` label is added to all scraped metrics via Prometheus relabeling rules (e.g., from `__meta_kubernetes_namespace`). Since the blog targets Kubernetes multi-tenant deployments, the queries referencing `namespace` on HTTP metrics will work in practice. The component metrics (state, pub/sub) do natively include a `namespace` label.
- The Grafana dashboard variable JSON snippet is simplified for illustration and would need to be part of a full dashboard JSON model in practice.
- The chargeback bash script works but is fragile — it will fail if the Prometheus query returns no results (empty result array). This is acceptable for a blog example but should be noted for production use.
