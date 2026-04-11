# How to Handle Redis Connection Errors in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DotNet, Error Handling

Description: Learn how to handle Redis connection errors in .NET with StackExchange.Redis, including reconnection, retries, and graceful degradation patterns.

---

StackExchange.Redis handles reconnection automatically, but applications still need to handle command failures during outages, transient timeouts, and pool exhaustion. This guide covers error patterns and resilience strategies for production .NET applications.

## Common Exception Types

```csharp
try
{
    string? val = await db.StringGetAsync("key");
}
catch (RedisConnectionException ex)
{
    // Cannot connect to Redis server
    _logger.LogError(ex, "Redis connection failed");
}
catch (RedisTimeoutException ex)
{
    // Command timed out waiting for response
    _logger.LogWarning(ex, "Redis command timed out");
}
catch (RedisServerException ex)
{
    // Redis returned an error response (e.g., wrong type, READONLY)
    _logger.LogError(ex, "Redis server error: {Message}", ex.Message);
}
catch (RedisException ex)
{
    // Base class for all StackExchange.Redis errors
    _logger.LogError(ex, "Redis error");
}
```

## Retry with Polly

```bash
dotnet add package Polly
```

```csharp
using Polly;
using Polly.Retry;

AsyncRetryPolicy redisRetryPolicy = Policy
    .Handle<RedisTimeoutException>()
    .Or<RedisConnectionException>()
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt => TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt)),
        onRetry: (ex, delay, attempt, ctx) =>
            Console.WriteLine($"Retry {attempt} after {delay.TotalMilliseconds}ms: {ex.Message}"));

string? value = await redisRetryPolicy.ExecuteAsync(async () =>
    await db.StringGetAsync("my:key"));
```

## Graceful Degradation (Cache Fallback)

```csharp
public async Task<User?> GetUserAsync(int userId)
{
    string key = $"user:{userId}";

    try
    {
        RedisValue cached = await db.StringGetAsync(key);
        if (!cached.IsNull)
            return JsonSerializer.Deserialize<User>(cached!);
    }
    catch (RedisException ex)
    {
        _logger.LogWarning(ex, "Redis unavailable, falling back to DB");
        // Fall through to database
    }

    return await _userRepository.GetByIdAsync(userId);
}
```

## Connection Event Monitoring

```csharp
ConnectionMultiplexer redis = ConnectionMultiplexer.Connect(
    "localhost:6379,abortConnect=false");

redis.ConnectionFailed += (_, args) =>
    _logger.LogError("Redis connection failed to {Endpoint}: {Failure}",
        args.EndPoint, args.FailureType);

redis.ConnectionRestored += (_, args) =>
    _logger.LogInformation("Redis connection restored to {Endpoint}", args.EndPoint);

redis.ErrorMessage += (_, args) =>
    _logger.LogWarning("Redis error from {Endpoint}: {Message}",
        args.EndPoint, args.Message);
```

## Health Check

```csharp
public class RedisHealthCheck(IConnectionMultiplexer redis) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            IDatabase db = redis.GetDatabase();
            await db.PingAsync();
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis unreachable", ex);
        }
    }
}
```

## Timeout Configuration

```csharp
ConfigurationOptions options = new ConfigurationOptions
{
    EndPoints = { "localhost:6379" },
    ConnectTimeout = 5000,   // ms to establish a connection
    SyncTimeout = 3000,      // ms to wait for synchronous command
    AsyncTimeout = 3000,     // ms to wait for asynchronous command
    AbortOnConnectFail = false,
    ReconnectRetryPolicy = new ExponentialRetry(5000),
};
```

## Summary

StackExchange.Redis throws `RedisConnectionException`, `RedisTimeoutException`, and `RedisServerException` for different failure modes. Polly retry policies with exponential backoff handle transient failures. Always subscribe to `ConnectionFailed` and `ConnectionRestored` events for observability. For caching paths, catch `RedisException` and fall back to the database rather than returning an error to the user.
