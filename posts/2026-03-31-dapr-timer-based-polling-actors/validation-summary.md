# Validation Summary: How to Implement Timer-Based Polling with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (timers)
- Dapr .NET SDK (`Dapr.Actors`)
- Dapr HTTP Actor Invocation API
- C# / .NET
- JavaScript / Node.js

## Sources Consulted
- Dapr actor timers and reminders documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/
- Dapr .NET SDK Actor source code (`Dapr.Actors.Runtime.Actor` class) for `RegisterTimerAsync`, `UnregisterTimerAsync`, `ActorAttribute`, and `IRemindable` signatures
- Dapr JS SDK (`@dapr/dapr`) source code for `DaprClient.actor` API surface and `ActorClient` internals
- Dapr HTTP API reference for actor method invocation: https://docs.dapr.io/reference/api/actors_api/

## Issues Found

### 1. Logic bug in PollAsync - status change detection always fails
**What was wrong:** In the `PollAsync` method, `state.LastStatus` was assigned the new `status` value on line 52, but then compared against `"past_due"` on line 55. Since `state.LastStatus` was already overwritten, the condition `status == "past_due" && state.LastStatus != "past_due"` could never be true when `status == "past_due"`, meaning the status-change alert would never fire.

**What was changed:** Introduced a `previousStatus` variable to capture `state.LastStatus` before overwriting it, then used `previousStatus` in the comparison.

### 2. JavaScript SDK API does not exist
**What was wrong:** The code used `client.actor.invoke('SubscriptionMonitor', subscriptionId, 'StartMonitoringAsync', ...)` on a `DaprClient` instance. The `DaprClient.actor` property in `@dapr/dapr` is a proxy builder (`IClientActorBuilder`) with a `create<T>()` method, not a direct invocation API. The `invoke()` method exists on the internal `ActorClient.actor` object, not on `DaprClient.actor`.

**What was changed:** Replaced the JS SDK usage with direct Dapr HTTP API calls (`PUT /v1.0/actors/<type>/<id>/method/<method>`), which is the standard and well-documented approach for invoking actors, especially in cross-language scenarios.

### 3. Invalid C# syntax and unnecessary IRemindable interface
**What was wrong:** The actor class implemented `IRemindable` and included `ReceiveReminderAsync(string _, ...)` with C#-invalid `...` syntax. Since the blog is about actor timers (not reminders), implementing `IRemindable` was unnecessary and the invalid method signature would not compile.

**What was changed:** Removed `IRemindable` from the class declaration and removed the `ReceiveReminderAsync` stub method.

## Review Notes
- **Timer deactivation caveat:** Dapr actor timers do not survive actor deactivation (garbage collection). The summary claims this approach "scales to millions of monitored entities," but if actors are deactivated due to idle timeout, their timers are lost and polling stops. For polling that must survive deactivation, Dapr actor reminders (which are persisted) would be more appropriate. The blog does not mention this important distinction. A future update could add a note about this limitation and when to use reminders instead.
- The `RegisterTimerAsync` method actually returns `Task<ActorTimer>` (not `Task`), but since the return value is discarded with `await`, this does not affect correctness.
- The C# code references `externalBillingApi` and `daprClient` fields that are not declared in the class. This is acceptable for a blog tutorial showing the relevant pattern without boilerplate, but readers should understand these would need to be injected via dependency injection.
