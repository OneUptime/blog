# How to Use Redis Health Checks in ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ASP.NET Core, Health Check, Monitoring, C#

Description: Add Redis health checks to ASP.NET Core using the built-in health check framework to monitor Redis availability and report status via a health endpoint.

---

## Introduction

ASP.NET Core's health check framework provides standardized endpoints for monitoring service health. Adding a Redis health check ensures your infrastructure knows when Redis is unavailable and can route traffic away from unhealthy instances. This guide covers setup, custom checks, and integrating with health check UIs.

## Installation

```bash
dotnet add package AspNetCore.HealthChecks.Redis
```

## Basic Setup in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks()
    .AddRedis(
        redisConnectionString: builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379",
        name: "redis",
        failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
        tags: new[] { "cache", "redis" }
    );

var app = builder.Build();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/redis", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = (check) => check.Tags.Contains("redis")
});

app.Run();
```

## Detailed Health Check Response

Return a JSON response with full details:

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

app.MapHealthChecks("/health/detailed", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";

        var result = new
        {
            status = report.Status.ToString(),
            duration = report.TotalDuration,
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration,
                error = e.Value.Exception?.Message,
                data = e.Value.Data,
            }),
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(result, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true,
            })
        );
    }
});
```

## Custom Redis Health Check

Implement a more detailed health check that verifies read/write operations:

```csharp
using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

public class RedisReadWriteHealthCheck : IHealthCheck
{
    private readonly IConnectionMultiplexer _redis;

    public RedisReadWriteHealthCheck(IConnectionMultiplexer redis) => _redis = redis;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var testKey = "health:probe";
            var testValue = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            await db.StringSetAsync(testKey, testValue, TimeSpan.FromSeconds(10));
            var retrieved = await db.StringGetAsync(testKey);

            if (retrieved != testValue)
            {
                return HealthCheckResult.Degraded("Redis read/write probe mismatch");
            }

            var latency = await _redis.GetDatabase().PingAsync();

            return HealthCheckResult.Healthy("Redis is healthy", new Dictionary<string, object>
            {
                ["latency_ms"] = latency.TotalMilliseconds,
                ["connected"] = _redis.IsConnected,
            });
        }
        catch (RedisConnectionException ex)
        {
            return HealthCheckResult.Unhealthy("Redis connection failed", ex);
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Degraded("Redis health check failed", ex);
        }
    }
}
```

Register the custom check:

```csharp
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect("localhost:6379"));

builder.Services.AddHealthChecks()
    .AddCheck<RedisReadWriteHealthCheck>("redis-rw", tags: new[] { "redis", "readwrite" });
```

## Health Check UI Integration

```bash
dotnet add package AspNetCore.HealthChecks.UI
dotnet add package AspNetCore.HealthChecks.UI.InMemory.Storage
```

```csharp
builder.Services.AddHealthChecksUI(opts =>
{
    opts.AddHealthCheckEndpoint("API", "/health/detailed");
    opts.SetEvaluationTimeInSeconds(30);
    opts.MaximumHistoryEntriesPerEndpoint(50);
}).AddInMemoryStorage();

app.MapHealthChecksUI(config => config.UIPath = "/health-ui");
```

## Liveness vs Readiness Probes

Separate liveness (is the process alive?) from readiness (is the app ready to serve traffic?):

```csharp
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false  // No checks - just returns 200 if process is running
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = (check) => check.Tags.Contains("redis")
});
```

## Summary

Adding Redis health checks to ASP.NET Core takes three steps: install `AspNetCore.HealthChecks.Redis`, call `AddRedis()` on the health check builder, and map a health check endpoint. Custom health checks implementing `IHealthCheck` allow more detailed diagnostics like round-trip latency measurement and read/write verification. Separating liveness and readiness probes using tag-based filtering is the recommended Kubernetes pattern, where liveness restarts the pod and readiness controls load balancer traffic.
