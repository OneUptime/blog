# Validation Summary: How to Implement Smart Cache with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (.NET SDK, `Dapr.Actors.Runtime`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- C# / .NET (actor implementation)
- Node.js / Express (client-side usage)

## Sources Consulted
- Dapr .NET SDK source code — `ActorAttribute.cs` (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorAttribute.cs)
- Dapr .NET SDK source code — `ActorManager.cs`, `DispatchWithoutRemotingAsync` method (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorManager.cs)
- Dapr .NET SDK source code — `Actor.cs`, `RegisterReminderAsync` (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs)
- Dapr .NET SDK source code — `ActorTypeInformation.cs` for default type name resolution (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorTypeInformation.cs)
- Dapr JS SDK source code — `IClientActor.ts` interface (https://github.com/dapr/js-sdk/blob/main/src/interfaces/Client/IClientActor.ts)
- Dapr official docs — Actors timers and reminders (https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/)
- Dapr official docs — .NET actors usage (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/)

## Issues Found
1. **Multi-parameter actor method `SetAsync(CacheValue value, int ttlSeconds)` is not supported by Dapr.**
   - **What was wrong:** The `SetAsync` method in both the interface (`ICacheEntryActor`) and the implementation (`CacheEntryActor`) had two parameters: `CacheValue value` and `int ttlSeconds`. The Dapr .NET actor runtime's `DispatchWithoutRemotingAsync` method in `ActorManager.cs` explicitly throws `ArgumentException` for methods with more than one parameter (excluding `CancellationToken`), since the HTTP actor invocation API passes a single JSON body.
   - **What was changed:** Introduced a `SetCacheRequest` DTO class with `Value` and `TtlSeconds` properties. Updated the interface to `Task SetAsync(SetCacheRequest request)` and the implementation to use `request.Value` and `request.TtlSeconds`. No changes were needed to the JavaScript client code, since it already passes `{ value: fresh, ttlSeconds }` as a single object, which naturally maps to the DTO.
   - **Why:** Actor methods invoked via the Dapr HTTP API (`PUT /v1.0/actors/{type}/{id}/method/{method}`) receive a single JSON body. The .NET SDK enforces a single-parameter limit at runtime.

## Review Notes
- The `[Actor(TypeName = "CacheEntry")]` attribute is correct — it exists in `Dapr.Actors.Runtime` and overrides the default type name (which would otherwise be "CacheEntryActor").
- `TimeSpan.FromMilliseconds(-1)` for the reminder period is correct for one-shot reminders — it equals `Timeout.InfiniteTimeSpan`, which the SDK validates as the minimum allowed period value.
- The `ReceiveReminderAsync` method uses `...` as an ellipsis for the remaining parameters. While not valid C# syntax, this is acceptable shorthand in a blog post. The full signature is `Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)`.
- The JavaScript `client.actor.invoke(actorType, actorId, methodName, body?)` API is a valid low-level API in the Dapr JS SDK. The recommended higher-level approach is to use `ActorProxyBuilder`, but the low-level API is acceptable for illustrative purposes.
- The monitoring snippet `stats.hits / (stats.hits + stats.misses)` would produce `NaN` (0/0) for an actor with no accesses. This is a minor edge case in example code, not a technical error in the Dapr API usage.
