# Validation Summary: How to Monitor Dapr Actor Activation Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (actor runtime and metrics)
- Prometheus (metrics collection and alerting rules)
- Grafana (dashboard visualization)
- PromQL (query language)

## Sources Consulted
- Dapr metrics reference (master): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr metrics reference (release-1.7): https://github.com/dapr/dapr/blob/release-1.7/docs/development/dapr-metrics.md
- Dapr runtime metrics source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/service_monitoring.go
- Dapr Grafana actor dashboard: https://github.com/dapr/dapr/blob/master/grafana/grafana-actor-dashboard.json
- Dapr metrics overview documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metadata API documentation: https://docs.dapr.io/reference/api/metadata_api/

## Issues Found

1. **Wrong metric prefix on all metrics**: All metric names used `dapr_actor_` prefix but the correct Dapr runtime prefix is `dapr_runtime_actor_`. Fixed all occurrences (e.g., `dapr_actor_pending_actor_calls` -> `dapr_runtime_actor_pending_actor_calls`).

2. **`dapr_actor_active_actors` does not exist**: The post listed this as a Prometheus metric for current active actor count, but no such Prometheus metric exists in Dapr. Active actor counts are only available via the Dapr metadata API (`GET /v1.0/metadata`). Replaced the "Querying Active Actor Count" section with metadata API instructions and removed all PromQL queries that referenced this non-existent metric.

3. **`dapr_actor_activated_total` was removed from Dapr**: This metric existed in Dapr v1.7 and earlier as `dapr_runtime_actor_activated_total` but has been removed from the current codebase. Removed all references to activation counters and the "Activation and Deactivation Rate" section was reworked to cover only deactivation rate.

4. **`dapr_actor_reminder_fired_failed_total` does not exist**: There is no separate metric for reminder failures. Failures are tracked via the `success` label on `dapr_runtime_actor_reminders_fired_total`. Fixed to use `dapr_runtime_actor_reminders_fired_total{success="false"}` in both the query examples and alert rules.

5. **DaprActorCountAnomaly alert used non-existent metric**: The alert rule referenced `dapr_actor_active_actors` which doesn't exist as a Prometheus metric. Replaced with a `DaprActorHighDeactivationRate` alert using `dapr_runtime_actor_deactivated_total` which is a valid and useful alert.

6. **Grafana panel queries used non-existent metrics**: Panels referenced `dapr_actor_active_actors` and `dapr_actor_activated_total`. Replaced with valid metrics: deactivation rate, pending calls, and timer/reminder firing rates.

## Review Notes
- The `dapr_runtime_actor_activated_total` metric existed in Dapr v1.7 but was removed in later versions. If readers are using Dapr 1.7 or earlier, the activation metric would be available under the `dapr_runtime_actor_` prefix.
- Dapr has an open issue (#5225) about migrating to OpenTelemetry semantic conventions, which may change metric names in future versions.
- The metadata API approach for active actor counts requires building a custom Prometheus exporter if users want to visualize active counts in Grafana/Prometheus. This is a limitation worth noting for readers.
- Additional actor metrics exist that were not covered in the original post: `dapr_runtime_actor_status_report_total`, `dapr_runtime_actor_rebalanced_total`, `dapr_runtime_actor_timers` (gauge), and `dapr_runtime_actor_reminders` (gauge).
