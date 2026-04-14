# Validation Summary: How to Use Dapr with Vertical Slice Architecture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) - .NET SDK (`Dapr.Client`)
- C# / .NET (Minimal APIs, records)
- MediatR (CQRS/Mediator pattern, v12+)
- Moq (unit testing mock framework)
- ASP.NET Core Minimal APIs
- Vertical Slice Architecture (design pattern)

## Sources Consulted
- Dapr .NET Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr dotnet-sdk GitHub source (DaprClient.cs): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- MediatR 12.x migration guide: https://github.com/jbogard/MediatR/wiki/Migration-Guide-11.x-to-12.0
- ASP.NET Core Minimal APIs documentation: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis

## Issues Found
1. **Unit test `PublishEventAsync` verification would fail at runtime due to generic type mismatch.**
   - **What was wrong:** The handler used an anonymous type (`new { OrderId = ..., CustomerId = ... }`) for the published event, but the test verified with `It.IsAny<object>()`. Moq resolves these as different generic instantiations (`PublishEventAsync<AnonymousType>` vs `PublishEventAsync<object>`), so the `Verify` call would throw a `MockException` at runtime because no matching call was recorded.
   - **What was changed:** Introduced a named `OrderCreatedEvent` record type. Updated the handler to publish using `new OrderCreatedEvent(...)` instead of an anonymous object, and updated the test verify to use `It.IsAny<OrderCreatedEvent>()`.
   - **Why:** Named types ensure the generic type parameter is consistent between the production code and the test verification, making the test actually pass.

## Review Notes
- All Dapr SDK API calls (`SaveStateAsync`, `GetStateAsync`, `PublishEventAsync`, `AddDaprClient`) use correct signatures and current (non-deprecated) APIs.
- The MediatR registration syntax (`RegisterServicesFromAssemblyContaining<Program>`) is correct for MediatR 12+.
- `DaprClient` is an abstract class, so `new Mock<DaprClient>()` is valid.
- The `SaveStateAsync` verify in the test correctly passes `null, null` for the optional `StateOptions` and `IReadOnlyDictionary<string, string>` parameters, which matches the `default` values passed by the handler.
- The Minimal API endpoint patterns are correct for ASP.NET Core 6+.
