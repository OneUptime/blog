# How to Build WebSocket Services in ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, WebSockets, ASP.NET Core, Real-time

Description: Learn how to build production-ready WebSocket services in ASP.NET Core with connection management, message broadcasting, authentication, and horizontal scaling patterns.

---

Real-time communication is essential for modern applications. Whether you are building a chat system, live notifications, collaborative editing, or streaming dashboards, WebSockets provide the persistent bidirectional connection you need. ASP.NET Core has excellent built-in support for WebSockets, and this guide walks you through building production-ready WebSocket services.

## Basic WebSocket Setup

First, enable WebSockets in your ASP.NET Core application. The middleware handles the protocol upgrade from HTTP to WebSocket.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add services for WebSocket handling
builder.Services.AddSingleton<WebSocketConnectionManager>();
builder.Services.AddSingleton<MessageBroadcaster>();

var app = builder.Build();

// Enable WebSocket support with configuration options
var webSocketOptions = new WebSocketOptions
{
    // How long to wait for a pong response before closing the connection
    KeepAliveInterval = TimeSpan.FromSeconds(30),
    // Maximum size of a single message (prevent memory exhaustion attacks)
    ReceiveBufferSize = 4 * 1024  // 4 KB
};

app.UseWebSockets(webSocketOptions);

// Map WebSocket endpoint
app.Map("/ws", async context =>
{
    // Check if this is actually a WebSocket request
    if (context.WebSockets.IsWebSocketRequest)
    {
        var connectionManager = context.RequestServices
            .GetRequiredService<WebSocketConnectionManager>();

        // Accept the WebSocket connection and handle it
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        await connectionManager.HandleConnectionAsync(webSocket, context);
    }
    else
    {
        // Return 400 Bad Request for non-WebSocket requests
        context.Response.StatusCode = 400;
    }
});

app.Run();
```

## Connection Manager

A connection manager tracks active WebSocket connections. This is crucial for broadcasting messages to all connected clients or specific groups.

```csharp
// WebSocketConnectionManager.cs
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;

public class WebSocketConnectionManager
{
    // Thread-safe dictionary to store active connections
    // Key: unique connection ID, Value: WebSocket instance
    private readonly ConcurrentDictionary<string, WebSocket> _connections = new();

    // Track which user owns which connections (one user can have multiple tabs)
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();

    private readonly ILogger<WebSocketConnectionManager> _logger;

    public WebSocketConnectionManager(ILogger<WebSocketConnectionManager> logger)
    {
        _logger = logger;
    }

    public async Task HandleConnectionAsync(WebSocket webSocket, HttpContext context)
    {
        // Generate a unique ID for this connection
        var connectionId = Guid.NewGuid().ToString();

        // Extract user ID from authentication (if available)
        var userId = context.User?.FindFirst("sub")?.Value ?? "anonymous";

        // Register the connection
        _connections.TryAdd(connectionId, webSocket);
        TrackUserConnection(userId, connectionId);

        _logger.LogInformation(
            "WebSocket connected: {ConnectionId} for user {UserId}",
            connectionId,
            userId);

        try
        {
            // Process incoming messages until the connection closes
            await ReceiveMessagesAsync(webSocket, connectionId, userId);
        }
        finally
        {
            // Clean up when connection ends
            _connections.TryRemove(connectionId, out _);
            RemoveUserConnection(userId, connectionId);

            _logger.LogInformation(
                "WebSocket disconnected: {ConnectionId}",
                connectionId);
        }
    }

    private async Task ReceiveMessagesAsync(
        WebSocket webSocket,
        string connectionId,
        string userId)
    {
        var buffer = new byte[4096];
        var messageBuilder = new StringBuilder();

        while (webSocket.State == WebSocketState.Open)
        {
            WebSocketReceiveResult result;

            try
            {
                result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    CancellationToken.None);
            }
            catch (WebSocketException ex)
            {
                _logger.LogWarning(ex, "WebSocket error for {ConnectionId}", connectionId);
                break;
            }

            if (result.MessageType == WebSocketMessageType.Close)
            {
                // Client requested close - acknowledge it
                await webSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Closing",
                    CancellationToken.None);
                break;
            }

