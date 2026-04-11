# How to Use Redis Connection Multiplexing in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DotNet, StackExchange.Redis

Description: Learn how StackExchange.Redis connection multiplexing works in .NET, and how to configure and monitor the multiplexer for production applications.

---

StackExchange.Redis uses a single `ConnectionMultiplexer` to share one or two socket connections across all concurrent callers. Understanding multiplexing helps you configure it correctly and diagnose performance issues.

## How Multiplexing Works

Unlike traditional connection pools where each caller gets its own socket, StackExchange.Redis serializes all commands onto a small number of connections and sends responses back to the waiting callers. This means:

- One `ConnectionMultiplexer` instance services hundreds of concurrent callers
- Commands are pipelined automatically without any extra code
- Creating a multiplexer per request is an anti-pattern

```csharp
// WRONG - creates a new connection on every request
public string GetValue(string key)
{
    using var redis = ConnectionMultiplexer.Connect("localhost:6379");
    return redis.GetDatabase().StringGet(key)!;
}

// CORRECT - singleton shared across all requests
public class CacheService(IConnectionMultiplexer redis)
{
    private readonly IDatabase _db = redis.GetDatabase();

    public string? GetValue(string key) => _db.StringGet(key);
}
```

## Singleton Registration

```csharp
// Program.cs
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(new ConfigurationOptions
    {
        EndPoints = { "localhost:6379" },
        Password = "secret",
        AbortOnConnectFail = false,
        ConnectRetry = 3,
        ReconnectRetryPolicy = new ExponentialRetry(5000),
    }));
```

## Monitoring Connection Events

```csharp
var redis = ConnectionMultiplexer.Connect("localhost:6379");

redis.ConnectionFailed += (sender, args) =>
    Console.WriteLine($"Connection failed: {args.Exception?.Message}");

redis.ConnectionRestored += (sender, args) =>
    Console.WriteLine("Connection restored");

redis.ErrorMessage += (sender, args) =>
    Console.WriteLine($"Redis error: {args.Message}");

redis.ConfigurationChanged += (sender, args) =>
    Console.WriteLine("Configuration changed (e.g., Sentinel failover)");
```

## Checking Connection Status

```csharp
public class RedisHealthCheck(IConnectionMultiplexer redis) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        bool isConnected = redis.IsConnected;
        return Task.FromResult(isConnected
            ? HealthCheckResult.Healthy("Redis connected")
            : HealthCheckResult.Unhealthy("Redis not connected"));
    }
}
```

Register the health check:

```csharp
builder.Services.AddHealthChecks()
    .AddCheck<RedisHealthCheck>("redis");
```

## Multiple Databases

The multiplexer can talk to different Redis logical databases:

```csharp
IDatabase db0 = redis.GetDatabase(0); // default
IDatabase db1 = redis.GetDatabase(1); // database 1
IDatabase db2 = redis.GetDatabase(2); // database 2
```

## Getting Server Info

```csharp
IServer server = redis.GetServer(redis.GetEndPoints().First());

var serverInfo = server.Info("server")[0].ToDictionary(x => x.Key, x => x.Value);
var clientsInfo = server.Info("clients")[0].ToDictionary(x => x.Key, x => x.Value);
var memoryInfo = server.Info("memory")[0].ToDictionary(x => x.Key, x => x.Value);

Console.WriteLine($"Redis version: {serverInfo["redis_version"]}");
Console.WriteLine($"Connected clients: {clientsInfo["connected_clients"]}");
Console.WriteLine($"Used memory: {memoryInfo["used_memory_human"]}");
```

## Lazy Initialization

For applications where Redis is optional or not always available at startup:

```csharp
private static readonly Lazy<ConnectionMultiplexer> LazyConnection =
    new Lazy<ConnectionMultiplexer>(() =>
        ConnectionMultiplexer.Connect("localhost:6379,abortConnect=false"));

public static ConnectionMultiplexer Connection => LazyConnection.Value;
```

## Summary

StackExchange.Redis multiplexes all callers through a single set of connections, making it critical to create one `ConnectionMultiplexer` per application rather than per request. Register it as a singleton in the DI container and subscribe to `ConnectionFailed` and `ConnectionRestored` events for visibility. The `AbortOnConnectFail=false` option is essential for production - it allows the app to start even if Redis is temporarily unreachable.
