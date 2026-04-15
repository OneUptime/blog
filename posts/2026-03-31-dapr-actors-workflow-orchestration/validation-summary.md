# Validation Summary: How to Use Actors for Workflow Orchestration in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Actors (virtual actor model)
- Dapr Actor State Management
- Dapr Actor Reminders
- Go (Golang)

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (actor package, `ServerImplBase` vs `ServerImplBaseCtx`, `StateManager` vs `StateManagerContext` interfaces)
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK actor examples: https://github.com/dapr/go-sdk/tree/main/examples/actor
- Dapr Actor Reminders documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/

## Issues Found

1. **Deprecated actor base type (`actor.ServerImplBase`)**: The post embedded `actor.ServerImplBase`, which is deprecated. The code passed `context.Context` to state manager methods (`Get`, `Set`), but the deprecated `StateManager` interface returned by `ServerImplBase.GetStateManager()` does not accept a context parameter. Changed to `actor.ServerImplBaseCtx`, whose `GetStateManager()` returns `StateManagerContext` with context-aware method signatures matching the code.

2. **Missing `StepCompletion` type definition**: The `CompleteStep` method accepted `*StepCompletion` as a parameter, but the type was never defined in the code example. Added the struct definition with `StepName`, `Status`, and `Error` fields matching the JSON shown in the curl example.

3. **Non-existent `AddReminder` method**: The post called `a.AddReminder("workflow-timeout", nil, 24*time.Hour, 0)` but no such method exists on either `ServerImplBase` or `ServerImplBaseCtx`. Additionally, the parameter types were wrong — Dapr reminders use string-based durations (e.g., `"24h"`), not `time.Duration` values. Replaced the Go code snippet with the equivalent Dapr HTTP API call (`POST /v1.0/actors/{actorType}/{actorId}/reminders/{name}`), which is the standard way to register reminders and is consistent with the rest of the post's curl-based examples.

4. **One-shot reminder period value**: The original code passed `0` as an integer for the period parameter. In Dapr's reminder API, omitting the `period` field entirely (rather than passing `0`) is how you create a one-shot reminder. The corrected curl example omits the `period` field with an explanatory note.

## Review Notes
- The `nextStep` function uses a hardcoded step list that includes `"completed"` as a step. When `current` is `"shipped"`, it returns `"completed"`, and then on the next call with `"completed"` it returns `""` (empty string) which triggers the workflow completion status. This works but is slightly confusing since `"completed"` serves as both a step name and a terminal state. This is a design choice, not a bug.
- The post does not show actor registration or server setup code (e.g., `actor.RegisterActorImplFactoryContext`). This is acceptable for a focused tutorial but readers will need to consult the Dapr Go SDK examples for the full boilerplate.
- The HTTP API endpoint pattern (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) is correct per the Dapr Actors API reference.
