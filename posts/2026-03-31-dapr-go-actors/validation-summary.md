# Validation Summary: How to Use Dapr Actors with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Actor building block (virtual actor pattern)
- Dapr State Management (actor state)
- Dapr Actor Reminders

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk
  - `actor/actor.go` — `ServerImplBase`, `ServerImplBaseCtx`, `ReminderCallee` interfaces
  - `actor/manager/` — `StateManager`, `StateManagerContext` interfaces and method signatures
  - `actor/config/` — `ActorConfig` and registration options
  - `service/http/service.go` — `NewService` and actor registration methods
  - `examples/actor/` — official actor example code
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Go SDK Actors documentation: https://docs.dapr.io/developing-applications/sdks/go/go-actors/

## Issues Found

1. **Deprecated `ServerImplBase` replaced with `ServerImplBaseCtx`**: The post embedded `dapr.ServerImplBase` which is deprecated. Changed to `actor.ServerImplBaseCtx` and updated the import from `dapr "github.com/dapr/go-sdk/actor"` to `"github.com/dapr/go-sdk/actor"`.

2. **Incorrect `StateManager.Get()` usage**: The post treated `Get()` as returning `([]byte, error)`. The actual signature is `Get(ctx, stateName, &reply) error` — it populates the value via a pointer parameter. Fixed all `Get()` calls to use the pointer pattern.

3. **Incorrect `StateManager.Set()` usage**: The post pre-marshaled values with `json.Marshal` before passing to `Set()`. The actual `Set()` accepts `any` and handles serialization internally. Removed all manual `json.Marshal` calls and passed Go values directly.

4. **Non-existent `RegisterActor` method**: The post called `s.RegisterActor(&impl{})` which does not exist on the service. The correct method is `s.RegisterActorImplFactoryContext(func() actor.ServerContext { ... })` which uses a factory function pattern. Fixed the registration code accordingly.

5. **Unused `actor/config` import removed**: The post imported `github.com/dapr/go-sdk/actor/config` but never used it. Replaced with `github.com/dapr/go-sdk/actor` which is needed for the factory registration.

6. **Non-existent client proxy API replaced with client stub pattern**: The post used `client.NewActorProxy`, `dapr.NewActorID`, `proxy.Call`, and `proxy.CallWithResult` — none of which exist in the Dapr Go SDK. The SDK uses a reflective client stub pattern: define a struct with function fields matching actor methods, implement `Type()` and `ID()`, then call `daprClient.ImplActorClientStub(stub)` to wire up the methods. Rewrote the entire client section.

7. **Non-existent `OnActivate` and `RegisterActorReminder` on actor**: The post showed `OnActivate() error` as a lifecycle hook and `a.RegisterActorReminder(...)` as a method on the actor. Neither exists. `RegisterActorReminder` is a method on the Dapr client (`daprClient.RegisterActorReminder(ctx, &RegisterActorReminderRequest{...})`). Rewrote the reminder section to register via the Dapr client.

8. **Non-existent `dapr.ActorReminder` struct**: Replaced with the correct `dapr.RegisterActorReminderRequest` struct with proper field names (`ActorType`, `ActorID`, `Name`, `DueTime`, `Period`).

9. **Removed `encoding/json` import**: No longer needed since state management handles serialization internally.

## Review Notes
- The `ReminderCall` callback signature was correct and matched the `ReminderCallee` interface in the SDK.
- The conceptual explanations of the virtual actor pattern (single-threaded, isolated state, auto-activation, garbage collection) are accurate.
- The `daprd.NewService(":8080")` call is correct.
- The overview and summary sections are conceptually sound and required no changes.
