# Validation Summary: How to Configure Actor Idle Timeout in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actor Runtime
- Go (code examples)
- Prometheus (monitoring/metrics)

## Sources Consulted
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actor Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Metrics with Prometheus: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Metrics List (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Go `time.ParseDuration` format: https://pkg.go.dev/time#ParseDuration

## Issues Found

### 1. Incorrect Prometheus metric names
- **What was wrong:** The post used `dapr_actor_active_actors` and `dapr_actor_deactivations_total` as metric names. `dapr_actor_active_actors` does not exist as a built-in Dapr metric. `dapr_actor_deactivations_total` should be `dapr_runtime_actor_deactivated_total`.
- **What was changed:** Replaced the monitoring section with correct metric names: `dapr_runtime_actor_deactivated_total` and `dapr_runtime_actor_pending_actor_calls`. Updated the PromQL query to use `rate(dapr_runtime_actor_deactivated_total{app_id="my-service"}[5m])` instead of the non-existent `dapr_actor_active_actors` metric.
- **Why:** Dapr's built-in metrics follow the `dapr_runtime_actor_*` naming convention. Using non-existent metric names would cause confusion when readers try to query them.

### 2. Per-actor-type config missing top-level `entities` array
- **What was wrong:** The `entitiesConfig` example only had the `entitiesConfig` field without a top-level `entities` array. According to Dapr documentation, actor types listed in `entitiesConfig` must also appear in the top-level `entities` array or the configuration is silently ignored.
- **What was changed:** Added `"entities": []string{"UserSession", "DeviceTwin"}` to the per-actor-type configuration example alongside `entitiesConfig`.
- **Why:** Without the top-level `entities` array, the per-actor-type configuration would be silently ignored, making the example non-functional.

## Review Notes
- The default `actorIdleTimeout` is 60 minutes and the default `actorScanInterval` is 30 seconds. The post does not mention these defaults, which could be useful context for readers, but this is a content completeness issue rather than an accuracy error.
- The description of "Dapr's scanner marks the actor as idle" is a slight simplification — the runtime checks if time since last invocation exceeds the timeout and directly initiates deactivation without an intermediate "idle" state. This is acceptable for a blog post audience.
- The Go code examples are syntactically correct and use standard library HTTP handlers appropriately.
- The duration format examples are all valid Go `time.ParseDuration` strings.
