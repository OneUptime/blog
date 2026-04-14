# Validation Summary: How to Build Dapr Actors with .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`Dapr.Actors`, `Dapr.Actors.AspNetCore`)
- ASP.NET Core (.NET 8)
- C# (records, pattern matching, minimal APIs)
- Dapr Actor model (virtual actors, state management, timers, reminders)

## Sources Consulted
- Dapr .NET SDK source code on GitHub (`github.com/dapr/dotnet-sdk`) — verified Actor base class, ActorHost constructor, IActor interface, IRemindable interface, RegisterTimerAsync/RegisterReminderAsync signatures, ActorRuntimeOptions properties, MapActorsHandlers extension, IActorProxyFactory registration
- NuGet registry for `Dapr.Actors` and `Dapr.Actors.AspNetCore` — confirmed package names and version 1.14.0 existence
- Dapr official documentation (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/) — verified actor programming model, timer/reminder semantics, and host configuration

## Issues Found

1. **Timer callback exposed on actor interface (design error)**: The `ISessionActor` interface included `Task HeartbeatTimerCallback(byte[] state)` as a public method. Timer callbacks are internal implementation details — the Dapr runtime locates them via reflection (using both public and non-public binding flags), so they do not need to be on the interface. Exposing them on the interface would allow external callers to invoke the callback directly via a proxy, which is unintended. **Fix:** Changed `HeartbeatTimerCallback` from `public` to `private` on the `SessionActor` class, and removed it from the `ISessionActor` interface.

## Review Notes
- The `Dapr.Actors` package version 1.14.0 used in the project file is a real published version but not the latest (1.17.x is current as of this review). The post does not claim it is the latest, so no change was made. Readers may want to use a newer version.
- All core APIs are verified correct: `IActor` marker interface, `Actor` base class with `ActorHost` constructor, `OnActivateAsync` lifecycle method, `StateManager` CRUD operations, `IActorProxyFactory` DI registration via `AddActors`, `MapActorsHandlers` endpoint mapping, `RegisterTimerAsync`/`RegisterReminderAsync` signatures, `IRemindable.ReceiveReminderAsync` contract, and `TimeSpan.FromMilliseconds(-1)` for one-shot reminders.
- The `dapr run` CLI command syntax is correct.
- The `[Actor(TypeName = "...")]` attribute usage is correct (maps to `ActorAttribute` in `Dapr.Actors.Runtime`).
