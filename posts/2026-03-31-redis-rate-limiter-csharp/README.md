# How to Build a Rate Limiter in C# with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CSharp, .NET, Rate Limiting, ASP.NET

Description: Learn how to build a sliding window and fixed window rate limiter in C# using Redis atomic operations and Lua scripts in ASP.NET Core.

---

Rate limiting protects your APIs from abuse. Redis is an ideal backend for rate limiters because its atomic operations guarantee accuracy even across multiple application instances.

## Setup

```bash
dotnet add package StackExchange.Redis
```

## Fixed Window Rate Limiter

The simplest approach: count requests per time window using INCR and EXPIRE.

```csharp
public class FixedWindowRateLimiter
{
    private readonly IDatabase _db;

    public FixedWindowRateLimiter(IConnectionMultiplexer mux)
    {
        _db = mux.GetDatabase();
    }

    public async Task<bool> IsAllowedAsync(string clientId, int limit, int windowSeconds)
    {
        var key = $"rate:{clientId}:{DateTime.UtcNow:yyyyMMddHHmm}";

        var count = await _db.StringIncrementAsync(key);
        if (count == 1)
            await _db.KeyExpireAsync(key, TimeSpan.FromSeconds(windowSeconds));

        return count <= limit;
    }
}
```

## Sliding Window Rate Limiter with Lua

Lua scripts run atomically in Redis, preventing race conditions:

```csharp
private static readonly string SlidingWindowScript = @"
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local uid = ARGV[4]

    redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)
    local count = redis.call('ZCARD', key)
    if count < limit then
        redis.call('ZADD', key, now, uid)
        redis.call('PEXPIRE', key, window * 1000)
        return 1
    end
    return 0
";

public async Task<bool> IsSlidingAllowedAsync(string clientId, int limit, int windowSeconds)
{
    var key = $"sliding:{clientId}";
    var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var uid = Guid.NewGuid().ToString("N");

    var result = (int)await _db.ScriptEvaluateAsync(SlidingWindowScript,
        new RedisKey[] { key },
        new RedisValue[] { now, windowSeconds, limit, uid });

    return result == 1;
}
```

## ASP.NET Core Middleware

```csharp
public class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly FixedWindowRateLimiter _limiter;

    public RateLimitMiddleware(RequestDelegate next, IConnectionMultiplexer mux)
    {
        _next = next;
        _limiter = new FixedWindowRateLimiter(mux);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var allowed = await _limiter.IsAllowedAsync(clientIp, limit: 100, windowSeconds: 60);

        if (!allowed)
        {
            context.Response.StatusCode = 429;
            context.Response.Headers["Retry-After"] = "60";
            await context.Response.WriteAsync("Too Many Requests");
            return;
        }

        await _next(context);
    }
}
```

Register in `Program.cs`:

```csharp
var mux = ConnectionMultiplexer.Connect("localhost:6379");
builder.Services.AddSingleton<IConnectionMultiplexer>(mux);
app.UseMiddleware<RateLimitMiddleware>();
```

## Returning Rate Limit Headers

```csharp
// Add informative headers to the response
context.Response.Headers["X-RateLimit-Limit"] = "100";
context.Response.Headers["X-RateLimit-Remaining"] = remaining.ToString();
context.Response.Headers["X-RateLimit-Reset"] = resetTimestamp.ToString();
```

## Per-Route Limits

Use a combination of route and client identifier for fine-grained control:

```csharp
var key = $"{context.Request.Path}:{clientIp}";
var allowed = await _limiter.IsAllowedAsync(key, limit: 20, windowSeconds: 60);
```

## Summary

Redis-backed rate limiters in C# are simple to build and highly reliable in distributed environments. The fixed window approach works for most use cases, while Lua-based sliding windows offer more accurate burst protection. Wrapping the logic in ASP.NET Core middleware keeps your controllers clean.
