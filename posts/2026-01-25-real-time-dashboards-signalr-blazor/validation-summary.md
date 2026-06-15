# Validation Summary: How to Build Real-Time Dashboards with SignalR and Blazor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- ASP.NET Core
- Blazor
- SignalR
- WebSockets
- Server-Sent Events
- Long Polling
- Redis backplane
- StackExchange.Redis
- C#
- Razor components

## Sources Consulted
- Microsoft Learn: Overview of ASP.NET Core SignalR: https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction
- Microsoft Learn: Use hubs in ASP.NET Core SignalR: https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs
- Microsoft Learn: ASP.NET Core SignalR .NET client: https://learn.microsoft.com/en-us/aspnet/core/signalr/dotnet-client
- Microsoft Learn: Use ASP.NET Core SignalR with Blazor: https://learn.microsoft.com/en-us/aspnet/core/blazor/tutorials/signalr-blazor
- Microsoft Learn: Manage users and groups in SignalR: https://learn.microsoft.com/en-us/aspnet/core/signalr/groups
- Microsoft Learn: Redis backplane for ASP.NET Core SignalR scale-out: https://learn.microsoft.com/en-us/aspnet/core/signalr/redis-backplane
- Microsoft Learn: ASP.NET Core SignalR production hosting and scaling: https://learn.microsoft.com/en-us/aspnet/core/signalr/scale
- Microsoft Learn: ASP.NET Core Razor component rendering: https://learn.microsoft.com/en-us/aspnet/core/blazor/components/rendering
- Microsoft Learn: ASP.NET Core Blazor synchronization context: https://learn.microsoft.com/en-us/aspnet/core/blazor/components/synchronization-context

## Issues Found
- The introduction implied that SignalR specifically handles WebSocket connections. Updated it to state that SignalR uses persistent real-time connections, choosing WebSockets when available and falling back to other transports when needed.
- The architecture explanation said Blazor components re-render automatically when their state changes. Updated it to clarify that components re-render when notified of state changes, matching Blazor's `StateHasChanged` rendering model.
- The background service would log normal shutdown cancellation as an error if `Task.Delay` was canceled. Added a cancellation check in the catch block so shutdown exits cleanly.
- The dashboard component subscribed to SignalR groups only on initial connection. Since ASP.NET Core SignalR group membership is not preserved when a connection reconnects, added a helper method and re-subscribed in the `Reconnected` handler.
- The chart component could divide by zero when all data points had the same value, especially zero. Added a guard that widens the range when the computed maximum is not greater than the minimum.

## Review Notes
The strongly typed hub pattern, `IHubContext<THub, TClient>` broadcaster, `AddSignalR`, `MapHub`, Blazor `HubConnectionBuilder`, `WithAutomaticReconnect`, `InvokeAsync(StateHasChanged)`, and Redis `AddStackExchangeRedis` usage match current Microsoft documentation. The Redis backplane snippet omits package and `using StackExchange.Redis;` details, which is acceptable for a focused blog excerpt but readers copying it into a fresh project need the `Microsoft.AspNetCore.SignalR.StackExchangeRedis` package and appropriate namespace import.
