# Validation Summary: How to Handle Actor Activation Storms in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (actor building block, runtime configuration, HTTP API)
- Go (Dapr Go SDK, golang.org/x/sync/semaphore)
- Kubernetes (Deployment rolling update strategy)
- Prometheus (alerting rules, PromQL)

## Sources Consulted
- Dapr actor runtime configuration docs: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr metrics documentation: https://github.com/dapr/dapr/blob/release-1.7/docs/development/dapr-metrics.md
- Dapr Go SDK actor source: https://github.com/dapr/go-sdk/blob/main/actor/actor.go
- Kubernetes Deployment strategy docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment

## Issues Found

1. **Dapr Configuration CRD misused for actor settings**: The post showed actor runtime settings (`actorIdleTimeout`, `actorScanInterval`, `drainOngoingCallTimeout`, `drainRebalancedActors`) in a `kind: Configuration` CRD under `spec.actor`. These settings are not part of the Dapr Configuration CRD. They must be configured through the application's `/dapr/config` HTTP endpoint. Replaced the YAML with a Go handler that serves the correct JSON configuration via `/dapr/config`.

2. **Unused `context` import in Go code**: The warm-up strategy Go code block imported `"context"` but never used it, which would cause a compilation error in Go. Removed the unused import.

3. **Incorrect Prometheus metric name**: The post used `dapr_actor_activated_total` but the correct Dapr metric name is `dapr_runtime_actor_activated_total` (with the `dapr_runtime_` prefix). Fixed all three occurrences.

4. **Non-existent `OnActivate` callback in Go SDK**: The rate limiting section used `OnActivate(ctx context.Context) error` as an actor lifecycle callback. The Dapr Go SDK does not expose an activation lifecycle hook (unlike the .NET SDK's `OnActivateAsync()`). Since activation is triggered on first method invocation, reframed the code to use a regular actor method handler (`Ping`) with the semaphore, which is the correct pattern for throttling in Go.

## Review Notes
- The Kubernetes Deployment YAML snippet omits required fields like `selector` and full `template` spec, but this is acceptable for a focused snippet showing only the relevant rolling update configuration.
- The `dapr_runtime_actor_activated_total` metric was confirmed in Dapr 1.7 docs but may have been renamed or removed in newer Dapr versions. Readers targeting the latest Dapr should verify the metric name.
- The warm-up code calls `loadActiveActorIDs()` which is not defined in the snippet. This is fine as illustrative code but readers should note they need to implement this function.
