# Validation Summary: How to Use Dapr Actor Timers for In-Memory Scheduled Callbacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — Actors building block
- Dapr .NET SDK (`RegisterTimerAsync`, `UnregisterTimerAsync`)
- Dapr Python SDK (`register_timer`, `unregister_timer`)
- C# / .NET
- Python
- Kubernetes (kubectl for log observation)

## Sources Consulted
- Dapr official docs — Actor timers and reminders: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/
- Dapr official docs — How-to: Use actors: https://docs.dapr.io/developing-applications/building-blocks/actors/howto-actors/
- Dapr .NET SDK source — `Actor.cs` `RegisterTimerAsync` and `UnregisterTimerAsync` method signatures
- Dapr Python SDK source — `actor.py` `register_timer` and `unregister_timer` method signatures
- Dapr HTTP API reference for actor timer registration

## Issues Found
No technical issues found.

## Review Notes
- The one-shot timer example uses `TimeSpan.FromMilliseconds(-1)` for the `period` parameter. This is valid and documented in the .NET SDK source code XML comments ("Specify negative one (-1) milliseconds to disable periodic signaling"). However, the official Dapr concept docs recommend omitting the `period` field entirely or setting it to an empty string for one-shot timers. Both approaches work; the blog uses a valid SDK-level mechanism.
- The `RegisterTimerAsync` return type is `Task<ActorTimer>` (not `Task`), but since the blog examples do not capture the return value, this is perfectly fine and idiomatic.
- All code examples use current, non-deprecated APIs as of Dapr 1.x stable releases.
- The timer vs reminder distinction, turn-based concurrency model, and lifecycle behavior are all accurately described.
