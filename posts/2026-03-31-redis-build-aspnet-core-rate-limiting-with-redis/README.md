# How to Build ASP.NET Core Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ASP.NET Core, Rate Limiting, Middleware, C#

Description: Implement distributed Redis-backed rate limiting in ASP.NET Core using fixed window and sliding window algorithms to protect API endpoints across multiple instances.

---

## Introduction

ASP.NET Core 7+ includes built-in rate limiting middleware, but it is in-memory only and does not work across multiple server instances. For distributed rate limiting with Redis, you can use the `AspNetCoreRateLimit` package or implement custom middleware with StackExchange.Redis. This guide covers both approaches.

## Option 1: Using AspNetCoreRateLimit with Redis

### Installation

```bash
dotnet add package AspNetCoreRateLimit
dotnet add package AspNetCoreRateLimit.Redis
dotnet add package StackExchange.Redis
```

### Configuration in Program.cs

```csharp
using AspNetCoreRateLimit;

var builder = WebApplication.CreateBuilder(args);

// Redis connection
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

// Rate limit configuration
builder.Services.AddOptions();
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(
    builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(
    builder.Configuration.GetSection("IpRateLimitPolicies"));

// Use Redis for distributed storage
builder.Services.AddRedisRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

var app = builder.Build();
app.UseIpRateLimiting();
app.MapControllers();
app.Run();
```

### appsettings.json

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "GeneralRules": [
      {
        "Endpoint": "GET:/api/products",
        "Period": "1m",
        "Limit": 100
      },
      {
        "Endpoint": "POST:/api/auth/login",
        "Period": "1m",
        "Limit": 5
      },
      {
        "Endpoint": "*",
        "Period": "1h",
        "Limit": 3000
      }
    ]
  }
}
```

## Option 2: Custom Redis Rate Limit Middleware

### Redis Rate Limiter Service

```csharp
using StackExchange.Redis;

public class RedisRateLimiter
{
    private readonly IConnectionMultiplexer _redis;

    public RedisRateLimiter(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<RateLimitResult> CheckAsync(
        string key,
        int limit,
        TimeSpan window)
    {
        var db = _redis.GetDatabase();
        var redisKey = $"rl:{key}";

        var count = await db.StringIncrementAsync(redisKey);

        if (count == 1)
        {
            await db.KeyExpireAsync(redisKey, window);
        }

        var ttl = await db.KeyTimeToLiveAsync(redisKey);

        return new RateLimitResult
        {
            Allowed = count <= limit,
            Count = (int)count,
            Remaining = Math.Max(0, limit - (int)count),
            ResetAt = DateTimeOffset.UtcNow.Add(ttl ?? window),
        };
    }
}

public record RateLimitResult
{
    public bool Allowed { get; init; }
    public int Count { get; init; }
    public int Remaining { get; init; }
    public DateTimeOffset ResetAt { get; init; }
}
```

### Rate Limiting Middleware

```csharp
public class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly RedisRateLimiter _limiter;

    public RateLimitMiddleware(RequestDelegate next, RedisRateLimiter limiter)
    {
        _next = next;
        _limiter = limiter;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = context.Request.Path.Value ?? "/";
        var key = $"{ipAddress}:{path}";

        var result = await _limiter.CheckAsync(key, limit: 60, TimeSpan.FromMinutes(1));

        context.Response.Headers["X-RateLimit-Limit"] = "60";
        context.Response.Headers["X-RateLimit-Remaining"] = result.Remaining.ToString();
        context.Response.Headers["X-RateLimit-Reset"] = result.ResetAt.ToUnixTimeSeconds().ToString();

        if (!result.Allowed)
        {
            context.Response.StatusCode = 429;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                """{"error":"Too Many Requests","retryAfter":60}""");
            return;
        }

        await _next(context);
    }
}
```

### Register in Program.cs

```csharp
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect("localhost:6379"));
builder.Services.AddSingleton<RedisRateLimiter>();

var app = builder.Build();
app.UseMiddleware<RateLimitMiddleware>();
app.MapControllers();
app.Run();
```

## Summary

Distributed rate limiting in ASP.NET Core requires a shared store like Redis so all application instances enforce limits consistently. The `AspNetCoreRateLimit` package with Redis support is the quickest path for configuration-based rules. For custom algorithms or more control, implement middleware with StackExchange.Redis directly using `INCR` and `EXPIRE` for atomic, TTL-based counters. Always return standard `X-RateLimit-*` headers so clients can adapt their request rates.
