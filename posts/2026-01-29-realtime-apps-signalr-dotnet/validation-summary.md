# Validation Summary: How to Build Real-Time Apps with SignalR in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core SignalR
- SignalR hubs and strongly typed hubs
- JavaScript SignalR client
- .NET SignalR client
- SignalR groups and user-based messaging
- SignalR `IHubContext`
- Redis backplane for SignalR scale-out
- C# and ASP.NET Core

## Sources Consulted
- Microsoft Learn: Overview of ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction
- Microsoft Learn: Use hubs in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs
- Microsoft Learn: ASP.NET Core SignalR JavaScript client - https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client
- Microsoft Learn: ASP.NET Core SignalR .NET client - https://learn.microsoft.com/en-us/aspnet/core/signalr/dotnet-client
- Microsoft Learn: SignalR HubContext - https://learn.microsoft.com/en-us/aspnet/core/signalr/hubcontext
- Microsoft Learn: Authentication and authorization in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz
- Microsoft Learn: Set up a Redis backplane for ASP.NET Core SignalR scale-out - https://learn.microsoft.com/en-us/aspnet/core/signalr/redis-backplane
- Microsoft Learn: ASP.NET Core SignalR configuration - https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration

## Issues Found
- The strongly typed `IHubContext` service example injected `IHubContext<NotificationHub, INotificationClient>`, but `NotificationHub` inherits from `Hub`, not `Hub<INotificationClient>`. Changed the example to inject `IHubContext<TypedNotificationHub, INotificationClient>` so it matches the strongly typed hub shown earlier.
- The Redis backplane snippet assigned a connection string to `options.Configuration` and then attempted to set `options.Configuration.ChannelPrefix`. The current documented pattern passes the connection string to `AddStackExchangeRedis(connectionString, options => ...)` and then sets `options.Configuration.ChannelPrefix`. Updated the snippet accordingly.
- The presence tracker used `ConcurrentDictionary<string, HashSet<string>>` while mutating each `HashSet<string>` without synchronization. `HashSet<T>` is not thread-safe, so simultaneous connection events could corrupt state or produce incorrect presence results. Replaced it with a locked `Dictionary<string, HashSet<string>>` sample.

## Review Notes
The SignalR transport explanation, hub setup, JavaScript client setup, .NET client setup, groups, user targeting, hub lifecycle methods, hub exceptions, and automatic reconnect examples are consistent with current Microsoft documentation. The CDN example pins the JavaScript client to version 8.0.0; that is still plausible for a .NET 8-era tutorial, though future updates may want to align the client package version with the server framework version used by the project.
