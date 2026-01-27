# How to Implement Caching with IMemoryCache and Redis in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, Caching, Redis, IMemoryCache, Performance, ASP.NET Core

Description: Learn how to implement caching in .NET applications using IMemoryCache for in-memory caching and Redis for distributed caching with practical examples.

---

Caching is one of the most effective ways to improve application performance. By storing frequently accessed data closer to your application, you reduce database load and response times. This guide covers both in-memory caching with IMemoryCache and distributed caching with Redis in .NET.

## Why Caching Matters

| Scenario | Without Cache | With Cache |
|----------|--------------|------------|
| **Database query** | 50-200ms | 1-5ms |
| **API call** | 100-500ms | 1-10ms |
| **Complex computation** | Variable | Near instant |
| **Database load** | High | Reduced 80-95% |

Caching trades memory for speed. The key is knowing what to cache, when to invalidate, and which caching layer to use.

## In-Memory Caching with IMemoryCache

IMemoryCache stores data in the application's memory. It is fast, simple, and built into ASP.NET Core. Use it for single-server deployments or data that does not need to be shared across instances.

### Basic Setup

Register the memory cache service in your application startup.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add memory cache to DI container
builder.Services.AddMemoryCache();

var app = builder.Build();
```

### Basic Get and Set Operations

The GetOrCreate pattern is the most common usage - it checks the cache first and only executes the factory method on cache miss.

```csharp
using Microsoft.Extensions.Caching.Memory;

public class ProductService
{
    private readonly IMemoryCache _cache;
    private readonly IProductRepository _repository;

    public ProductService(IMemoryCache cache, IProductRepository repository)
    {
        _cache = cache;
        _repository = repository;
    }

    public async Task<Product?> GetProductAsync(int id)
    {
        // Cache key should be unique and descriptive
        string cacheKey = $"product:{id}";

        // GetOrCreateAsync checks cache first, then executes factory on miss
        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            // Set cache options
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            entry.SlidingExpiration = TimeSpan.FromMinutes(2);

            // This only runs on cache miss
            return await _repository.GetByIdAsync(id);
        });
    }
}
```

## Cache Expiration Policies

Understanding expiration is critical for cache correctness. .NET provides two complementary expiration strategies.

### Absolute Expiration

Data expires at a fixed time regardless of access. Use this for data that becomes stale after a known period.

```csharp
public async Task<IEnumerable<Category>> GetCategoriesAsync()
{
    return await _cache.GetOrCreateAsync("categories:all", async entry =>
    {
        // Expire exactly 30 minutes from now
        // Good for data with known update schedules
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);

        return await _repository.GetAllCategoriesAsync();
    });
}
```

### Sliding Expiration

Data expires after a period of inactivity. Each access resets the timer. Use this for frequently accessed data that should stay cached while in use.

```csharp
public async Task<UserSession?> GetSessionAsync(string sessionId)
{
    return await _cache.GetOrCreateAsync($"session:{sessionId}", async entry =>
    {
        // Expire after 20 minutes of no access
        // Each read resets the 20-minute timer
        entry.SlidingExpiration = TimeSpan.FromMinutes(20);

        return await _sessionRepository.GetAsync(sessionId);
    });
}
```

### Combined Expiration

Use both together: sliding keeps active data cached, absolute prevents indefinite caching.

```csharp
public async Task<Product?> GetProductWithCombinedExpirationAsync(int id)
{
    return await _cache.GetOrCreateAsync($"product:{id}", async entry =>
    {
        // Sliding: stay cached while being accessed
        entry.SlidingExpiration = TimeSpan.FromMinutes(5);

        // Absolute: never cache longer than 1 hour
        // Prevents indefinite caching even with constant access
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);

        return await _repository.GetByIdAsync(id);
    });
}
```

### Cache Priority

When memory pressure occurs, .NET evicts items based on priority. Set priority based on how expensive the data is to recreate.

```csharp
entry.Priority = CacheItemPriority.High; // Keep longer under memory pressure
// Options: Low, Normal, High, NeverRemove
```

## Distributed Caching with Redis

IMemoryCache works for single servers. For multi-instance deployments (load-balanced, Kubernetes, etc.), you need distributed caching. Redis is the standard choice.

### Setup Redis in .NET

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add Redis distributed cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "MyApp:"; // Prefix for all keys
});

var app = builder.Build();
```

