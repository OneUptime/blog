# Validation Summary: How to Monitor Dapr Component Health with Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus metrics and PromQL
- Grafana dashboards
- Kubernetes (kubectl)
- YAML-based Prometheus alert rules

## Sources Consulted
- Dapr source code: `pkg/diagnostics/component_monitoring.go` for actual metric definitions
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr development metrics reference: `docs/development/dapr-metrics.md` in the Dapr GitHub repository

## Issues Found

### 1. All state store metric names were fabricated
- **Wrong**: `dapr_component_state_get_failed_total`, `dapr_component_state_set_failed_total`, `dapr_component_state_get_latencies_ms_bucket`, `dapr_component_state_get_total`
- **Correct**: Dapr uses a single counter `dapr_component_state_count` with `operation` label (get, set, delete, etc.) and `success` label (true/false), plus `dapr_component_state_latencies` for the histogram. There are no separate per-operation metrics or `_failed_total` suffixes.
- **Fix**: Rewrote all state store PromQL queries to use `dapr_component_state_count` with appropriate label selectors and `dapr_component_state_latencies_bucket` for histograms.

### 2. All pub/sub metric names were incorrect (except `dapr_component_pubsub_egress_count`)
- **Wrong**: `dapr_component_pubsub_egress_fail_count`, `dapr_component_pubsub_ingress_fail_count`, `dapr_component_pubsub_drop_count`, `dapr_component_pubsub_ingress_latencies_ms_bucket`
- **Correct**: Dapr uses `dapr_component_pubsub_egress_count` with `success` label and `dapr_component_pubsub_ingress_count` with `status`/`process_status` labels. There is no separate `_drop_count` metric — drops are tracked via `status="drop"` on the ingress counter. Histogram is `dapr_component_pubsub_ingress_latencies` (no `_ms` in the name).
- **Fix**: Rewrote all pub/sub PromQL queries to use correct metric names with label selectors. Removed the non-existent drop count metric and replaced with `ingress_count{status="drop"}`.

### 3. All binding metric names were incorrect
- **Wrong**: `dapr_component_bindings_output_failed_total`, `dapr_component_bindings_output_latency_ms_bucket`
- **Correct**: Dapr uses `dapr_component_output_binding_count` (singular `binding`, different word order) with `success` label, and `dapr_component_output_binding_latencies` for the histogram. Also distinguishes between `input_binding` and `output_binding`.
- **Fix**: Rewrote binding queries to use `dapr_component_output_binding_count{success="false"}` and `dapr_component_output_binding_latencies_bucket`.

### 4. Incorrect label names claimed
- **Wrong**: Post claimed metrics use `component_type` and `component_name` labels.
- **Correct**: The actual labels are `app_id`, `component`, `namespace`, `operation`, `success`, `topic`, `status`, and `process_status`. There is no `component_type` or `component_name` label.
- **Fix**: Updated the Component Metric Categories section to list the correct labels.

### 5. Misleading health API description
- **Wrong**: Post described `curl http://localhost:3500/v1.0/healthz` as "Check all component health", implying per-component health details.
- **Correct**: The `/v1.0/healthz` endpoint is a binary sidecar health check (204 or 500) that confirms components are initialized but does not provide per-component details. Also added the `/v1.0/healthz/outbound` endpoint which checks component readiness without requiring the app channel.
- **Fix**: Clarified the health API description, added the `/v1.0/healthz/outbound` endpoint, and noted that these are binary checks.

### 6. Incorrect Grafana dashboard query
- **Wrong**: Used fabricated metric names and a non-existent `component_type` label in the Grafana query.
- **Correct**: Updated to use `dapr_component_state_count{success="false"}` grouped by `component`.
- **Fix**: Rewrote the Grafana query with correct metric names and labels.

### 7. Alert rules used fabricated metric names
- All three alert rules used incorrect metric names that matched the fabricated metrics above.
- **Fix**: Rewrote all alert expressions to use correct metric names with proper label selectors. Renamed `DaprPubSubDropping` alert to `DaprPubSubIngressDrops` to match the corrected metric approach.

## Review Notes
- The `_ms` suffix that appeared in several histogram metric names (e.g., `_latencies_ms_bucket`) is not part of Dapr's metric naming. Dapr names histograms as `_latencies` and Prometheus automatically adds `_bucket` for histogram exposition.
- The post's concept of "secret store: implicit via error counts" in the metric categories is vague. Dapr does have `dapr_component_secret_count` and `dapr_component_secret_latencies` metrics, but these were not elaborated in the post. This was left as-is since adding new content was out of scope.
- The pub/sub `status` label values (e.g., "drop") should be verified against the specific Dapr version in use, as label values may evolve across releases.