            if (result.MessageType == WebSocketMessageType.Text)
            {
                // Accumulate message fragments
                messageBuilder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                if (result.EndOfMessage)
                {
                    var message = messageBuilder.ToString();
                    messageBuilder.Clear();

                    // Process the complete message
                    await ProcessMessageAsync(message, connectionId, userId);
                }
            }
        }
    }

    private async Task ProcessMessageAsync(
        string message,
        string connectionId,
        string userId)
    {
        _logger.LogDebug(
            "Received from {ConnectionId}: {Message}",
            connectionId,
            message);

        // Echo the message back as acknowledgment
        await SendToConnectionAsync(connectionId, $"Received: {message}");
    }

    private void TrackUserConnection(string userId, string connectionId)
    {
        _userConnections.AddOrUpdate(
            userId,
            new HashSet<string> { connectionId },
            (_, existing) =>
            {
                lock (existing)
                {
                    existing.Add(connectionId);
                }
                return existing;
            });
    }

    private void RemoveUserConnection(string userId, string connectionId)
    {
        if (_userConnections.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    _userConnections.TryRemove(userId, out _);
                }
            }
        }
    }

    // Send a message to a specific connection
    public async Task SendToConnectionAsync(string connectionId, string message)
    {
        if (_connections.TryGetValue(connectionId, out var socket) &&
            socket.State == WebSocketState.Open)
        {
            var bytes = Encoding.UTF8.GetBytes(message);
            await socket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                CancellationToken.None);
        }
    }

    // Send a message to all connections for a specific user
    public async Task SendToUserAsync(string userId, string message)
    {
        if (_userConnections.TryGetValue(userId, out var connectionIds))
        {
            HashSet<string> idsCopy;
            lock (connectionIds)
            {
                idsCopy = new HashSet<string>(connectionIds);
            }

            var tasks = idsCopy.Select(id => SendToConnectionAsync(id, message));
            await Task.WhenAll(tasks);
        }
    }

    // Broadcast to all connected clients
    public async Task BroadcastAsync(string message)
    {
        var tasks = _connections.Keys.Select(id => SendToConnectionAsync(id, message));
        await Task.WhenAll(tasks);
    }
}
```

## Authentication with WebSockets

WebSockets do not support custom headers after the initial handshake. You have two options: authenticate during the handshake using query parameters or cookies, or implement a post-connection authentication message.

```csharp
// AuthenticatedWebSocketMiddleware.cs
public class AuthenticatedWebSocketMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthenticatedWebSocketMiddleware> _logger;

    public AuthenticatedWebSocketMiddleware(
        RequestDelegate next,
        ILogger<AuthenticatedWebSocketMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.WebSockets.IsWebSocketRequest &&
            context.Request.Path.StartsWithSegments("/ws"))
        {
            // Option 1: Token in query string
            var token = context.Request.Query["token"].FirstOrDefault();

            // Option 2: Token in cookie (more secure, harder to leak in logs)
            if (string.IsNullOrEmpty(token))
            {
                token = context.Request.Cookies["ws-auth-token"];
            }

            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("WebSocket connection rejected: no token");
                context.Response.StatusCode = 401;
                return;
            }

            // Validate the token (use your JWT validation logic)
            var principal = ValidateToken(token);
            if (principal == null)
            {
                _logger.LogWarning("WebSocket connection rejected: invalid token");
                context.Response.StatusCode = 401;
                return;
            }

            // Set the authenticated user on the context
            context.User = principal;
        }

        await _next(context);
    }

    private ClaimsPrincipal? ValidateToken(string token)
    {
        // Implement your JWT or token validation logic here
        // Return ClaimsPrincipal if valid, null if invalid
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var validationParams = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                // Configure your validation parameters
            };

            return handler.ValidateToken(token, validationParams, out _);
        }
        catch
        {
            return null;
        }
    }
}
```

## Structured Message Protocol

Define a clear message protocol for your WebSocket communication. JSON works well for most cases.

```csharp
// WebSocketMessage.cs
public class WebSocketMessage
{
    public string Type { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public JsonElement? Payload { get; set; }
    public string? RequestId { get; set; }  // For request-response patterns
}

// MessageHandler.cs
public class MessageHandler
{
    private readonly WebSocketConnectionManager _connectionManager;
    private readonly ILogger<MessageHandler> _logger;

