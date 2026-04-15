# Validation Summary: How to Manage Dapr Actor Lifecycle (Activation, Deactivation)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (actor building block)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Dapr Python SDK (`dapr.actor`)
- Dapr .NET SDK (`Dapr.Actors.Runtime`)
- Node.js / Express (HTTP endpoint implementation without SDK)

## Sources Consulted
- Dapr Actor API reference — https://docs.dapr.io/reference/api/actors_api/ (verified timer and reminder callback endpoint URL patterns)
- Dapr Go SDK source code — https://github.com/dapr/go-sdk (verified actor Server interface, ServerImplBase/ServerImplBaseCtx, and absence of lifecycle hook methods)
- Dapr Go SDK documentation — https://docs.dapr.io/developing-applications/sdks/go/go-actors/
- Dapr Actor overview — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/

## Issues Found

### 1. Timer callback endpoint missing `timer/` prefix
- **What was wrong:** The lifecycle callbacks table listed the timer fire endpoint as `PUT /actors/{type}/{id}/method/timerName`, omitting the `timer/` path segment.
- **What was changed:** Updated to `PUT /actors/{type}/{id}/method/timer/{timerName}`.
- **Why:** The Dapr sidecar routes timer callbacks through `/method/timer/{timerName}`, not `/method/{timerName}` (which is for regular method invocations).

### 2. Reminder callback endpoint missing `remind/` prefix
- **What was wrong:** The lifecycle callbacks table listed the reminder fire endpoint as `PUT /actors/{type}/{id}/method/reminderName`, omitting the `remind/` path segment.
- **What was changed:** Updated to `PUT /actors/{type}/{id}/method/remind/{reminderName}`.
- **Why:** The Dapr sidecar routes reminder callbacks through `/method/remind/{reminderName}`, not `/method/{reminderName}`.

### 3. Go SDK code used non-existent lifecycle hooks
- **What was wrong:** The Go SDK example defined `OnActivate()` and `OnDeactivate()` methods, but the Dapr Go SDK does not provide overridable lifecycle hook methods. These methods would never be called by the runtime. The example also used the deprecated `ServerImplBase` struct.
- **What was changed:** Replaced the Go example with a correct pattern using `ServerImplBaseCtx` (current, non-deprecated) and lazy initialization in the business method. Added a note explaining that the Go SDK does not support lifecycle hooks.
- **Why:** The Go SDK's `Server`/`ServerContext` interfaces do not define activation or deactivation callbacks. Unlike the .NET (`OnActivateAsync`/`OnDeactivateAsync`) and Python (`_on_activate`/`_on_deactivate`) SDKs, Go requires a different approach to initialization.

## Review Notes
- The activation flow sequence diagram simplifies the state loading step by showing the sidecar loading state from the store as a discrete step between activation and method invocation. In reality, state is loaded lazily when the actor code accesses it through the state manager. This is an acceptable simplification for illustration purposes.
- The Python and .NET SDK code examples are correct and use current APIs.
- The HTTP endpoint (Express.js) example correctly shows the activation/deactivation callback pattern.
- The `/dapr/config` endpoint configuration fields and values are accurate.
