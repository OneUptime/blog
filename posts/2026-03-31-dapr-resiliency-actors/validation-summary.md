# Validation Summary: How to Apply Resiliency Policies to Actors in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (resiliency policies, actors, placement service)
- Python (Dapr Python SDK - ActorProxy)
- Go (Dapr Go SDK - actor implementation)
- JavaScript (Dapr JS SDK - AbstractActor, reminders)
- Kubernetes (kubectl, daprd sidecar)
- Prometheus (Dapr metrics)

## Sources Consulted
- Dapr Resiliency Policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Python SDK Actor documentation: https://docs.dapr.io/developing-applications/sdks/python/python-actor/
- Dapr Go SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/
- Dapr JS SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Go SDK source code (actor package, `actor.ServerImplBaseCtx`)
- Dapr Python SDK source code (`dapr/clients/grpc/client.py`, `dapr/actor/proxy.py`)
- Dapr kit retry source code (`dapr/kit/retry/retry.go`)

## Issues Found

### 1. Python SDK: Non-existent `DaprClient.invoke_actor()` method (FIXED)
**What was wrong:** The Python example used `DaprClient.invoke_actor()` with parameters `actor_type`, `actor_id`, `method`, and `data`. This method does not exist on `DaprClient` in the Dapr Python SDK. The documented approach for invoking actor methods is through `ActorProxy`.
**What was changed:** Replaced the example with `ActorProxy.create()` and `proxy.invoke_method()`, which is the correct and documented API for invoking actor methods in the Python SDK.
**Why:** The original code would fail with an `AttributeError` at runtime.

### 2. Go SDK: Incorrect actor struct and method signatures (FIXED)
**What was wrong:** The Go actor implementation used `*dapr.Actor` as a struct field and `*bindings.InvokeRequest`/`*bindings.InvokeResponse` as method parameter/return types. The `bindings` types are for Dapr input/output bindings, not for actor methods. The correct base type for Go actors is `actor.ServerImplBaseCtx` (embedded struct), and methods accept typed request structs and return byte slices or typed responses.
**What was changed:** Changed the struct to embed `actor.ServerImplBaseCtx` and updated the method signature to use `*PaymentRequest` input and `([]byte, error)` return types.
**Why:** The original code conflated the bindings API with the actor API and would not compile correctly as a Dapr actor.

### 3. JS SDK: Incorrect reminder callback method name (FIXED)
**What was wrong:** The JavaScript actor example used `processOrderReminder` as the reminder callback method name. In the Dapr JS SDK, the standard reminder callback method is `receiveReminder`, which is automatically invoked when a registered reminder fires.
**What was changed:** Renamed the method from `processOrderReminder(data)` to `receiveReminder(state)` to match the SDK's expected callback signature.
**Why:** Using a custom method name would not be invoked by the Dapr runtime when a reminder fires, unless explicitly configured during reminder registration (which the example does not show).

## Review Notes
- The `default` keyword under `targets.actors` for applying a default resiliency policy to all actor types could not be confirmed in the official documentation. All official examples use explicit actor type names. This may work in practice but is not documented.
- The claim that resiliency policies apply to actor reminder callbacks (not just method invocations) could not be explicitly confirmed in the Dapr resiliency documentation. Dapr does have built-in reminder retry logic, but whether user-configured resiliency policies extend to reminder callbacks is not clearly documented.
- The monitoring section uses `grep "dapr_actor"` which works via substring matching, though the actual Dapr metric prefix for actors is `dapr_runtime_actor_*`.
- The YAML resiliency configuration structure, policy field names, and circuit breaker configuration are all correct per the official Dapr documentation and source code.
- The blog does not mention actor-specific resiliency fields `circuitBreakerScope` and `circuitBreakerCacheSize`, which control per-actor-ID vs per-actor-type circuit breaking. This is a minor omission, not an error.
