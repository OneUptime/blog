# Validation Summary: How to Build Real-Time Leaderboards with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (Dapr.Actors, Dapr.Actors.Runtime .NET SDK)
- Dapr Pub/Sub
- Dapr JavaScript SDK (@dapr/dapr)
- C# / .NET
- Node.js / Express
- WebSockets (ws library)

## Sources Consulted
- Dapr .NET SDK source code and API reference (Dapr.Actors, Dapr.Actors.Runtime NuGet packages) — https://github.com/dapr/dotnet-sdk
- Dapr JavaScript SDK source code and API reference (@dapr/dapr) — https://github.com/dapr/js-sdk
- Dapr Actors documentation — https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr Pub/Sub documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/

## Issues Found

1. **Missing `ActorHost` constructor in `PlayerActor`**: Dapr .NET actors require a constructor that accepts `ActorHost` and calls `base(host)`. Added `public PlayerActor(ActorHost host) : base(host) { }`.

2. **`new DaprClient()` is invalid — `DaprClient` is abstract**: The code used `new DaprClient()` in both `PlayerActor` and `LeaderboardActor`, but `DaprClient` is an abstract class with no public constructor. For `LeaderboardActor`, replaced with constructor-injected `DaprClient` via DI (supported by `DependencyInjectionActorActivator`). For `PlayerActor`, removed entirely since it's not needed.

3. **`DaprClient.InvokeActorMethodAsync` does not exist**: The `PlayerActor` used a non-existent `InvokeActorMethodAsync` method on `DaprClient`. Replaced with the correct actor-to-actor communication pattern using `ProxyFactory.CreateActorProxy<ILeaderboardActor>(new ActorId("global"), "LeaderboardActor")`, which is available on the `Actor` base class.

4. **`SortedList<int, string>` duplicate key bug**: `SortedList` does not allow duplicate keys. If two players had the same score, inserting would either throw an `ArgumentException` or silently overwrite the other player's entry. Replaced with `Dictionary<string, int>` (playerId to score mapping), which naturally handles score updates and supports multiple players with the same score. Sorting is done on read via LINQ.

5. **Missing `IRemindable` interface on `LeaderboardActor`**: Actors that use reminders must implement `IRemindable`. Added `IRemindable` to the class declaration.

6. **Missing constructor in `LeaderboardActor`**: Added constructor with `ActorHost` and `DaprClient` parameters for proper initialization and DI.

7. **Undefined `daprClient` variable in `ReceiveReminderAsync`**: The reminder callback referenced a local variable `daprClient` that was only defined in `UpdateScore`. Changed to use the class-level `_daprClient` field.

8. **JS SDK: `client.actor.invoke()` is not a valid API**: The `@dapr/dapr` SDK does not expose `client.actor.invoke()`. Replaced with the correct `ActorProxyBuilder` pattern: create a builder, build a proxy with `ActorId`, and call methods directly on the proxy.

9. **JS SDK: `serverPort` should be a string**: `DaprServer` constructor expects `serverPort` as a string. Changed `3001` to `"3001"`.

10. **JS SDK: Missing `await daprServer.start()`**: `DaprServer` must be started after registering handlers. Added the required `start()` call.

11. **JS SDK: Method name casing mismatch**: The JS code called `addScore` (camelCase) but the C# actor method is `AddScore` (PascalCase). Dapr's HTTP API uses the exact method name from the actor interface. Fixed to `AddScore`.

12. **State type consistency in reminder**: Updated `ReceiveReminderAsync` to use `Dictionary<string, int>` instead of `SortedList<int, string>` to match the corrected `UpdateScore` method, and added sorting before publishing.

## Review Notes
- The `[Actor(TypeName = "...")]` attribute is valid in the Dapr .NET SDK and was left as-is.
- The blog post omits actor registration in `Program.cs` (e.g., `builder.Services.AddActors(options => { options.Actors.RegisterActor<PlayerActor>(); })`). This is acceptable for a tutorial focused on actor logic rather than boilerplate setup.
- The `ResetScore` method declared in `IPlayerActor` is never implemented in the `PlayerActor` class. This is a minor omission but acceptable for a tutorial.
- The WebSocket section wraps pub/sub subscription and server start in `await` at the top level, which requires either an async IIFE wrapper or top-level await (Node.js ES modules). This is a common tutorial simplification.
- The single `LeaderboardActor` with ID "global" could become a bottleneck at very high scale since all score updates are serialized through it. This is architecturally valid for the tutorial's scope but worth noting for production use.
