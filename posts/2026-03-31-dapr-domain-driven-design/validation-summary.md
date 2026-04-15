# Validation Summary: How to Use Dapr with Domain-Driven Design (DDD)

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`Dapr.Client`, `Dapr.Actors`, `Dapr.AspNetCore`)
- Dapr State Management building block
- Dapr Pub/Sub building block
- Dapr Actors building block
- ASP.NET Core (controllers, Topic attribute)
- C# / .NET (records, generics)
- Domain-Driven Design (aggregates, bounded contexts, domain events, repositories)

## Sources Consulted
- Dapr .NET SDK Actors documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/
- Dapr .NET SDK State Management documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr Pub/Sub building block documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Cross-referenced with validated Dapr blog posts in this repository (dapr-how-to-build-dapr-actors-with-net-sdk, dapr-dotnet-minimal-apis, dapr-dotnet-dependency-injection, dapr-dotnet-sdk-install-configure)

## Issues Found
1. **Actor `DaprClient` property does not exist (Critical)**
   - **What was wrong:** The `OrderActor` class accessed `DaprClient.PublishEventAsync(...)` as if `DaprClient` were a property on the `Actor` base class. The Dapr `Actor` base class does not expose a `DaprClient` property. Available properties are `StateManager`, `ProxyFactory`, `Id`, and `Host`. Attempting to use `DaprClient` directly would result in a compilation error.
   - **What was changed:** Added a `DaprClient` field injected via the constructor, along with the required `ActorHost` parameter and `base(host)` call. Changed `DaprClient.PublishEventAsync(...)` to `_daprClient.PublishEventAsync(...)`.
   - **Why:** Dapr Actors require constructor injection for any services beyond what the base `Actor` class provides. The `ActorHost` parameter is mandatory for the `Actor` base class constructor.

## Review Notes
- The DDD patterns shown (aggregate root with domain events, repository pattern dispatching events after state persistence, bounded context mapping) are sound and well-aligned with standard DDD practices.
- The `SaveAsync` method in `DaprOrderRepository` saves state and publishes events in separate calls without a transaction. This is a known limitation — Dapr does not support distributed transactions across state stores and pub/sub. The post doesn't claim atomicity, which is accurate, but readers implementing this pattern should be aware of potential inconsistency if publishing fails after state is saved.
- The `OrderCreatedEvent` record uses a positional parameter with `default` and a re-declared property to set `DateTime.UtcNow` as the actual default. This is valid C# but is an unusual pattern that may confuse some readers.
- All other Dapr API signatures (`SaveStateAsync`, `PublishEventAsync`, `GetStateAsync`, `SetStateAsync`, `[Topic]` attribute) are correct and use current, non-deprecated APIs.
- The `[Topic("pubsub", "order-created")]` attribute usage on the controller action is the correct pattern for Dapr pub/sub subscriptions in ASP.NET Core.
- The claim that Dapr Actors provide "turn-based concurrency" matching DDD aggregate single-threaded invariants is accurate — Dapr Actors guarantee single-threaded access per actor instance.
