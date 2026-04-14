# Validation Summary: How to Use Dapr with Mediator Pattern (MediatR)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Dapr .NET SDK (`Dapr.Client`, `Dapr.AspNetCore`)
- MediatR (in-process mediator / CQRS library for .NET)
- ASP.NET Core (controllers, dependency injection)
- CQRS pattern (Command Query Responsibility Segregation)

## Sources Consulted
- Dapr .NET SDK source code (`DaprClient.cs`) — https://github.com/dapr/dotnet-sdk
- `DaprClient.GetStateAsync` method signature: 3rd param is `ConsistencyMode?`, not `CancellationToken`
- `DaprClient.SaveStateAsync` method signature: 4th param is `StateOptions?`, named `cancellationToken:` usage is correct
- `DaprClient.PublishEventAsync` method signature: 4th positional param is `CancellationToken` in the primary overload
- MediatR documentation — `IRequest<T>`, `IRequestHandler<,>`, `INotification`, `INotificationHandler<>`, `RegisterServicesFromAssemblyContaining` (MediatR 12+)
- Dapr ASP.NET Core integration — `[Topic]` attribute, `AddDapr()`, `AddDaprClient()`

## Issues Found
1. **`GetStateAsync` CancellationToken passed as positional argument (compile error)**
   - **File:** `README.md`, line ~93 (GetOrderQueryHandler)
   - **What was wrong:** `await _dapr.GetStateAsync<Order>("statestore", request.OrderId, ct)` passed `ct` as the 3rd positional argument. The `GetStateAsync` method signature is `GetStateAsync<TValue>(string storeName, string key, ConsistencyMode? consistencyMode = default, ..., CancellationToken cancellationToken = default)`. The 3rd parameter is `ConsistencyMode?`, not `CancellationToken`, so this would cause a compile error since `CancellationToken` cannot implicitly convert to `ConsistencyMode?`.
   - **Fix applied:** Changed to `await _dapr.GetStateAsync<Order>("statestore", request.OrderId, cancellationToken: ct)` using a named argument to correctly target the `cancellationToken` parameter.

## Review Notes
- The `SaveStateAsync` call correctly uses a named argument (`cancellationToken: ct`) to skip over the optional `StateOptions` and `metadata` parameters — consistent with the fix applied to `GetStateAsync`.
- The `PublishEventAsync` call correctly passes `ct` positionally as the 4th argument since its primary overload has `CancellationToken` as the 4th parameter directly after `TData data`.
- The MediatR registration uses the `RegisterServicesFromAssemblyContaining<Program>()` API which is the current approach for MediatR 12+.
- The `[Topic("pubsub", "order-confirmed")]` attribute usage is correct for Dapr ASP.NET Core pub/sub subscriptions.
- The `Order` model class is referenced but not defined in the post. This is acceptable for a tutorial focused on the MediatR+Dapr integration pattern, but readers may need to infer its structure.
