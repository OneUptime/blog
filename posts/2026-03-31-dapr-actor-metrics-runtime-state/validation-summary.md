# Validation Summary: How to Monitor Dapr Actor Metrics and Runtime State

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — actor framework and sidecar metrics
- Prometheus — metrics scraping and PromQL queries
- Grafana — dashboard visualization
- Kubernetes — deployment annotations and service discovery
- Mermaid — architecture diagrams

## Sources Consulted
- Dapr CLI reference (`dapr run` flags): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata-api/
- Dapr source code (`pkg/diagnostics/service_monitoring.go`) for actual metric names and labels

## Issues Found

1. **All Prometheus metric names used incorrect prefix**: Every metric in the post used a `dapr_actor_` prefix, but the actual Dapr runtime actor metrics use the `dapr_runtime_actor_` prefix. All metric names were corrected throughout the post (PromQL queries, reference table, Grafana panels, alerting rules).

2. **Fabricated metrics that do not exist in Dapr**:
   - `dapr_actor_active_actors` — no such metric exists. Replaced with `dapr_runtime_actor_pending_actor_calls` (Gauge), which tracks pending actor calls.
   - `dapr_actor_method_total` — no actor-method-level counter exists in Dapr. Replaced with `dapr_runtime_actor_deactivated_total` and `dapr_runtime_actor_rebalanced_total`.
   - `dapr_actor_method_duration_milliseconds` — no actor-method-level histogram exists in Dapr. Removed entirely.
   - `dapr_actor_state_transaction_commit_total` — no such metric exists. Replaced section with `dapr_runtime_actor_status_report_total` and `dapr_runtime_actor_status_report_fail_total`.

3. **`--enable-metrics` flag does not exist on `dapr run`**: This flag is only available on the `daprd` binary directly, not through the Dapr CLI. Removed from the `dapr run` example command. Metrics are enabled by default.

4. **Incorrect timer/reminder metric names and types**:
   - `dapr_actor_timers_total` was listed as a Counter but the real metric `dapr_runtime_actor_timers` is a Gauge (active timers count). Fixed.
   - `dapr_actor_reminders_total` was listed as a Counter but the real metric `dapr_runtime_actor_reminders` is a Gauge (active reminders count). Fixed.
   - `dapr_actor_reminder_total` (singular) does not exist. The real metric for reminder fires is `dapr_runtime_actor_reminders_fired_total`. Fixed.

5. **Mermaid diagram had incorrect scrape direction**: The arrow showed `Sidecar -->|scrape /metrics| Prometheus`, implying the sidecar scrapes Prometheus. Fixed to `Prometheus -->|scrape /metrics| Sidecar` since Prometheus initiates the scrape.

6. **Prometheus relabel config bug**: The relabel rule for replacing the target address used only the port annotation as the source, which would produce an invalid address (e.g., `9090:9090`). Fixed to use the standard pattern that combines `__address__` with the port annotation: `regex: ([^:]+)(?::\d+)?;(\d+)` with `replacement: $1:$2`.

7. **Alerting rule description inaccuracy**: The `HighActorErrorRate` alert description claimed "> 10%" but the expression computed an absolute rate (events/second), not a percentage. Replaced entirely with alerts using real metrics (`dapr_runtime_actor_deactivated_failed_total` and `dapr_runtime_actor_reminders_fired_total{success="false"}`), with accurate descriptions.

8. **Overview and Description text referenced non-existent capabilities**: References to "method invocation rates" and "method call rates" were corrected to reflect actual available metrics (pending actor calls, timer/reminder counts, deactivation metrics).

## Review Notes
- Dapr does not expose actor-method-level metrics (invocation count or latency histogram) as dedicated Prometheus metrics. Actor method calls are only observable at the HTTP/gRPC transport level via general `dapr_http_*` or gRPC metrics, which are not actor-specific. The post was corrected to only reference metrics that Dapr actually emits.
- The metadata API response structure (`actors` array with `type` and `count` fields) may vary slightly across Dapr versions. The example shown is representative but users should verify against their specific Dapr version.
- The `success` label on `dapr_runtime_actor_reminders_fired_total` and `dapr_runtime_actor_timers_fired_total` takes values `"true"` or `"false"`, which is used for failure tracking rather than having separate failure counter metrics.