```json
// appsettings.json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false,connectTimeout=5000"
  }
}
```

### Using IDistributedCache

IDistributedCache has a different API than IMemoryCache - it works with byte arrays and requires explicit serialization.

```csharp
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

public class DistributedProductService
{
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _repository;

    public DistributedProductService(
        IDistributedCache cache,
        IProductRepository repository)
    {
        _cache = cache;
        _repository = repository;
    }

    public async Task<Product?> GetProductAsync(int id)
    {
        string cacheKey = $"product:{id}";

        // Try to get from cache
        byte[]? cachedData = await _cache.GetAsync(cacheKey);

        if (cachedData != null)
        {
            // Deserialize and return cached value
            return JsonSerializer.Deserialize<Product>(cachedData);
        }

        // Cache miss - get from database
        Product? product = await _repository.GetByIdAsync(id);

        if (product != null)
        {
            // Serialize and cache
            byte[] serializedData = JsonSerializer.SerializeToUtf8Bytes(product);

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10),
                SlidingExpiration = TimeSpan.FromMinutes(2)
            };

            await _cache.SetAsync(cacheKey, serializedData, options);
        }

        return product;
    }
}
```

### Extension Methods for Cleaner Code

Create extension methods to simplify the serialization boilerplate.

```csharp
public static class DistributedCacheExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // Get with automatic deserialization
    public static async Task<T?> GetAsync<T>(
        this IDistributedCache cache,
        string key,
        CancellationToken cancellationToken = default)
    {
        byte[]? data = await cache.GetAsync(key, cancellationToken);

        if (data == null)
            return default;

        return JsonSerializer.Deserialize<T>(data, JsonOptions);
    }

    // Set with automatic serialization
    public static async Task SetAsync<T>(
        this IDistributedCache cache,
        string key,
        T value,
        DistributedCacheEntryOptions options,
        CancellationToken cancellationToken = default)
    {
        byte[] data = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
        await cache.SetAsync(key, data, options, cancellationToken);
    }

    // GetOrCreate pattern for distributed cache
    public static async Task<T?> GetOrCreateAsync<T>(
        this IDistributedCache cache,
        string key,
        Func<Task<T?>> factory,
        DistributedCacheEntryOptions options,
        CancellationToken cancellationToken = default)
    {
        // Try cache first
        T? cached = await cache.GetAsync<T>(key, cancellationToken);
        if (cached != null)
            return cached;

        // Execute factory
        T? value = await factory();

        if (value != null)
        {
            await cache.SetAsync(key, value, options, cancellationToken);
        }

        return value;
    }
}
```

Now your service code becomes cleaner:

```csharp
public async Task<Product?> GetProductAsync(int id)
{
    var options = new DistributedCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
    };

    return await _cache.GetOrCreateAsync(
        $"product:{id}",
        () => _repository.GetByIdAsync(id),
        options
    );
}
```

## Cache-Aside Pattern Implementation

The cache-aside pattern is the most common caching strategy. The application manages the cache explicitly: check cache, fetch from source on miss, update cache.

```csharp
public class CacheAsideProductService
{
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _repository;
    private readonly ILogger<CacheAsideProductService> _logger;

    // Default cache options
    private readonly DistributedCacheEntryOptions _defaultOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15),
        SlidingExpiration = TimeSpan.FromMinutes(5)
    };

    public CacheAsideProductService(
        IDistributedCache cache,
        IProductRepository repository,
        ILogger<CacheAsideProductService> logger)
    {
        _cache = cache;
        _repository = repository;
        _logger = logger;
    }

    public async Task<Product?> GetProductAsync(int id)
    {
        string cacheKey = $"product:{id}";

        // Step 1: Check cache
        try
        {
            Product? cached = await _cache.GetAsync<Product>(cacheKey);
            if (cached != null)
            {
                _logger.LogDebug("Cache hit for {CacheKey}", cacheKey);
                return cached;
            }
        }
        catch (Exception ex)
        {
            // Cache failures should not break the application
            _logger.LogWarning(ex, "Cache read failed for {CacheKey}", cacheKey);
        }

        // Step 2: Cache miss - fetch from source
        _logger.LogDebug("Cache miss for {CacheKey}", cacheKey);
        Product? product = await _repository.GetByIdAsync(id);

        // Step 3: Populate cache
        if (product != null)
        {
            try
            {
                await _cache.SetAsync(cacheKey, product, _defaultOptions);
            }
            catch (Exception ex)
            {
                // Log but do not fail the request
                _logger.LogWarning(ex, "Cache write failed for {CacheKey}", cacheKey);
            }
        }

        return product;
    }

    // Update operation: update database first, then invalidate cache
    public async Task UpdateProductAsync(Product product)
    {
        // Always update the source of truth first
        await _repository.UpdateAsync(product);

        // Then invalidate cache
        string cacheKey = $"product:{product.Id}";
        try
        {
            await _cache.RemoveAsync(cacheKey);
            _logger.LogDebug("Invalidated cache for {CacheKey}", cacheKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache invalidation failed for {CacheKey}", cacheKey);
        }
    }
}
```

