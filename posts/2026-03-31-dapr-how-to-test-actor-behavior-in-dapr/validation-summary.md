# Validation Summary: How to Test Actor Behavior in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (.NET SDK) — virtual actors, state management, reminders, timers
- C# / .NET — xUnit, Moq, FluentAssertions
- Dapr Actors Runtime — `ActorHost.CreateForTest`, `ActorTestOptions`, `IActorStateManager`
- Dapr Actors Client — `ActorProxy`, `ActorProxyOptions`

## Sources Consulted
- Dapr .NET SDK source — `Actor.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs (confirmed `StateManager` has a `protected set`)
- Dapr .NET SDK source — `ActorTestOptions.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorTestOptions.cs (confirmed properties: `ActorId`, `LoggerFactory`, `JsonSerializerOptions`, `ProxyFactory`, `TimerManager`)
- Dapr .NET SDK source — `ActorProxyOptions.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Client/ActorProxyOptions.cs (confirmed `HttpEndpoint` is `string`, not `Uri`)
- Dapr .NET SDK source — `IActorStateManager.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/IActorStateManager.cs
- Dapr .NET SDK source — `IRemindable.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/IRemindable.cs (confirmed `ReceiveReminderAsync` signature)
- Dapr official docs — .NET actors usage: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK GitHub issues #1230 and #173 — unit testing actors limitations

## Issues Found

### 1. Mock `IActorStateManager` never injected into actor (Critical)
**What was wrong:** The test constructor created a `Mock<IActorStateManager>` and set up expectations on it, but never connected it to the actor instance. The `Actor` base class sets `StateManager` to a real `ActorStateManager` in its constructor. Since `StateManager` has a `protected set`, external test code cannot assign to it directly. The mock's setups would never be called — the actor would use its internal state manager, which would likely throw without a Dapr state provider.

**What was changed:** Added reflection-based injection after actor construction:
```csharp
typeof(Actor).GetProperty(nameof(Actor.StateManager))!
    .SetValue(_actor, _stateManagerMock.Object);
```
Also updated the section's introductory text to explain why reflection is needed.

### 2. Unused `actorTypeInfo` variable (Minor)
**What was wrong:** `var actorTypeInfo = ActorTypeInformation.Get(typeof(ShoppingCartActor), "ShoppingCart");` was assigned but never used anywhere in the test.

**What was changed:** Removed the unused line.

### 3. `ActorProxyOptions.HttpEndpoint` type mismatch (Compile error)
**What was wrong:** The integration test assigned `new Uri($"http://localhost:{DaprPort}")` to `HttpEndpoint`, but `ActorProxyOptions.HttpEndpoint` is of type `string`, not `Uri`. This would cause a compile-time type error.

**What was changed:** Changed to a string: `$"http://localhost:{DaprPort}"`.

## Review Notes
- The `ActorTypeInformation.Get(Type, string)` overload used in the original code is functional but the single-parameter overload `Get(Type)` is marked obsolete. Since the two-parameter version was used and the line was removed as unused, this is not an issue.
- The reminder test section references `OrderReminderActor` and `ReminderPayload` types that are not defined in the post. This is acceptable since the section is illustrative, but readers would need to define these types themselves.
- The integration test uses `Task.Delay(3000)` to wait for the Dapr sidecar, which is fragile. A health-check polling loop would be more robust, but this is a style/robustness concern rather than a correctness issue.
- `ActorTestOptions` does not provide a `StateManager` property, confirming that reflection is currently the only way to inject a mock state manager for unit testing Dapr actors. This is a known SDK limitation (GitHub issues #1230 and #173).
