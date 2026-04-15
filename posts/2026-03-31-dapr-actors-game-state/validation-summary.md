# Validation Summary: How to Use Actors for Game State Management in Dapr

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
- Dapr Actor HTTP API
- Go (Golang)

## Sources Consulted
- Dapr Go SDK source code: `github.com/dapr/go-sdk/actor/actor.go` on `main` branch — verified `ServerImplBase`, `ServerImplBaseCtx`, `StateManager`, `StateManagerContext`, `ReminderCallee` interfaces and structs
- Dapr Go SDK actor manager: `github.com/dapr/go-sdk/actor/manager/manager.go` — verified reminder dispatch and `ReminderCallee` type assertion
- Dapr Go SDK client: `github.com/dapr/go-sdk/client/actor.go` — verified `RegisterActorReminder` and `RegisterActorReminderRequest`
- Dapr Actor HTTP API documentation — verified URL format `v1.0/actors/{actorType}/{actorId}/method/{methodName}`

## Issues Found

### 1. Used deprecated `actor.ServerImplBase` instead of `actor.ServerImplBaseCtx`
- **What was wrong:** Both `GameRoomActor` and `PlayerActor` embedded `actor.ServerImplBase`, which is deprecated. More critically, the code passed `context.Context` to state manager methods (`Get(ctx, ...)`, `Set(ctx, ...)`), but `ServerImplBase.GetStateManager()` returns `StateManager` which does NOT accept context parameters. This would cause a compilation error.
- **What was changed:** Replaced `actor.ServerImplBase` with `actor.ServerImplBaseCtx` in both actor structs. `ServerImplBaseCtx.GetStateManager()` returns `StateManagerContext`, which accepts context parameters matching the code's usage.
- **Why:** `ServerImplBaseCtx` is the current, non-deprecated base struct and its state manager interface matches the context-aware method calls used throughout the code.

### 2. Missing `"fmt"` import
- **What was wrong:** The code uses `fmt.Errorf(...)` in multiple places but the `"fmt"` package was not included in the import block.
- **What was changed:** Added `"fmt"` to the import statement.
- **Why:** Without this import, the code would not compile.

### 3. `OnActivate()` does not exist in the Dapr Go SDK
- **What was wrong:** The reminders section used `func (a *GameRoomActor) OnActivate() error` as an activation lifecycle hook. The Dapr Go SDK does not define an `OnActivate` method on any actor interface or base struct (unlike the .NET SDK which has `OnActivateAsync`).
- **What was changed:** Replaced `OnActivate` with a `RegisterTimeout` method that uses the Dapr client (`dapr.NewClient()`) to register the reminder via `client.RegisterActorReminder()`.
- **Why:** The Go SDK does not have actor lifecycle hooks. Reminders must be registered through the Dapr client API.

### 4. `AddReminder()` does not exist on actor base structs
- **What was wrong:** The code called `a.AddReminder("game-timeout", nil, 10*time.Minute, 0)` as if it were a method on the actor. Neither `ServerImplBase` nor `ServerImplBaseCtx` exposes an `AddReminder` method.
- **What was changed:** Replaced with `client.RegisterActorReminder(ctx, &dapr.RegisterActorReminderRequest{...})` using the Dapr client.
- **Why:** In the Dapr Go SDK, actor reminders are registered via the Dapr client, not through methods on the actor itself.

### 5. `ReminderCall` signature was incorrect
- **What was wrong:** The blog used `ReminderCall(ctx context.Context, name string, data []byte) error`. The actual `ReminderCallee` interface in the Go SDK defines `ReminderCall(reminderName string, state []byte, dueTime string, period string)` — four parameters (no context), no return value. There is no `ReminderCalleeCtx` variant.
- **What was changed:** Corrected the signature to `ReminderCall(reminderName string, state []byte, dueTime string, period string)` with no return value. Changed `a.EndGame(ctx)` to `a.EndGame(context.Background())` since no context is available in the callback.
- **Why:** The actor must implement the exact `ReminderCallee` interface for the Dapr runtime to dispatch reminder callbacks correctly.

## Review Notes
- The `JoinRequest`, `ScoreUpdate`, and `GameResult` types are referenced but not defined in the code. This is acceptable for a tutorial — they are implied types — but readers may need to define them.
- The `EndGame` method is referenced in the reminder callback but not implemented. This is acceptable as it's left as an exercise for the reader.
- The HTTP API curl examples correctly use `POST` and the `v1.0/actors/{type}/{id}/method/{method}` format.
- The overall architecture (actor-per-room, actor-per-player) is a sound pattern for game state management with Dapr actors.