## Cache Invalidation Strategies

Cache invalidation is famously difficult. Here are practical strategies for different scenarios.

### Time-Based Invalidation

Let items expire naturally. Simple but can serve stale data.

```csharp
// Good for: reference data, configuration, content that updates infrequently
var options = new DistributedCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
};
```

### Event-Based Invalidation

Invalidate when data changes. More complex but keeps cache fresh.

```csharp
public class ProductService
{
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _repository;
    private readonly IEventBus _eventBus;

    public ProductService(
        IDistributedCache cache,
        IProductRepository repository,
        IEventBus eventBus)
    {
        _cache = cache;
        _repository = repository;
        _eventBus = eventBus;

        // Subscribe to product change events
        _eventBus.Subscribe<ProductUpdatedEvent>(OnProductUpdated);
        _eventBus.Subscribe<ProductDeletedEvent>(OnProductDeleted);
    }

    private async Task OnProductUpdated(ProductUpdatedEvent evt)
    {
        // Invalidate specific product cache
        await _cache.RemoveAsync($"product:{evt.ProductId}");

        // Invalidate related caches
        await _cache.RemoveAsync($"products:category:{evt.CategoryId}");
        await _cache.RemoveAsync("products:featured");
    }

    private async Task OnProductDeleted(ProductDeletedEvent evt)
    {
        await _cache.RemoveAsync($"product:{evt.ProductId}");
    }
}
```

### Pattern-Based Invalidation with Redis

Redis supports pattern-based key deletion. Useful for invalidating groups of related items.

```csharp
using StackExchange.Redis;

public class RedisCacheInvalidator
{
    private readonly IConnectionMultiplexer _redis;

    public RedisCacheInvalidator(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    // Invalidate all keys matching a pattern
    // WARNING: KEYS command is slow on large datasets - use SCAN in production
    public async Task InvalidatePatternAsync(string pattern)
    {
        var server = _redis.GetServer(_redis.GetEndPoints().First());
        var db = _redis.GetDatabase();

        // Use SCAN for production - it does not block Redis
        await foreach (var key in server.KeysAsync(pattern: pattern))
        {
            await db.KeyDeleteAsync(key);
        }
    }

    // Invalidate all products in a category
    public async Task InvalidateCategoryProductsAsync(int categoryId)
    {
        await InvalidatePatternAsync($"MyApp:product:category:{categoryId}:*");
    }
}
```

### Cache Tags with Custom Implementation

Group related cache entries with tags for bulk invalidation.

```csharp
public class TaggedCacheService
{
    private readonly IDistributedCache _cache;
    private readonly IConnectionMultiplexer _redis;

    public TaggedCacheService(
        IDistributedCache cache,
        IConnectionMultiplexer redis)
    {
        _cache = cache;
        _redis = redis;
    }

    // Set a value with associated tags
    public async Task SetWithTagsAsync<T>(
        string key,
        T value,
        string[] tags,
        DistributedCacheEntryOptions options)
    {
        var db = _redis.GetDatabase();

        // Store the value
        await _cache.SetAsync(key, value, options);

        // Associate key with each tag using Redis sets
        foreach (string tag in tags)
        {
            await db.SetAddAsync($"tag:{tag}", key);
        }
    }

    // Invalidate all keys associated with a tag
    public async Task InvalidateTagAsync(string tag)
    {
        var db = _redis.GetDatabase();
        string tagKey = $"tag:{tag}";

        // Get all keys with this tag
        RedisValue[] keys = await db.SetMembersAsync(tagKey);

        // Delete all associated cache entries
        foreach (var key in keys)
        {
            await _cache.RemoveAsync(key.ToString());
        }

        // Clear the tag set
        await db.KeyDeleteAsync(tagKey);
    }
}

// Usage
await _taggedCache.SetWithTagsAsync(
    $"product:{product.Id}",
    product,
    new[] { $"category:{product.CategoryId}", "products" },
    options
);

// Invalidate all products in category 5
await _taggedCache.InvalidateTagAsync("category:5");
```

