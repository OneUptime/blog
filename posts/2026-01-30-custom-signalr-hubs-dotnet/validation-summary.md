# Validation Summary: How to Build Custom SignalR Hubs in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- ASP.NET Core SignalR
- C#
- SignalR hub filters
- SignalR authentication and authorization
- SignalR custom user ID providers
- MessagePack Hub Protocol
- Dependency injection
- JWT bearer authentication
- Moq and xUnit

## Sources Consulted
- Microsoft Learn: Use hub filters in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hub-filters
- Microsoft Learn: Use hubs in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs
- Microsoft Learn: Use MessagePack Hub Protocol in SignalR for ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/signalr/messagepackhubprotocol
- Microsoft Learn: ASP.NET Core SignalR authentication and authorization - https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz
- Microsoft Learn: ASP.NET Core SignalR configuration - https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The MessagePack install command used the older `dotnet add package` form. Updated it to the current .NET 10 noun-first `dotnet package add` command from the official .NET CLI documentation.
- The server-side MessagePack options snippet referenced MessagePack types without importing their namespace. Added `using MessagePack;` so the snippet includes the required namespace for `MessagePackSerializerOptions`, `MessagePackSecurity`, and `MessagePackCompression`.
- The .NET MessagePack client snippet imported `Microsoft.AspNetCore.SignalR.Protocol`, but the official client example uses `Microsoft.Extensions.DependencyInjection` for the `AddMessagePackProtocol` extension method. Updated the using directive.
- The scoped-service hub guidance recommended resolving scoped services manually with `IServiceScopeFactory`. SignalR hubs support constructor and method injection from DI, so the example now injects `AppDbContext` directly.
- `InMemoryConnectionTracker.GetRoomUsersAsync` returned connection IDs even though the method name and interface contract described room users. Added connection-to-user tracking and updated the method to return distinct user IDs. Also locked read paths and cleaned up empty room sets to keep the in-memory tracker consistent under concurrent access.

## Review Notes
The remaining examples align with current ASP.NET Core SignalR documentation. The in-memory connection tracker is appropriate only for single-server deployments, as the post states; multi-server deployments should use a distributed backplane or external store.
