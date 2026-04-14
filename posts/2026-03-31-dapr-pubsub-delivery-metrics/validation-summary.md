# Validation Summary: How to Monitor Dapr Pub/Sub Message Delivery Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub component metrics)
- Prometheus (PromQL queries)
- Prometheus Alertmanager (alert rule YAML format)

## Sources Consulted
- Dapr source code: `pkg/diagnostics/component_monitoring.go` on GitHub (master branch) — defines all pub/sub metric names, types, and labels
- Dapr metrics documentation: `docs/development/dapr-metrics.md` on GitHub — official metric name reference

## Issues Found

### 1. Three fabricated metric names (non-existent separate counters)
**What was wrong:** The post listed `dapr_component_pubsub_egress_fail_count`, `dapr_component_pubsub_ingress_fail_count`, and `dapr_component_pubsub_drop_count` as separate metrics. These do not exist in Dapr. Dapr does not emit separate failure/drop counter metrics.

**What was changed:** Replaced with label-based selectors on the real metrics:
- `dapr_component_pubsub_egress_count{success="false"}` for publish failures (the `success` label is `"true"` or `"false"`)
- `dapr_component_pubsub_ingress_count{process_status!="success"}` for processing failures
- `dapr_component_pubsub_ingress_count{process_status="drop"}` for dropped messages

**Why:** Dapr tracks success/failure/drop status via labels on the base count metrics, not as separate metric names.

### 2. Incorrect `_ms` suffix on latency metric names
**What was wrong:** The post used `dapr_component_pubsub_egress_latencies_ms` and `dapr_component_pubsub_ingress_latencies_ms`. The actual metric names are `dapr_component_pubsub_egress_latencies` and `dapr_component_pubsub_ingress_latencies` (no `_ms` suffix). The unit is milliseconds but this is not encoded in the metric name.

**What was changed:** Removed `_ms` from all latency metric references including the histogram bucket/sum/count sub-metrics used in PromQL queries.

**Why:** Using incorrect metric names would cause all latency queries and alerts to return no data.

### 3. Updated metric overview section
**What was wrong:** The overview listed 7 separate metrics (including the non-existent ones). 

**What was changed:** Consolidated to the 4 actual Dapr pub/sub metrics (`egress_count`, `egress_latencies`, `ingress_count`, `ingress_latencies`) and noted the relevant labels (`success` for egress, `process_status` for ingress).

## Review Notes
- The PromQL query patterns and alert rule YAML structure are correct and follow Prometheus best practices.
- The `deriv()` approach for approximating consumer lag is a reasonable technique and is correctly documented as an approximation.
- The advice to instrument the message broker separately for direct consumer lag is sound.
- All 8 PromQL queries and 3 alert rules were updated to use the correct metric names and label selectors.