## Best Practices for Cache Key Design

Good cache keys are unique, descriptive, and hierarchical.

```csharp
public static class CacheKeys
{
    // Use a consistent prefix for your application
    private const string Prefix = "myapp";

    // Include version for schema changes
    private const string Version = "v1";

    // Product keys
    public static string Product(int id) => $"{Prefix}:{Version}:product:{id}";
    public static string ProductsByCategory(int categoryId) =>
        $"{Prefix}:{Version}:products:category:{categoryId}";
    public static string ProductsSearch(string query, int page) =>
        $"{Prefix}:{Version}:products:search:{query}:page:{page}";

    // User keys
    public static string User(string userId) => $"{Prefix}:{Version}:user:{userId}";
    public static string UserPermissions(string userId) =>
        $"{Prefix}:{Version}:user:{userId}:permissions";
    public static string UserPreferences(string userId) =>
        $"{Prefix}:{Version}:user:{userId}:preferences";

    // Avoid: generic keys, user input directly in keys
    // Bad: "data", "cache", $"user-{userInput}"
}
```

### Key Design Rules

1. Use colons as separators - standard Redis convention
2. Include a namespace prefix - prevents collisions with other apps
3. Include version - allows cache invalidation on schema changes
4. Be specific - include all relevant identifiers
5. Sanitize user input - never put raw user input in keys

## When to Use Memory Cache vs Distributed Cache

| Factor | IMemoryCache | Redis |
|--------|-------------|-------|
| **Deployment** | Single instance | Multiple instances |
| **Latency** | Nanoseconds | Milliseconds |
| **Capacity** | Limited by RAM | Separate server |
| **Persistence** | None (restarts clear) | Optional |
| **Sharing** | Same process only | Across processes/servers |
| **Cost** | Free (uses app memory) | Infrastructure cost |

### Use IMemoryCache When

- Single server deployment
- Data is specific to one instance
- Microsecond latency matters
- Small data size (under 100MB)
- Cache can be rebuilt quickly

### Use Redis When

- Multiple application instances
- Cache must survive restarts
- Sharing cache across services
- Large datasets
- Need cache analytics/monitoring

### Hybrid Approach

Use both for optimal performance: memory cache as L1, Redis as L2.

```csharp
public class HybridCacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;

    public HybridCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
    }

    public async Task<T?> GetAsync<T>(string key, Func<Task<T?>> factory) where T : class
    {
        // L1: Check memory cache first (fastest)
        if (_memoryCache.TryGetValue(key, out T? value))
        {
            return value;
        }

        // L2: Check distributed cache
        value = await _distributedCache.GetAsync<T>(key);
        if (value != null)
        {
            // Populate L1 with shorter TTL
            _memoryCache.Set(key, value, TimeSpan.FromMinutes(1));
            return value;
        }

        // Cache miss - fetch from source
        value = await factory();

        if (value != null)
        {
            // Populate both caches
            _memoryCache.Set(key, value, TimeSpan.FromMinutes(1));

            await _distributedCache.SetAsync(key, value, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            });
        }

        return value;
    }
}
```

## Summary

| Pattern | Use Case |
|---------|----------|
| **IMemoryCache** | Single instance, low latency needs |
| **IDistributedCache + Redis** | Multi-instance, shared state |
| **Absolute expiration** | Data with known staleness tolerance |
| **Sliding expiration** | Session-like data, keep active items |
| **Cache-aside** | Explicit cache management |
| **Event-based invalidation** | Real-time consistency requirements |
| **Hybrid caching** | Best latency with multi-instance support |

Caching improves performance but adds complexity. Start simple with IMemoryCache, add Redis when you scale, and always plan for cache invalidation from the beginning.

Monitor your cache hit rates, latency, and memory usage to ensure your caching strategy is effective. [OneUptime](https://oneuptime.com) can help you track these metrics and alert you when cache performance degrades.
