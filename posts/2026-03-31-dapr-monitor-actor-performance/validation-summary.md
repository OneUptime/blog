# Validation Summary: How to Monitor Actor Performance in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (actor runtime, sidecar metrics)
- Prometheus (scrape configuration, alerting rules)
- Grafana (dashboard PromQL queries)
- Kubernetes (pod annotations)
- Distributed tracing (Zipkin/Jaeger)

## Sources Consulted
- Dapr metrics overview documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus integration documentation: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics reference (GitHub source of truth): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr actor metrics source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/service_monitoring.go
- Dapr release-1.7 metrics reference (for historical comparison): https://github.com/dapr/dapr/blob/release-1.7/docs/development/dapr-metrics.md

## Issues Found

### 1. All actor metric names used wrong prefix
**What was wrong:** The post used `dapr_actor_` as the metric prefix throughout (e.g., `dapr_actor_active_actors`, `dapr_actor_activations_total`). Dapr actor metrics use the `dapr_runtime_actor_` prefix.
**What was changed:** Updated all metric references to use the correct `dapr_runtime_actor_` prefix.

### 2. `dapr_actor_active_actors` metric does not exist
**What was wrong:** The post referenced `dapr_actor_active_actors` as a gauge for tracking active actor count. This metric does not exist in Dapr. The official Dapr actor metrics include `dapr_runtime_actor_pending_actor_calls` (gauge for pending calls awaiting per-actor lock) but no "active actors count" gauge.
**What was changed:** Replaced with `dapr_runtime_actor_pending_actor_calls` and updated the description to accurately reflect what this metric measures (lock contention, not active actor count). Updated all PromQL queries and alerts that referenced this metric.

### 3. `dapr_actor_method_duration_bucket` metric does not exist
**What was wrong:** The post referenced `dapr_actor_method_duration_bucket` as a histogram for actor method latency. Dapr does not expose an actor-method-specific latency histogram. Actor method invocations are tracked through general HTTP/gRPC server metrics.
**What was changed:** Replaced with `dapr_http_server_latency_bucket` with appropriate path filtering for actor API endpoints. Added a note about configuring `http.pathMatching` for path label cardinality control. Updated related PromQL queries and alerts.

### 4. `dapr_actor_activations_total` metric does not exist
**What was wrong:** The post referenced `dapr_actor_activations_total` for tracking actor activation rate. While `dapr_runtime_actor_activated_total` existed in Dapr 1.7, it was removed in later versions and is not present in current Dapr.
**What was changed:** Removed the activation counter reference. Replaced the "Activation and Deactivation Rate" section with "Deactivation Rate and Pending Calls" using `dapr_runtime_actor_deactivated_total` and `dapr_runtime_actor_pending_actor_calls`, which are the actual metrics available for detecting actor accumulation.

### 5. `dapr_actor_deactivations_total` had wrong metric name
**What was wrong:** The post used `dapr_actor_deactivations_total`. The correct metric name is `dapr_runtime_actor_deactivated_total` (note: `deactivated` not `deactivations`, and `dapr_runtime_actor_` prefix).
**What was changed:** Corrected to `dapr_runtime_actor_deactivated_total`.

### 6. Incorrect labels on actor metrics
**What was wrong:** The post included `namespace="default"` and `method="Increment"` as labels on actor-specific metrics. According to the Dapr source code (`service_monitoring.go`), actor metrics only have `app_id` and `actor_type` labels (plus `operation`, `fail_reason`, or `success` on specific counters). There is no `namespace` or `method` label.
**What was changed:** Removed non-existent labels from metric examples.

### 7. Alert rule incorrectly labeled as "alertmanager rule"
**What was wrong:** The YAML comment said `# alertmanager rule` but these are Prometheus alerting rules, not Alertmanager configuration. Alertmanager handles notification routing, not rule evaluation.
**What was changed:** Corrected comment to `# prometheus alerting rule`.

### 8. grep command used wrong metric prefix
**What was wrong:** The verification command used `grep dapr_actor` which wouldn't match actual Dapr actor metrics.
**What was changed:** Updated to `grep dapr_runtime_actor`.

## Review Notes
- The alert threshold for pending actor calls was changed from 10000 to 100. The original threshold was for a non-existent "active actors" gauge; for `pending_actor_calls` (which tracks lock contention), 100 pending calls is already a significant indicator of problems. The appropriate threshold will vary by workload.
- The `dapr_http_server_latency` metric is assumed to report in milliseconds based on Dapr's OpenTelemetry conventions, so the latency alert threshold was changed from `> 1.0` to `> 1000`.
- The `dapr.actor` span tag reference for distributed tracing was left as-is. Dapr does add actor-related attributes to traces, though the exact attribute names may vary by version.
- The Prometheus scrape configuration and Kubernetes annotations sections were verified as correct.
- Future Dapr versions may add more actor-specific metrics. The metrics referenced in this corrected version are based on the current Dapr master branch as of the review date.
