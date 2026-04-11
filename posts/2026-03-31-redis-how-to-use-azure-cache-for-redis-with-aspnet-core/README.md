# How to Use Azure Cache for Redis with ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure Cache for Redis, ASP.NET Core, CSharp, Distributed Cache

Description: Learn how to integrate Azure Cache for Redis with ASP.NET Core for distributed caching, session storage, and output caching using StackExchange.Redis.

---

## Adding Redis to ASP.NET Core

Azure Cache for Redis works with ASP.NET Core through the `StackExchange.Redis` library and the `Microsoft.Extensions.Caching.StackExchangeRedis` NuGet package.

```bash
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
dotnet add package StackExchange.Redis
```

## Configuring Redis Connection

Store the connection string in `appsettings.json` or use Azure App Configuration / Key Vault.

```json
{
  "ConnectionStrings": {
    "Redis": "my-cache.redis.cache.windows.net:6380,password=ACCESS_KEY,ssl=True,abortConnect=False"
  },
  "Redis": {
    "ConnectionString": "my-cache.redis.cache.windows.net:6380,password=ACCESS_KEY,ssl=True,abortConnect=False",
    "DefaultExpiry": 3600
  }
}
```

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Register IDistributedCache backed by Redis
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "MyApp:";  // Optional prefix for all keys
});

// Register raw IConnectionMultiplexer for direct Redis access
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var connectionString = builder.Configuration.GetConnectionString("Redis");
    return ConnectionMultiplexer.Connect(connectionString);
});

var app = builder.Build();
```

## Using IDistributedCache

The `IDistributedCache` interface provides a standardized abstraction. It supports get/set with expiry but works only with byte arrays or strings.

```csharp
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

public class ProductService
{
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _repo;

    public ProductService(IDistributedCache cache, IProductRepository repo)
    {
        _cache = cache;
        _repo = repo;
    }

    public async Task<Product?> GetProductAsync(int id)
    {
        var cacheKey = $"product:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);

        if (cached is not null)
        {
            return JsonSerializer.Deserialize<Product>(cached);
        }

        var product = await _repo.GetByIdAsync(id);
        if (product is not null)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
                SlidingExpiration = TimeSpan.FromMinutes(10)
            };
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(product), options);
        }

        return product;
    }

    public async Task InvalidateProductAsync(int id)
    {
        await _cache.RemoveAsync($"product:{id}");
    }
}
```

## Using StackExchange.Redis Directly

For more advanced operations (hashes, sorted sets, pipelines), use `IConnectionMultiplexer` directly.

```csharp
public class UserScoreService
{
    private readonly IDatabase _db;

    public UserScoreService(IConnectionMultiplexer redis)
    {
        _db = redis.GetDatabase();
    }

    // Leaderboard using sorted set
    public async Task AddScoreAsync(string userId, double score)
    {
        await _db.SortedSetAddAsync("leaderboard", userId, score);
    }

    public async Task<IEnumerable<(string User, double Score)>> GetTopPlayersAsync(int count = 10)
    {
        var entries = await _db.SortedSetRangeByRankWithScoresAsync(
            "leaderboard",
            start: 0,
            stop: count - 1,
            order: Order.Descending
        );

        return entries.Select(e => (e.Element.ToString(), e.Score));
    }

    // Session-like user hash
    public async Task SetUserSessionAsync(string sessionId, Dictionary<string, string> data)
    {
        var hashEntries = data.Select(kv => new HashEntry(kv.Key, kv.Value)).ToArray();
        var key = $"session:{sessionId}";

        var batch = _db.CreateBatch();
        var hashSetTask = batch.HashSetAsync(key, hashEntries);
        var expireTask = batch.KeyExpireAsync(key, TimeSpan.FromHours(24));
        batch.Execute();
        await Task.WhenAll(hashSetTask, expireTask);
    }

    public async Task<Dictionary<string, string>> GetUserSessionAsync(string sessionId)
    {
        var entries = await _db.HashGetAllAsync($"session:{sessionId}");
        return entries.ToDictionary(e => e.Name.ToString(), e => e.Value.ToString());
    }
}
```

## Distributed Session with Redis

```csharp
// Program.cs - Enable distributed session backed by Redis
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});

var app = builder.Build();
app.UseSession();
```

```csharp
// In a controller or minimal API
app.MapGet("/dashboard", (HttpContext context) =>
{
    var userId = context.Session.GetString("UserId");
    if (userId is null)
    {
        return Results.Redirect("/login");
    }
    return Results.Ok(new { UserId = userId });
});

app.MapPost("/login", async (LoginRequest req, HttpContext context) =>
{
    // Validate credentials...
    context.Session.SetString("UserId", req.UserId);
    context.Session.SetInt32("LoginTimestamp", (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    await context.Session.CommitAsync();
    return Results.Ok();
});
```

## Output Caching with Redis (.NET 8+)

ASP.NET Core 8+ has a built-in output cache middleware that can use Redis as a backing store.

```bash
dotnet add package Microsoft.AspNetCore.OutputCaching.StackExchangeRedis
```

```csharp
// Program.cs
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(policy => policy.Expire(TimeSpan.FromMinutes(10)));
    options.AddPolicy("LongCache", policy => policy.Expire(TimeSpan.FromHours(1)));
});

builder.Services.AddStackExchangeRedisOutputCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "OutputCache:";
});

app.UseOutputCache();
```

```csharp
// Cache a controller action
[OutputCache(PolicyName = "LongCache")]
[HttpGet("/api/products")]
public async Task<IActionResult> GetProducts()
{
    var products = await _productService.GetAllAsync();
    return Ok(products);
}
```

## Handling Connection Failures

```csharp
// Configure resilient connection in Program.cs
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.ConfigurationOptions = new ConfigurationOptions
    {
        EndPoints = { "my-cache.redis.cache.windows.net:6380" },
        Password = "ACCESS_KEY",
        Ssl = true,
        AbortOnConnectFail = false,  // Don't crash on startup if Redis unavailable
        ConnectRetry = 3,
        ConnectTimeout = 5000,
        SyncTimeout = 5000,
        ReconnectRetryPolicy = new ExponentialRetry(5000)
    };
});

// Use cache with fallback
public async Task<Product?> GetProductWithFallbackAsync(int id)
{
    try
    {
        var cached = await _cache.GetStringAsync($"product:{id}");
        if (cached is not null)
            return JsonSerializer.Deserialize<Product>(cached);
    }
    catch (RedisConnectionException)
    {
        // Log and continue - fall through to database
        _logger.LogWarning("Redis unavailable, falling back to database for product {Id}", id);
    }

    return await _repo.GetByIdAsync(id);
}
```

## Summary

Azure Cache for Redis integrates with ASP.NET Core through `IDistributedCache` for simple string/byte caching and `StackExchange.Redis` for direct Redis operations like sorted sets and hashes. Use `IDistributedCache` for standard caching patterns and session storage; use the raw multiplexer for advanced data structures. Always set `AbortOnConnectFail = false` and implement fallback logic so Redis unavailability does not crash your application.
