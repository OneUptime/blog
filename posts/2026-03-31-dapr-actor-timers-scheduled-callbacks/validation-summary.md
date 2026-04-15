# Validation Summary: How to Use Dapr Actor Timers for Scheduled Callbacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (actor building block — timers and reminders)
- Go (Dapr Go SDK for actor timer registration)
- Python (Dapr Python SDK for actor timer registration)
- Node.js / Express (HTTP API callback handler)
- Dapr HTTP API (actor timer registration and deletion)

## Sources Consulted
- Dapr Actor Timers & Reminders documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK source (actor package): https://github.com/dapr/go-sdk/tree/main/actor
- Dapr Go SDK source (client package): https://github.com/dapr/go-sdk/tree/main/client
- Dapr Python SDK source (actor module): https://github.com/dapr/python-sdk/tree/master/dapr/actor

## Issues Found

### 1. Timer callback delivery path was incorrect (Mermaid diagram and Node.js handler)
**What was wrong:** The Mermaid diagram showed Dapr delivering timer callbacks to `PUT /actors/{type}/{id}/method/callback`, and the Node.js handler used `/actors/MonitorActor/:actorId/method/checkStatus`. According to the Dapr API reference, timer callbacks are delivered to `PUT /actors/{actorType}/{actorId}/method/timer/{timerName}`, with the literal path segment `timer/` followed by the timer name.
**What was changed:** Updated the Mermaid diagram to use `/method/timer/{name}` and the Node.js Express route to `/actors/MonitorActor/:actorId/method/timer/:timerName`.

### 2. Go SDK used deprecated struct and non-existent method
**What was wrong:** The Go example embedded `actor.ServerImplBase` (deprecated in favor of `ServerImplBaseCtx`) and called `a.RegisterActorTimer(...)` directly on the actor base struct with positional `time.Duration` arguments. This method does not exist on the base struct; timer registration is done through the Dapr client using `client.RegisterActorTimer(ctx, &dapr.RegisterActorTimerRequest{...})`.
**What was changed:** Replaced `ServerImplBase` with `ServerImplBaseCtx`, added `context.Context` parameter to `OnActivate`, replaced the direct `RegisterActorTimer` call with the Dapr client approach using `dapr.RegisterActorTimerRequest` struct, and updated imports accordingly.

### 3. Python SDK used incorrect parameter types
**What was wrong:** The `callback` parameter was passed as a string (`"checkStatus"`) instead of an awaitable callable (`self.check_status`). The `due_time` and `period` parameters were passed as strings (`"5s"`, `"10s"`) instead of `timedelta` objects. The `asyncio` import was unused.
**What was changed:** Changed `callback` from `"checkStatus"` to `self.check_status`, changed `due_time` and `period` to `timedelta(seconds=5)` and `timedelta(seconds=10)` respectively, replaced unused `import asyncio` with `from datetime import timedelta`.

### 4. dueTime format description was incomplete
**What was wrong:** The `dueTime` parameter description listed only "ISO 8601 duration or Go duration string" but omitted the RFC3339 date-time format, which Dapr also accepts for specifying an absolute fire time.
**What was changed:** Added "or RFC3339 date-time" to the `dueTime` parameter description.

## Review Notes
- The `data` field in the HTTP API curl example is shown as a JSON object (`{"threshold": 90}`), but the Dapr API reference describes `data` as a string value. In practice, Dapr implementations may accept JSON objects, but strictly per the documented API contract, `data` should be a string (e.g., a JSON-serialized string). This was left as-is to avoid cascading complexity in the examples, but authors should be aware of the documented type.
- The Timer vs. Reminder comparison table states reminders are "Persisted to state store." In newer Dapr versions, reminders use the Dapr Scheduler service rather than the actor state store directly. The functional behavior (persistence) is correct, but the underlying mechanism has changed.
- The Dapr timer registration HTTP API accepts both POST and PUT methods; the post only mentions POST, which is fine but not exhaustive.
