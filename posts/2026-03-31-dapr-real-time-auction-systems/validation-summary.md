# Validation Summary: How to Build Real-Time Auction Systems with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (.NET SDK)
- Dapr Pub/Sub
- Dapr JavaScript SDK (DaprServer)
- Dapr HTTP Actor Invocation API
- C# / .NET
- Node.js / JavaScript
- WebSocket (ws library)

## Sources Consulted
- Dapr .NET SDK Actor usage docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK Actor how-to: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr .NET SDK source (Actor.cs): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs
- Dapr .NET SDK source (ActorStateManager.cs): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorStateManager.cs
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-actors/
- Dapr JavaScript Server SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr .NET client docs (PublishEventAsync): https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/

## Issues Found

1. **Missing `ActorHost` constructor**: The `AuctionActor` class was missing the required constructor that accepts `ActorHost` and passes it to the `Actor` base class. Without this, the Dapr runtime cannot instantiate the actor. Added `public AuctionActor(ActorHost host, DaprClient dapr) : base(host)` constructor.

2. **Missing `IRemindable` interface**: The actor class used reminders (`RegisterReminderAsync` / `ReceiveReminderAsync`) but did not implement `IRemindable`. Without this interface, the Dapr runtime will not dispatch reminders to the actor. Added `IRemindable` to the class declaration.

3. **Incorrect one-shot reminder period**: The post used `TimeSpan.FromMilliseconds(-1)` as the period for a one-shot reminder. While this may technically work due to SDK serialization handling, it is not the documented approach and has historically caused issues (dapr/dotnet-sdk#208). Changed to `Timeout.InfiniteTimeSpan` which is the standard .NET pattern for non-repeating timers.

4. **Non-existent JavaScript actor invocation API**: The post used `client.actor.invoke('AuctionActor', auctionId, 'placeBid', ...)` which does not exist in the `@dapr/dapr` JavaScript SDK. The JS SDK uses `ActorProxyBuilder` for typed actor proxies, which requires defining a JS class mirroring the actor interface. Since the actors are implemented in C#, replaced with the Dapr HTTP Actor Invocation API (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) using `fetch`, which is the simplest cross-language approach.

5. **Missing `daprServer.start()` call**: The WebSocket/pub-sub section created a `DaprServer` and subscribed to a topic but never called `await daprServer.start()`, which is required to begin listening for pub/sub messages. Added the missing `start()` call.

## Review Notes
- The `StateManager.GetOrAddStateAsync` and `StateManager.SetStateAsync` APIs are correct and current.
- The `PublishEventAsync` usage on `DaprClient` is correct.
- The `OnActivateAsync` override pattern is correct.
- The `[Actor(TypeName = "AuctionActor")]` attribute usage is correct.
- The overall architectural pattern (actor-per-auction for bid serialization, pub/sub for broadcasting, reminders for auto-close) is a sound and well-suited use of Dapr's capabilities.
- The `DaprServer` pubsub subscribe callback actually receives `(data, headers)` per the SDK signature; the post only uses the first parameter which is fine in JavaScript but worth noting for completeness.
