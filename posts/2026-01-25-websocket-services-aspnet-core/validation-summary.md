# Validation Summary: How to Build WebSocket Services in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core
- C#
- System.Net.WebSockets
- JSON message serialization
- JWT-style token validation
- StackExchange.Redis
- Redis Pub/Sub
- ASP.NET Core health checks
- Hosted services / graceful shutdown

## Sources Consulted
- Microsoft Learn: WebSockets support in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/websockets
- Microsoft Learn: WebSocketOptions class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.websocketoptions
- Microsoft Learn: WebSocket.SendAsync method - https://learn.microsoft.com/en-us/dotnet/api/system.net.websockets.websocket.sendasync
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: Security considerations in ASP.NET Core SignalR, access token logging guidance for WebSockets/SSE - https://learn.microsoft.com/en-us/aspnet/core/signalr/security
- StackExchange.Redis documentation: Basic usage and pub/sub - https://stackexchange.github.io/StackExchange.Redis/Basics.html
- Redis documentation: Pub/Sub delivery semantics - https://redis.io/docs/latest/develop/pubsub/

## Issues Found
- `WebSocketOptions.ReceiveBufferSize` was used as a message-size limit. Microsoft documents this property as obsolete and says setting it has no effect. Removed it and kept current keep-alive options.
- The `KeepAliveInterval` comment described waiting for a pong response. Microsoft documents `KeepAliveInterval` as the interval for sending keep-alive frames, while `KeepAliveTimeout` is the pong timeout. Updated the comments and added `KeepAliveTimeout`.
- `MessageBroadcaster` was registered in `Program.cs` but was not defined anywhere in the post. Replaced it with the `ChannelManager` shown later in the article.
- The connection manager used concurrent broadcasts without serializing sends per socket. Microsoft documents that only one send and one receive are supported in parallel on a `WebSocket`; multiple concurrent sends are undefined behavior. Added per-connection `SemaphoreSlim` send locks.
- Later examples referenced `GetConnectionCount()` and `CloseAllConnectionsAsync()` on `WebSocketConnectionManager`, but those methods were not defined. Added them to the connection manager example.
- `MessageHandler` called `HandleSubscribeAsync`, `HandleUnsubscribeAsync`, and `HandleBroadcastAsync` without defining them or injecting the channel manager needed for subscriptions. Added the `ChannelManager` dependency and implemented the handlers.
- `MessageHandler` called `message.Type.ToLowerInvariant()` without first checking that a deserialized message type was present. Added a validation check so malformed messages return a protocol error instead of throwing.
- `RedisBackplane` called `BroadcastToChannelAsync()` on `WebSocketConnectionManager`, but that method was not defined. Updated the backplane to use the existing `ChannelManager.PublishAsync()` for local channel delivery.
- The health check comment said "unhealthy" while returning `HealthCheckResult.Degraded`. Updated the comment to match the code and ASP.NET Core health check status model.

## Review Notes
- The examples are still intentionally tutorial-sized. A production implementation should also consider origin restrictions for browser WebSocket clients, maximum application-level message sizes, cancellation handling, backpressure, Redis Pub/Sub's at-most-once delivery semantics, and whether ASP.NET Core SignalR is a better fit for the application.
