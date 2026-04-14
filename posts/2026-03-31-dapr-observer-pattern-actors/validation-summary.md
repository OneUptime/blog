# Validation Summary: How to Implement Observer Pattern with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (.NET SDK)
- Dapr Actors (JavaScript SDK `@dapr/dapr`)
- C# / .NET
- TypeScript / JavaScript
- Observer design pattern

## Sources Consulted
- Dapr .NET SDK - Author & run actors: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK source - ActorId.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/ActorId.cs
- Dapr .NET SDK source - Actor.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs
- Dapr .NET SDK source - ActorProxy.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr/Actors/Client/ActorProxy.cs
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr JavaScript SDK - Actors: https://docs.dapr.io/developing-applications/sdks/js/js-actors/
- Dapr JS SDK source - ActorProxyBuilder.ts: https://github.com/dapr/js-sdk/blob/main/src/actors/client/ActorProxyBuilder.ts

## Issues Found

1. **`this.Id` used as string (line ~66)**: `Symbol = this.Id` assigned an `ActorId` object to what should be a `string` property. `ActorId` is a class, not a string. Fixed to `Symbol = this.Id.GetId()` which returns the underlying string value.

2. **Method name mismatch in `InvokeMethodAsync` (line ~81)**: The notification call used `InvokeMethodAsync("OnPriceChanged", update)` but the observer actor's method is named `OnPriceChangedAsync`. Dapr does not strip the "Async" suffix during method dispatch -- the string must match exactly. Fixed to `"OnPriceChangedAsync"`.

3. **Multiple parameters in `SubscribeAsync` (line ~37)**: The method was defined as `SubscribeAsync(string observerActorType, string observerActorId)` with two parameters. Dapr actor method invocation sends a single JSON request body, so actor methods support at most one parameter. A method with two string parameters cannot be correctly invoked via the Dapr HTTP/gRPC API. Fixed by changing the method to accept a single `SubscribeRequest` DTO parameter, and updated the TypeScript interface to match.

4. **JS client wrapped `UpdatePriceAsync` argument in object (line ~135)**: The call passed `{ newPrice: price }` (a JSON object) but the C# method `UpdatePriceAsync(decimal newPrice)` expects a single `decimal` value. The JSON object `{"newPrice": 42.5}` cannot deserialize to `decimal`. Fixed to pass the raw number `price` directly.

## Review Notes
- The JavaScript code uses `client.actor.invoke(actorType, actorId, methodName, body)` which is an internal/low-level API in the Dapr JS SDK. The documented public API uses `ActorProxyBuilder` to create typed proxies. The direct `invoke` call works but is not the recommended pattern. Left as-is since it's simpler for a blog tutorial and functionally correct.
- The `ObserverRef`, `PriceUpdate`, and `SubscribeRequest` model classes are referenced but not defined in the post. Their structure is inferable from usage, but readers may benefit from seeing the class definitions. This is a style choice, not a technical error.
- The `[Actor(TypeName = "...")]` attribute usage is correct per the Dapr .NET SDK documentation.
