# Validation Summary: How to Use Actor Reminders in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (actor building block, reminders)
- .NET / C# (Dapr .NET SDK — Dapr.Actors.Runtime)
- Python (Dapr Python SDK — dapr.actor)
- Dapr HTTP API (actor reminders endpoints)

## Sources Consulted
- Dapr Actors Timers and Reminders documentation — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/
- Dapr Actors API Reference — https://docs.dapr.io/reference/api/actors_api/
- Dapr .NET Actor SDK Usage — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr Python Actor SDK — https://docs.dapr.io/developing-applications/sdks/python/python-actor/
- Dapr Python SDK source (actor.py, remindable.py) — https://github.com/dapr/python-sdk
- Dapr Scheduler Service documentation — https://docs.dapr.io/concepts/dapr-services/scheduler/

## Issues Found

1. **Missing `IRemindable` interface on .NET actor classes (High severity):** Both `SubscriptionActor` and `BillingActor` inherited from `Actor` and their respective interfaces but did not implement `IRemindable`. The Dapr .NET SDK requires actors to explicitly implement `IRemindable` to receive reminder callbacks. Added `IRemindable` to both class declarations.

2. **Missing `Remindable` mixin on Python actor class (High severity):** `OrderActor` only inherited from `Actor` but did not include the `Remindable` mixin. The Dapr Python SDK requires actors to inherit from `Remindable` to use reminders. Added `Remindable` to the import and class inheritance.

3. **Misleading claim about `data` field encoding (Low severity):** The post stated the HTTP API `data` field is "base64-encoded." In reality, the `data` field is a plain string — base64 is one option for encoding binary data but is not required. Clarified the description.

4. **Outdated state store claim (Medium severity):** The post stated reminders are stored in "the configured state store." Since Dapr v1.15, reminders default to the Scheduler service instead of the actor state store. Updated the introduction and summary to reflect this change.

5. **Missing ISO 8601 duration format mention (Low severity):** The post only mentioned Go duration format for `dueTime` and `period`. Dapr also supports ISO 8601 durations (e.g., `"PT24H"`). Added a note about ISO 8601 support.

## Review Notes
- The Go duration format examples `"168h0m0s0ms"` and `"24h0m0s0ms"` are valid but unnecessarily verbose. Simpler forms like `"168h"` and `"24h"` work identically. Left as-is since they are functionally correct.
- The `RegisterReminderAsync` and `ReceiveReminderAsync` method signatures in both .NET examples are correct after the `IRemindable` fix.
- The Python `register_reminder` parameter names (`name`, `state`, `due_time`, `period`) and types (str, bytes, timedelta, timedelta) are correct in this post.
- The HTTP API endpoint paths (`/v1.0/actors/{actorType}/{actorId}/reminders/{name}`) and methods (POST/GET/DELETE) are all correct.
- General claims about at-least-once delivery semantics and reminders surviving deactivation/restarts are accurate.
