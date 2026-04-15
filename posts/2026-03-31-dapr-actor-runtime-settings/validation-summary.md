# Validation Summary: How to Configure Actor Runtime Settings in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Kubernetes (Deployment manifests, Dapr annotations)

## Sources Consulted
- Dapr Actors Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK Actors documentation: https://docs.dapr.io/developing-applications/sdks/go/go-actors/
- Dapr Go SDK source (actor/runtime package): https://github.com/dapr/go-sdk/tree/main/actor/runtime
- Dapr Go SDK actor serving example: https://github.com/dapr/go-sdk/tree/main/examples/actor/serving
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

### 1. Go code used nonexistent Dapr Go SDK API methods (Critical)
**What was wrong:** The Go code example called methods that do not exist in the Dapr Go SDK: `SetActorIdleTimeout()`, `SetActorScanInterval()`, `SetDrainOngoingCallTimeout()`, `SetDrainRebalancedActors()`, and `RegisterActor()`. These setter methods are fabricated — the Go SDK does not expose programmatic setters for actor runtime configuration. Additionally, the `"time"` package was used but not imported, and `"github.com/dapr/go-sdk/actor/config"` was imported but unused. The code would not compile.

**What was changed:** Replaced the entire Go code example with the correct pattern from the official Dapr Go SDK examples. Actors are registered using `s.RegisterActorImplFactoryContext(factory)` on the service object. Updated the introductory text to explain that runtime settings (idle timeout, scan interval, etc.) are configured through the `/dapr/config` endpoint response, not programmatically through the Go SDK.

**Why:** The original code would fail to compile and demonstrated a nonexistent API, which would mislead readers.

### 2. `actorIdleTimeout` description omitted reminder firings (Minor)
**What was wrong:** The description said actors are deactivated after being idle "without any method calls." The official Dapr docs specify that actors remain active if either method calls *or reminders* have fired.

**What was changed:** Added "or reminder firings" to the description.

**Why:** Omitting reminders could lead readers to incorrectly expect that actors with active reminders would be deactivated after the idle timeout.

### 3. Kubernetes Deployment YAML missing required fields (Moderate)
**What was wrong:** The Deployment manifest was missing the required `spec.selector.matchLabels` field and `spec.template.metadata.labels`. Without these, `kubectl apply` would reject the manifest with a validation error.

**What was changed:** Added `spec.selector.matchLabels` with `app: actor-service` and corresponding `spec.template.metadata.labels`.

**Why:** A Kubernetes Deployment requires a pod selector to identify which pods it manages. The original YAML would fail to deploy.

## Review Notes
- The `/dapr/config` endpoint JSON response section is accurate. The field names (`entities`, `actorIdleTimeout`, `actorScanInterval`, `drainOngoingCallTimeout`, `drainRebalancedActors`, `reentrancy`) all match the official Dapr API reference.
- The Dapr API also supports an optional `entitiesConfig` field for per-actor-type configuration that the post does not mention. This is acceptable for a general overview post.
- The `drainOngoingCallTimeout` example value of `"15s"` differs from the official example (`"30s"`) and default (`60s`). While this is a valid value, readers should be aware of the default.
- The Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all correctly documented.
- The best practices section is sound and aligns with Dapr's recommended operational guidance.
