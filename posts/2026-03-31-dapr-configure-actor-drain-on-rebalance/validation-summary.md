# Validation Summary: How to Configure Actor Drain on Rebalance in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (actor runtime configuration, placement service)
- Kubernetes (Deployments, graceful termination, preStop hooks)
- Go (Dapr Go SDK for actor implementation)
- Prometheus (Dapr runtime metrics)

## Sources Consulted
- Dapr actor runtime configuration docs: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Go SDK actor package: https://github.com/dapr/go-sdk/tree/main/actor (source code — `ServerImplBaseCtx`, `ServerContext` interface)
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Dapr preview features (ActorStateTTL): https://docs.dapr.io/operations/support/support-preview-features/
- Kubernetes pod termination lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination

## Issues Found

1. **Wrong field name `reentrancyConfig`** — Changed to `reentrancy` in the Configuration YAML. The Dapr Configuration CRD uses `reentrancy` as the field name, not `reentrancyConfig` (which is a Go struct type name, not a YAML field).

2. **Go code used non-existent `OnDeactivate()` method** — The Dapr Go SDK (`actor.ServerContext` interface) does not define an `OnDeactivate()` callback. Replaced with an override of `SaveState()`, which is called by the framework when an actor is deactivated or migrated and is the correct mechanism for persisting in-memory state in the Go SDK.

3. **Unused `context` import in Go code** — The `context` package was imported but never used, which would cause a compilation error in Go. Removed the import.

4. **Wrong Prometheus metric names** — All three metric names had incorrect prefixes:
   - `dapr_placement_actor_rebalanced_total` → `dapr_runtime_actor_rebalanced_total` (uses `dapr_runtime_` prefix, not `dapr_placement_`)
   - `dapr_actor_activated_total` — removed entirely; this metric does not exist in Dapr's documented metrics
   - `dapr_actor_deactivated_total` → `dapr_runtime_actor_deactivated_total` (uses `dapr_runtime_` prefix)

5. **Imprecise preStop hook description** — The original text said the preStop hook gives "Dapr time to stop routing new requests." Corrected to explain that the delay allows the pod's endpoint removal to propagate through kube-proxy, which is the actual mechanism that stops new requests from arriving.

## Review Notes
- The `ActorStateTTL` feature flag is a Dapr preview feature (introduced in v1.11). If it becomes stable in a future Dapr release, the feature flag may no longer be needed.
- The `drainRebalancedActors` field defaults to `true` in current Dapr versions; explicitly setting it is fine for clarity but is technically the default behavior.
- The tuning table recommendations are reasonable rules of thumb but are not sourced from official Dapr documentation — they are the author's guidance.
- The section heading "Implementing Actor Deactivation Cleanup" was updated to "Implementing Actor State Persistence on Deactivation" to better reflect the corrected `SaveState` approach.
