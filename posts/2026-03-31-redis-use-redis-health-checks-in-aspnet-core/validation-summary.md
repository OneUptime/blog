# Validation Summary: How to Use Redis Health Checks in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- ASP.NET Core (Health Check framework)
- C#
- StackExchange.Redis
- AspNetCore.HealthChecks.Redis (Xabaril)
- AspNetCore.HealthChecks.UI
- Kubernetes liveness/readiness probes

## Sources Consulted
- StackExchange.Redis API reference — `IConnectionMultiplexer` interface does not expose `GetCounters()`, which is only on the concrete `ConnectionMultiplexer` class
- StackExchange.Redis `ServerCounters.TotalOutstanding` — represents pending/in-flight operations, not connected client count
- Microsoft ASP.NET Core Health Checks documentation — `IHealthCheck`, `HealthCheckResult`, `MapHealthChecks`, `HealthCheckOptions`
- AspNetCore.HealthChecks.Redis NuGet package — `AddRedis()` extension method signatures
- AspNetCore.HealthChecks.UI NuGet package — `AddHealthChecksUI`, `MapHealthChecksUI` APIs

## Issues Found
1. **`_redis.GetCounters().TotalOutstanding` does not compile on `IConnectionMultiplexer`**: The `GetCounters()` method is defined on the concrete `ConnectionMultiplexer` class, not on the `IConnectionMultiplexer` interface. Since the custom health check injects `IConnectionMultiplexer`, this call would fail at compile time. Additionally, the dictionary key `"connected_clients"` was misleading — `TotalOutstanding` represents pending/in-flight operations, not the number of connected clients. **Fix**: Replaced with `_redis.IsConnected`, which is available on `IConnectionMultiplexer` and provides meaningful health status information, with the label changed to `"connected"`.

## Review Notes
- The `redisConnectionString` named parameter in `AddRedis()` has been stable across many versions of the `AspNetCore.HealthChecks.Redis` package but newer major versions may restructure the overloads. The post does not pin a specific package version, so readers targeting the latest versions should check the current API surface.
- The custom health check writes a probe key (`health:probe`) to Redis on every invocation. In high-frequency health check scenarios, readers should be aware this adds write load to Redis.
- The liveness/readiness probe pattern with `Predicate = _ => false` is a well-known and correct Kubernetes pattern.