    public MessageHandler(
        WebSocketConnectionManager connectionManager,
        ILogger<MessageHandler> logger)
    {
        _connectionManager = connectionManager;
        _logger = logger;
    }

    public async Task HandleAsync(
        string rawMessage,
        string connectionId,
        string userId)
    {
        WebSocketMessage? message;

        try
        {
            message = JsonSerializer.Deserialize<WebSocketMessage>(rawMessage);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid JSON from {ConnectionId}", connectionId);
            await SendErrorAsync(connectionId, "Invalid message format");
            return;
        }

        if (message == null)
        {
            await SendErrorAsync(connectionId, "Empty message");
            return;
        }

        // Route based on message type
        switch (message.Type.ToLowerInvariant())
        {
            case "ping":
                await HandlePingAsync(connectionId, message.RequestId);
                break;

            case "subscribe":
                await HandleSubscribeAsync(connectionId, userId, message.Channel);
                break;

            case "unsubscribe":
                await HandleUnsubscribeAsync(connectionId, message.Channel);
                break;

            case "broadcast":
                await HandleBroadcastAsync(userId, message);
                break;

            default:
                await SendErrorAsync(
                    connectionId,
                    $"Unknown message type: {message.Type}");
                break;
        }
    }

    private async Task HandlePingAsync(string connectionId, string? requestId)
    {
        var response = new
        {
            type = "pong",
            requestId,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        await _connectionManager.SendToConnectionAsync(
            connectionId,
            JsonSerializer.Serialize(response));
    }

    private async Task SendErrorAsync(string connectionId, string error)
    {
        var response = new { type = "error", message = error };
        await _connectionManager.SendToConnectionAsync(
            connectionId,
            JsonSerializer.Serialize(response));
    }

    // Implement other handlers as needed
}
```

## Channel Subscriptions

Allow clients to subscribe to specific channels for targeted messaging.

```csharp
// ChannelManager.cs
public class ChannelManager
{
    // Map channel names to connection IDs
    private readonly ConcurrentDictionary<string, HashSet<string>> _channels = new();
    private readonly WebSocketConnectionManager _connectionManager;

    public ChannelManager(WebSocketConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public void Subscribe(string connectionId, string channel)
    {
        _channels.AddOrUpdate(
            channel,
            new HashSet<string> { connectionId },
            (_, existing) =>
            {
                lock (existing)
                {
                    existing.Add(connectionId);
                }
                return existing;
            });
    }

    public void Unsubscribe(string connectionId, string channel)
    {
        if (_channels.TryGetValue(channel, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
            }
        }
    }

    public void UnsubscribeAll(string connectionId)
    {
        foreach (var channel in _channels.Keys)
        {
            Unsubscribe(connectionId, channel);
        }
    }

    public async Task PublishAsync(string channel, object message)
    {
        if (!_channels.TryGetValue(channel, out var connections))
        {
            return;
        }

        HashSet<string> connectionsCopy;
        lock (connections)
        {
            connectionsCopy = new HashSet<string>(connections);
        }

        var payload = JsonSerializer.Serialize(new
        {
            type = "message",
            channel,
            data = message,
            timestamp = DateTimeOffset.UtcNow
        });

        var tasks = connectionsCopy.Select(
            id => _connectionManager.SendToConnectionAsync(id, payload));

        await Task.WhenAll(tasks);
    }
}
```

## Scaling with Redis Backplane

For horizontal scaling across multiple servers, use Redis pub/sub as a backplane. Messages published on one server reach clients connected to other servers.

```csharp
// RedisBackplane.cs
using StackExchange.Redis;

public class RedisBackplane : IDisposable
{
    private readonly ConnectionMultiplexer _redis;
    private readonly ISubscriber _subscriber;
    private readonly WebSocketConnectionManager _connectionManager;
    private readonly ILogger<RedisBackplane> _logger;

