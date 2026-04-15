# Validation Summary: How to Handle Actor Garbage Collection in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — actor building block
- Dapr Go SDK (state manager API)
- Dapr .NET SDK (referenced for OnDeactivateAsync lifecycle)
- Prometheus (metrics monitoring)
- Go (programming language)

## Sources Consulted
- Dapr Actors Features & Concepts: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Dapr Actors Runtime Config: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Placement Service: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Runtime Metrics source: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Go SDK actor package: https://pkg.go.dev/github.com/dapr/go-sdk/actor

## Issues Found

### 1. Incorrect claim about placement service update on deactivation (Step 4)
**What was wrong:** The post stated that "The placement service is updated to reflect that the actor is no longer active on this host" as step 4 of the deactivation process. The Dapr placement service tracks actor **types** per host using consistent hashing, not individual actor instances. There is no per-actor notification to the placement service on deactivation.
**What was changed:** Removed step 4 entirely. The deactivation lifecycle now correctly lists 3 steps.

### 2. Go SDK `OnDeactivate` method does not exist
**What was wrong:** The post showed `OnDeactivate() error` as a Go method, but the Dapr Go SDK does not have an `OnDeactivate` lifecycle callback. The .NET SDK has `OnDeactivateAsync()`, and Java/Python have their equivalents, but the Go SDK handles deactivation differently — via the HTTP DELETE route that the Dapr sidecar calls on the application.
**What was changed:** Renamed the section from "Implementing OnDeactivate for Clean Shutdown" to "Implementing a Deactivation Handler for Clean Shutdown". Added explanatory text about how deactivation works across SDKs. Changed method name from `OnDeactivate` to `DeactivateHandler` with a comment explaining it's called when the sidecar sends a DELETE. Also replaced `context.Background()` with a passed-in `ctx context.Context` parameter, which is more idiomatic.

### 3. Incorrect Prometheus metric name `dapr_actor_deactivations_total`
**What was wrong:** The post used `dapr_actor_deactivations_total` as the metric name.
**What was changed:** Corrected to `dapr_runtime_actor_deactivated_total`, which is the actual Dapr metric name.

### 4. Non-existent Prometheus metric `dapr_actor_active_actors`
**What was wrong:** The post referenced `dapr_actor_active_actors` in a grep command, but this metric does not exist in Dapr.
**What was changed:** Changed the grep to `dapr_runtime_actor` to match the actual metric prefix, and updated the comment to "Check actor metrics (activations, deactivations, pending calls)".

## Review Notes
- The configuration field names (`actorIdleTimeout`, `actorScanInterval`, `entities`) are all correct per Dapr's actor runtime config docs.
- The Go SDK state manager API calls (`GetStateManager().Get()`, `.Set()`, `.Remove()`, and `.ID()`) are all correct and match the `StateManagerContext` interface.
- The duration format strings ("1h", "30s", etc.) are correct — Dapr uses Go's `time.ParseDuration` format.
- The claim that state persists across deactivation is correct and well-documented in Dapr's actor overview.
- The metrics port 9090 is the correct Dapr default.
- The best practices section contains reasonable advice, though the "10% of idle timeout" rule for scan interval is the author's recommendation rather than an official Dapr guideline.
