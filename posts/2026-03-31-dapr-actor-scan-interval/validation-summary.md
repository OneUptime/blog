# Validation Summary: How to Configure Actor Scan Interval in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Virtual Actors
- Go (for HTTP handler code example)
- Prometheus / PromQL (for monitoring examples)

## Sources Consulted
- Dapr Actors Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr source code (`pkg/diagnostics/service_monitoring.go`) for metric names
- Dapr source code (`pkg/actors/config.go`) for configuration field names and defaults

## Issues Found

1. **Incorrect Prometheus metric name for deactivations (line 74 and PromQL block):** The post used `dapr_actor_deactivations_total` but the actual Dapr metric is `dapr_runtime_actor_deactivated_total`. Fixed both the `grep` command and the PromQL alert expression.

2. **Non-existent Prometheus metric `dapr_actor_active_actors` (PromQL block):** The post referenced `dapr_actor_active_actors` in a PromQL alert rule, but Dapr does not expose a built-in active actors gauge metric. The available actor metrics are: `dapr_runtime_actor_deactivated_total`, `dapr_runtime_actor_pending_actor_calls`, `dapr_runtime_actor_timers`, `dapr_runtime_actor_reminders`, among others -- none of which is an active actor count. Removed the `and dapr_actor_active_actors > 100` condition from the PromQL alert.

## Review Notes
- The deactivation window formula ("between `actorIdleTimeout` and `actorIdleTimeout + actorScanInterval`") is a reasonable inference from the periodic scan architecture but is not explicitly stated in the official Dapr documentation. It is technically sound.
- The Go code example uses `map[string]interface{}` rather than a typed struct as shown in official Dapr examples, but is functionally correct and produces valid JSON output.
- The recommended scan interval table (5-10% of idle timeout) is the author's heuristic, not from official docs, but is reasonable guidance.
- The claim that scan interval cannot be changed at runtime is consistent with the Dapr architecture (config is read at sidecar startup) but is not explicitly documented.
