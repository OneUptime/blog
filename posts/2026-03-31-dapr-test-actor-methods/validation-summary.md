# Validation Summary: How to Test Dapr Actor Methods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (.NET SDK)
- C# / .NET
- Dapr.Actors.Runtime (ActorHost, IActorStateManager, ConditionalValue, Actor base class)
- Moq (mocking framework)
- xUnit (test framework)

## Sources Consulted
- Dapr .NET SDK source code on GitHub (dapr/dotnet-sdk) — ActorHost.CreateForTest, ActorTestOptions, IActorStateManager, ConditionalValue, Actor base class
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/

## Issues Found

### 1. `ActorTestOptions` does not have a `StateManager` property (Critical)
**What was wrong:** The blog post used `new ActorTestOptions { StateManager = _mockStateManager.Object }` to inject a mock state manager via `ActorTestOptions`. However, `ActorTestOptions` does not have a `StateManager` property. Its actual properties are `ActorId`, `LoggerFactory`, `JsonSerializerOptions`, `ProxyFactory`, and `TimerManager`.

**What was changed:** 
- Updated the actor constructor to accept an optional `IActorStateManager` parameter and assign it to the protected `StateManager` property (the documented Dapr pattern for testable actors).
- Updated the test setup to pass the mock state manager through the actor constructor instead of through `ActorTestOptions`.
- Updated the summary paragraph to reflect the constructor injection pattern.

**Why:** The original code would not compile. `ActorTestOptions` has no `StateManager` property, so the correct pattern is constructor injection on the actor class itself, using the `protected set` accessor on `Actor.StateManager`.

## Review Notes
- The `UpdateStatusAsync` method mutates `order.Status` and `order.UpdatedAt` before performing the validation check. If validation fails, the in-memory object is left in a modified state. This does not affect the tests (each test sets up independent mocks), but it is a design concern in production code. Not fixed since it is a code design choice rather than a technical error in the testing tutorial.
- The `[Actor(TypeName = "OrderActor")]` attribute, `IActor` marker interface, `ConditionalValue<T>` struct, and all `IActorStateManager` method signatures were verified as correct against the Dapr .NET SDK source.
- The math in the `GetTotalAsync` test is correct: (10.00 * 2) + (5.50 * 4) = 42.00.
