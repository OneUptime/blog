# Validation Summary: How to Use Dapr Metrics for Capacity Planning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar runtime and its Prometheus metrics)
- Prometheus (PromQL queries, HTTP API, `predict_linear`, `max_over_time`, subqueries)
- Kubernetes (container metrics via `container_memory_working_set_bytes`)
- Bash scripting (capacity report automation with `curl` and `jq`)

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr source code for metric definitions: `pkg/diagnostics/component_monitoring.go` in https://github.com/dapr/dapr
- Dapr metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL subquery syntax documentation: https://prometheus.io/docs/prometheus/latest/querying/examples/

## Issues Found

### 1. Incorrect Dapr state store metric names
- **What was wrong:** The post used `dapr_state_get_total` and `dapr_state_set_total` as metric names. These metrics do not exist in Dapr. Dapr uses a single counter `dapr_component_state_count` with an `operation` label (`get`, `set`, `delete`, etc.).
- **What was changed:** Replaced all occurrences of `dapr_state_get_total` with `dapr_component_state_count{operation="get"}` and `dapr_state_set_total` with `dapr_component_state_count{operation="set"}`.
- **Why:** Using non-existent metric names would cause all state store queries to silently return empty results.

### 2. Incorrect Dapr pub/sub metric names
- **What was wrong:** The post used `dapr_pubsub_publish_count` and `dapr_pubsub_subscribe_count`. These metrics do not exist. Dapr uses `dapr_component_pubsub_egress_count` (for published messages) and `dapr_component_pubsub_ingress_count` (for received/subscribed messages).
- **What was changed:** Replaced `dapr_pubsub_publish_count` with `dapr_component_pubsub_egress_count` and `dapr_pubsub_subscribe_count` with `dapr_component_pubsub_ingress_count`.
- **Why:** Using non-existent metric names would cause all pub/sub queries to silently return empty results.

### 3. Incorrect label name `storeName`
- **What was wrong:** The post used `storeName` as a label for grouping state store metrics. The correct Dapr label is `component`.
- **What was changed:** Replaced `by (storeName)` with `by (component)` in all state store queries.
- **Why:** Grouping by a non-existent label would produce unexpected aggregation results.

### 4. Invalid Prometheus API `start` and `end` parameters
- **What was wrong:** The curl command used `start=7d ago` and `end=now` as parameters to the Prometheus `/api/v1/query_range` endpoint. The Prometheus HTTP API does not accept relative time strings — it requires RFC3339 timestamps or Unix epoch seconds.
- **What was changed:** Replaced `'start=7d ago'` with `"start=$(date -d '7 days ago' +%s)"` and `'end=now'` with `"end=$(date +%s)"` to compute Unix timestamps dynamically.
- **Why:** The original curl command would return a 400 Bad Request error.

## Review Notes
- The `dapr_http_server_request_count` metric name is correct and verified against Dapr source code.
- All PromQL syntax (subqueries, `predict_linear`, `max_over_time`, ratio calculations) is syntactically valid.
- The `date -d` flag used in the fixed curl command is GNU coreutils syntax (Linux). On macOS, the equivalent would be `date -v-7d +%s`. This is a minor portability consideration but standard for server-side usage.
- The Four Golden Signals framework referenced in the post aligns with Google's SRE methodology and is correctly applied.
- The `container_memory_working_set_bytes{container="daprd"}` metric is a standard Kubernetes/cAdvisor metric and is correct for monitoring Dapr sidecar memory.
