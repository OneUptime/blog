# Validation Summary: How to Use Actors for IoT Device Management in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Actor building block (virtual actor pattern)
- Dapr Actor State Management
- Dapr Actor Reminders
- IoT device twin pattern

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk
  - `actor/actor.go` — `ServerImplBase`, `ServerImplBaseCtx`, `ReminderCallee` interfaces
  - `actor/manager/` — `StateManager`, `StateManagerContext` interfaces and method signatures
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Go SDK Actors documentation: https://docs.dapr.io/developing-applications/sdks/go/go-actors/
- Dapr Actor API reference: https://docs.dapr.io/reference/api/actors_api/
- Previously validated blog posts in this repository:
  - `posts/2026-03-31-dapr-go-actors/` — verified actor implementation patterns
  - `posts/2026-03-31-dapr-invoke-actor-methods/` — verified InvokeActor client API

## Issues Found

1. **Deprecated `ServerImplBase` replaced with `ServerImplBaseCtx`**: The post embedded `actor.ServerImplBase` which is deprecated. Changed to `actor.ServerImplBaseCtx` which is the current context-aware base type in the Dapr Go SDK.

2. **Non-existent `OnActivate()` lifecycle hook removed**: The post defined `OnActivate() error` as a method on the actor to register reminders during activation. The Dapr Go SDK does not expose a user-overridable activation callback — this method would compile but never be called by Dapr. Removed entirely and restructured the reminders section.

3. **Non-existent `AddReminder()` method replaced with client-side registration**: The post called `a.AddReminder("connectivity-check", nil, 5*time.Minute, 5*time.Minute)` on the actor. No such method exists on `ServerImplBase` or `ServerImplBaseCtx`. Replaced with the correct pattern: `daprClient.RegisterActorReminder(ctx, &dapr.RegisterActorReminderRequest{...})` using string-based durations (`"5m"`) instead of `time.Duration` values.

4. **Incorrect `ReminderCall` signature fixed**: The post showed `ReminderCall(ctx context.Context, name string, data []byte) error` which does not match the `ReminderCallee` interface. The correct signature is `ReminderCall(reminderName string, state []byte, dueTime string, period string)` — no context parameter and no error return value. Updated to use `context.Background()` for state manager calls within the callback.

## Review Notes
- The `StateManager.Get(ctx, key, &pointer)` usage pattern throughout the post is correct — it populates via pointer and returns an error.
- The `InvokeActor` client call in the telemetry handler section uses the correct API (`client.InvokeActor` with `&dapr.InvokeActorRequest{...}`).
- The HTTP API endpoint `POST /v1.0/actors/DeviceTwin/device-001/method/SetDesiredState` is correct per the Dapr Actor API reference.
- The conceptual explanations of the device twin pattern, turn-based concurrency, and actor distribution are accurate.
- The post ignores errors from some `GetStateManager().Get()` calls (e.g., in `ReportTelemetry` and `SetDesiredState`). This is acceptable since the zero-valued struct is a valid initial state, and the validated reference post uses the same pattern.
