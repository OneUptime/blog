# Validation Summary: How to Use Dapr Actor Reminders for Persistent Scheduled Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Actor Reminders API (HTTP)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr-ext-grpc` / `dapr` package)
- Node.js / Express (HTTP callback example)

## Sources Consulted
- Dapr Actor Reminders API reference — https://docs.dapr.io/reference/api/actors_api/
- Dapr Actor Timers and Reminders overview — https://docs.dapr.io/developing-applications/building-blocks/actors/howto-actors/
- Dapr Go SDK actor examples — https://github.com/dapr/go-sdk/tree/main/examples/actor
- Dapr Python SDK actor examples — https://github.com/dapr/python-sdk/tree/master/examples/demo_actor
- Dapr state store component configuration — https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found

### 1. Reminder callback HTTP path missing `/remind/` segment (Express.js example)
- **What was wrong:** The Express route was `app.put('/actors/SubscriptionActor/:actorId/method/renewalAlert', ...)`. Dapr actually calls `PUT /actors/{actorType}/{actorId}/method/remind/{reminderName}` — note the `/remind/` segment between `method` and the reminder name.
- **What was changed:** Fixed the route to `/actors/SubscriptionActor/:actorId/method/remind/:reminderName` and updated the handler to extract `reminderName` from params.
- **Why:** An app using the original path would never receive reminder callbacks from Dapr.

### 2. Go SDK: deprecated struct, wrong registration API, wrong callback mechanism
- **What was wrong:**
  - Used `actor.ServerImplBase` which is deprecated; the current struct is `actor.ServerImplBaseCtx`.
  - Called `a.RegisterActorReminder(...)` as a method on the actor struct. In the Go SDK, `RegisterActorReminder` is a method on `dapr.Client`, not on the actor base struct.
  - The callback was a method named `RenewalAlert` matching the reminder name. The Go SDK requires implementing the `ReminderCallee` interface with a single `ReminderCall(reminderName, state, dueTime, period)` method that handles all reminders.
- **What was changed:** Rewrote the Go example to use `actor.ServerImplBaseCtx`, call `a.daprClient.RegisterActorReminder(ctx, &dapr.RegisterActorReminderRequest{...})`, and implement the `ReminderCall` method with dispatch by reminder name.
- **Why:** The original code would not compile against the current Dapr Go SDK.

### 3. Python SDK: wrong parameter names, wrong types, wrong callback mechanism
- **What was wrong:**
  - Used `reminder_name=` parameter (correct name is `name=`).
  - Passed a dict for `state` (must be `bytes`).
  - Passed strings like `"72h"` for `due_time` and `period` (must be `datetime.timedelta` objects).
  - The callback was `async def renewal_alert(self, data: dict)`. The Python SDK requires implementing the `Remindable` mixin and defining `receive_reminder(self, name, state, due_time, period, ttl)`.
- **What was changed:** Rewrote the Python example to use correct parameter names and types, implement `Remindable`, and define `receive_reminder` with proper dispatch logic.
- **Why:** The original code would raise `TypeError` at runtime due to incorrect parameter names and types.

### 4. Incorrect SDK method name for deleting reminders
- **What was wrong:** Referenced `UnregisterReminder` for the Go SDK. The correct method name is `UnregisterActorReminder`.
- **What was changed:** Updated to `UnregisterActorReminder` (Go) and `unregister_reminder` (Python).
- **Why:** Using the wrong method name would cause a compile/runtime error.

## Review Notes
- The HTTP API endpoints (register, get, delete reminders) and request/response fields are all correct.
- The conceptual explanations of reminders vs. timers, persistence behavior, and architecture diagrams are accurate.
- The state store prerequisite (`actorStateStore: "true"`) is correct.
- The `dueTime` format claim (supports ISO 8601 and Go duration strings) is correct per Dapr docs.
- The one-shot reminder example (omitting `period`) is correct.