    public RedisBackplane(
        IConfiguration config,
        WebSocketConnectionManager connectionManager,
        ILogger<RedisBackplane> logger)
    {
        _connectionManager = connectionManager;
        _logger = logger;

        var redisConnection = config.GetConnectionString("Redis")
            ?? "localhost:6379";

        _redis = ConnectionMultiplexer.Connect(redisConnection);
        _subscriber = _redis.GetSubscriber();
    }

    public async Task SubscribeToChannelAsync(string channel)
    {
        await _subscriber.SubscribeAsync(
            RedisChannel.Literal($"ws:{channel}"),
            async (_, message) =>
            {
                if (message.HasValue)
                {
                    // Forward Redis message to local WebSocket clients
                    await _connectionManager.BroadcastToChannelAsync(
                        channel,
                        message.ToString());
                }
            });

        _logger.LogInformation("Subscribed to Redis channel: ws:{Channel}", channel);
    }

    public async Task PublishAsync(string channel, string message)
    {
        // Publish to Redis so all server instances receive it
        await _subscriber.PublishAsync(
            RedisChannel.Literal($"ws:{channel}"),
            message);
    }

    public void Dispose()
    {
        _redis.Dispose();
    }
}
```

## Health Checks and Monitoring

Monitor your WebSocket service health and metrics.

```csharp
// WebSocketHealthCheck.cs
public class WebSocketHealthCheck : IHealthCheck
{
    private readonly WebSocketConnectionManager _connectionManager;

    public WebSocketHealthCheck(WebSocketConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var connectionCount = _connectionManager.GetConnectionCount();

        var data = new Dictionary<string, object>
        {
            { "connections", connectionCount }
        };

        // Consider unhealthy if too many connections (adjust threshold)
        if (connectionCount > 10000)
        {
            return Task.FromResult(HealthCheckResult.Degraded(
                $"High connection count: {connectionCount}",
                data: data));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            $"Active connections: {connectionCount}",
            data: data));
    }
}
```

## Graceful Shutdown

Handle application shutdown gracefully by notifying connected clients.

```csharp
// GracefulShutdownService.cs
public class GracefulShutdownService : IHostedService
{
    private readonly WebSocketConnectionManager _connectionManager;
    private readonly ILogger<GracefulShutdownService> _logger;

    public GracefulShutdownService(
        WebSocketConnectionManager connectionManager,
        ILogger<GracefulShutdownService> logger)
    {
        _connectionManager = connectionManager;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Initiating graceful WebSocket shutdown");

        // Notify all clients that server is shutting down
        var shutdownMessage = JsonSerializer.Serialize(new
        {
            type = "server_shutdown",
            message = "Server is restarting. Please reconnect shortly."
        });

        await _connectionManager.BroadcastAsync(shutdownMessage);

        // Give clients a moment to receive the message
        await Task.Delay(1000, cancellationToken);

        // Close all connections
        await _connectionManager.CloseAllConnectionsAsync();

        _logger.LogInformation("WebSocket shutdown complete");
    }
}
```

## Summary

Building WebSocket services in ASP.NET Core involves several key components:

| Component | Purpose |
|-----------|---------|
| WebSocket middleware | Handles protocol upgrade from HTTP |
| Connection manager | Tracks active connections and enables messaging |
| Authentication | Validates tokens during handshake |
| Message protocol | Defines structured communication format |
| Channel subscriptions | Enables targeted message delivery |
| Redis backplane | Enables horizontal scaling |
| Health checks | Monitors service health |

WebSockets provide the foundation for real-time features in your applications. With proper connection management, authentication, and scaling patterns, you can build robust real-time services that handle thousands of concurrent connections.
