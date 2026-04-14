# Validation Summary: How to Monitor Actor Placement Distribution in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, actor framework)
- Prometheus (metrics collection, PromQL queries)
- Grafana (dashboard configuration)
- Kubernetes (kubectl port-forward)

## Sources Consulted
- Dapr metrics overview documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr placement service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr metrics reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr metadata API documentation: https://docs.dapr.io/reference/api/metadata_api/
- Prometheus PromQL documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found

1. **Default metrics port was wrong (9091 → 9090):** The blog stated the placement service exposes metrics on port 9091. The actual default metrics port for all Dapr services is 9090. Fixed the port-forward command and curl command accordingly.

2. **All four key metric names were fabricated:** The blog listed `dapr_placement_actor_count`, `dapr_placement_actor_rebalanced_total`, `dapr_placement_lookup_latency_ms_bucket`, and `dapr_placement_runtime_total`. None of these exist in Dapr. Replaced with actual metrics: `dapr_placement_runtimes_total`, `dapr_placement_actorruntimes_total` (placement service metrics), and `dapr_runtime_actor_activated_total`, `dapr_runtime_actor_deactivated_total`, `dapr_runtime_actor_rebalanced_total` (sidecar actor metrics).

3. **Invalid PromQL syntax:** `dapr_placement_actor_count by (pod)` is invalid — the `by` clause requires an aggregation function. Replaced with `sum by (pod) (increase(...))` using correct metric names.

4. **Wrong actor metric prefix:** The blog used `dapr_actor_activated_total` and `dapr_actor_deactivated_total`. The correct prefix is `dapr_runtime_actor_*`. Fixed all occurrences.

5. **Metadata API response path was wrong:** The blog used `jq '.actors'` but the actual response nests actor data under `.actorRuntime.activeActors`. Fixed the jq command and the example response format.

6. **Misleading section heading:** Changed "Inspecting Placement via Dapr Debug API" to "Inspecting Placement via Dapr Metadata API" since it uses the standard metadata endpoint, not a debug API.

7. **Incorrect code fence language for alert rule:** Changed from `bash` to `yaml` for the Prometheus alerting rule snippet.

8. **Updated all Grafana dashboard and alert expressions** to use the corrected metric names and valid PromQL.

## Review Notes
- The concept of tracking "active actors per pod" as a gauge does not have a direct Dapr metric. The corrected queries use `increase()` on the activation and deactivation counters to approximate this. This is an inherent limitation of the available Dapr metrics and readers should be aware the approximation may drift over long time windows or counter resets.
- The scaling recommendations table (actors per pod thresholds) contains reasonable but arbitrary values that are not sourced from official Dapr documentation. They serve as general guidance.
- The consistent hashing explanation is accurate — Dapr does use a consistent hash ring with virtual nodes for actor placement.
