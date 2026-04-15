# Validation Summary: How to Use Dapr Actor State Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Virtual Actor pattern)
- Dapr Python SDK (`dapr`, `dapr-ext-fastapi`)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Redis (as actor state store)
- FastAPI (actor hosting)
- Dapr HTTP API (actor invocation)

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr State management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Actor runtime features: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Dapr Python SDK GitHub: https://github.com/dapr/python-sdk
- Dapr Go SDK GitHub: https://github.com/dapr/go-sdk
- Dapr Go SDK actor package docs: https://pkg.go.dev/github.com/dapr/go-sdk/actor

## Issues Found

1. **Actor state key format was incorrect (lines 217-232)**: The post claimed the state store key format was `{app-id}||{actor-type}-{actor-id}-{state-key}` using hyphens between actor type, actor ID, and state key. The correct format per Dapr documentation uses `||` as the separator between ALL components: `{app-id}||{actor-type}||{actor-id}||{state-key}`. Fixed the format description, example, and Redis CLI command.

2. **Unused imports in Python example (lines 67-69)**: `Remindable` and `json` were imported but never used in the first Python code block. `Remindable` is only relevant in the later reminders section. Removed both unused imports.

3. **Go unused import causes compile error (line 175)**: `encoding/json` was imported but never used in the Go example. Go treats unused imports as compile errors. Removed the unused import.

4. **Reminder method name shadowed parent method (line 242)**: The `register_reminder` method defined on the actor class had the same name as the inherited `Actor.register_reminder()` method, which would cause infinite recursion when called. Renamed the method to `setup_followup_reminder`.

5. **Missing `timedelta` import in reminders section (line 238)**: The reminders code used `timedelta` for `due_time` and `period` parameters but did not import it from `datetime`. Added `from datetime import timedelta`.

6. **Go actor used deprecated `ServerImplBase` causing API mismatch (line 191)**: The Go example embedded `dapr.ServerImplBase` (deprecated) but called `GetStateManager().Get(ctx, ...)` and `.Set(ctx, ...)` with a `context.Context` parameter. `ServerImplBase.GetStateManager()` returns a `StateManager` whose methods do NOT accept a context parameter, so this code would not compile. Changed to `dapr.ServerImplBaseCtx`, whose `GetStateManager()` returns a `StateManagerContext` with context-aware `Get`/`Set` methods matching the call signatures.

## Review Notes
- The Python actor interface (`OrderActorInterface`) is defined as a plain class rather than extending `ActorInterface` from `dapr.actor`. While this works for server-side routing (Dapr routes calls by method name via HTTP), the idiomatic Dapr Python SDK pattern uses `ActorInterface` with `@actormethod` decorators, which is required if using actor proxy clients. This is not technically broken but could confuse readers who later try client-side proxy invocation.
- The Go actor example is a partial snippet — `PlaceOrderRequest` and `PlaceOrderResponse` types are referenced but not defined. This is acceptable for a blog post showing the pattern, but readers will need to define these types.
- The `Get` and `Set` calls on the Go state manager do not check returned errors, which is acceptable for a simplified example but should not be done in production code.
