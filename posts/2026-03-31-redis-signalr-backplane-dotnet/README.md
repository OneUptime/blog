# How to Use Redis as a SignalR Backplane in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SignalR, .NET, ASP.NET, Real-Time

Description: Learn how to configure Redis as a SignalR backplane in ASP.NET Core to synchronize real-time messages across multiple server instances.

---

When you run multiple instances of an ASP.NET Core app with SignalR, each instance only knows about clients connected to it. A Redis backplane solves this by broadcasting messages through Redis Pub/Sub so all instances receive them.

## How It Works

Each server instance subscribes to a Redis channel. When a hub method sends a message, it publishes to Redis, and all instances forward it to their locally connected clients.

## Installation

```bash
dotnet add package Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

## Basic Configuration

```csharp
// Program.cs
builder.Services.AddSignalR()
    .AddStackExchangeRedis("localhost:6379", options =>
    {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("myapp");
    });
```

## Hub Example

```csharp
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    public async Task SendToGroup(string groupName, string message)
    {
        await Clients.Group(groupName).SendAsync("ReceiveMessage", "System", message);
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "general");
        await base.OnConnectedAsync();
    }
}
```

## Using Redis Connection Options

For production, configure the Redis connection with retry and authentication:

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis(options =>
    {
        options.Configuration = new ConfigurationOptions
        {
            EndPoints = { "redis-primary:6379", "redis-replica:6379" },
            Password = Environment.GetEnvironmentVariable("REDIS_PASSWORD"),
            AbortOnConnectFail = false,
            ConnectRetry = 5,
            ReconnectRetryPolicy = new LinearRetry(5000)
        };
        options.Configuration.ChannelPrefix = RedisChannel.Literal("prod");
    });
```

## Sending Messages from Outside a Hub

Inject `IHubContext<T>` into a service or background worker:

```csharp
public class NotificationService
{
    private readonly IHubContext<ChatHub> _hub;

    public NotificationService(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task BroadcastAlertAsync(string message)
    {
        await _hub.Clients.All.SendAsync("ReceiveMessage", "System", message);
    }
}
```

## Checking Backplane Health

The SignalR Redis backplane does not register `IConnectionMultiplexer` in the DI container, so register it separately:

```csharp
// Register IConnectionMultiplexer for use outside the SignalR backplane
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect("localhost:6379"));
```

Then expose a health endpoint:

```csharp
app.MapGet("/health/redis", async (IConnectionMultiplexer mux) =>
{
    try
    {
        await mux.GetDatabase().PingAsync();
        return Results.Ok("Redis OK");
    }
    catch (Exception ex)
    {
        return Results.Problem($"Redis unavailable: {ex.Message}");
    }
});
```

## Docker Compose Example

```yaml
version: "3.9"
services:
  app1:
    image: myapp:latest
    ports:
      - "5001:80"
    environment:
      - REDIS_HOST=redis
  app2:
    image: myapp:latest
    ports:
      - "5002:80"
    environment:
      - REDIS_HOST=redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

With the backplane configured, a message sent from a client connected to `app1` will be delivered to all clients on both `app1` and `app2`.

## Summary

Adding Redis as a SignalR backplane requires only one NuGet package and a few lines of configuration. It enables horizontal scaling of real-time applications by routing all hub messages through Redis Pub/Sub, ensuring every server instance delivers messages to its connected clients.
