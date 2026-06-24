# How to Use Redis for ASP.NET Core Output Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ASP.NET Core, Output Caching, Distributed Cache, C#

Description: Configure Redis as the output cache store in ASP.NET Core 7+ to cache full HTTP responses at the middleware level with fine-grained policies.

---

## Introduction

ASP.NET Core 7 introduced a new Output Caching middleware that caches full HTTP responses. Unlike the older Response Caching middleware, Output Caching supports fine-grained policies, cache key customization, and tag-based invalidation. Starting with .NET 8, Redis can be used as a distributed output cache store through the `Microsoft.AspNetCore.OutputCaching.StackExchangeRedis` package.

## Installation

```bash
dotnet add package Microsoft.AspNetCore.OutputCaching.StackExchangeRedis
```

## Configuration in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add Output Caching with Redis backend
builder.Services.AddOutputCache(options =>
{
    // Default policy: cache for 1 minute
    options.AddBasePolicy(b => b.Expire(TimeSpan.FromMinutes(1)));

    // Named policy for products
    options.AddPolicy("Products", b =>
        b.Expire(TimeSpan.FromMinutes(5))
         .SetVaryByQuery("page", "limit", "category")
         .Tag("products")
    );

    // Named policy for static data
    options.AddPolicy("Static", b =>
        b.Expire(TimeSpan.FromHours(1))
         .Tag("static")
    );
});

// Use Redis as the output cache store
builder.Services.AddStackExchangeRedisOutputCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "OutputCache:";
});

var app = builder.Build();
app.UseOutputCache();
app.MapControllers();
app.Run();
```

## Applying Output Cache to Endpoints

Using the attribute on a controller action:

```csharp
using Microsoft.AspNetCore.OutputCaching;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _service;

    public ProductsController(ProductService service) => _service = service;

    // Use the named Products policy
    [HttpGet]
    [OutputCache(PolicyName = "Products")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1)
    {
        var products = await _service.GetPageAsync(page);
        return Ok(products);
    }

    // Inline TTL configuration
    [HttpGet("{id}")]
    [OutputCache(Duration = 600)]
    public async Task<IActionResult> Get(int id)
    {
        var product = await _service.FindByIdAsync(id);
        return product == null ? NotFound() : Ok(product);
    }

    // No caching for write endpoints
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req)
    {
        var product = await _service.CreateAsync(req);
        return CreatedAtAction(nameof(Get), new { id = product.Id }, product);
    }
}
```

## Applying to Minimal API Endpoints

```csharp
app.MapGet("/api/categories", async (CategoryService svc) =>
{
    var categories = await svc.GetAllAsync();
    return Results.Ok(categories);
}).CacheOutput("Static");

app.MapGet("/api/config", async (ConfigService svc) =>
{
    return Results.Ok(await svc.GetAsync());
}).CacheOutput(b => b.Expire(TimeSpan.FromHours(6)));
```

## Cache Invalidation by Tag

Tags allow you to invalidate groups of cached responses:

```csharp
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IOutputCacheStore _cacheStore;

    public AdminController(IOutputCacheStore cacheStore) => _cacheStore = cacheStore;

    [HttpPost("invalidate/products")]
    public async Task<IActionResult> InvalidateProducts(CancellationToken ct)
    {
        // Evict all responses tagged with "products"
        await _cacheStore.EvictByTagAsync("products", ct);
        return Ok(new { message = "Product cache cleared" });
    }

    [HttpPost("invalidate/all")]
    public async Task<IActionResult> InvalidateAll(CancellationToken ct)
    {
        await _cacheStore.EvictByTagAsync("static", ct);
        await _cacheStore.EvictByTagAsync("products", ct);
        return Ok(new { message = "All caches cleared" });
    }
}
```

## Custom Cache Key Policy

```csharp
builder.Services.AddOutputCache(options =>
{
    // excludeDefaultPolicy: true is required because the default policy
    // skips caching for requests with an Authorization header
    options.AddPolicy("PerUser", b =>
        b.SetVaryByHeader("Authorization")
         .Expire(TimeSpan.FromMinutes(5))
         .Tag("user-data"),
        excludeDefaultPolicy: true
    );

    options.AddPolicy("PerUserAndQuery", b =>
        b.SetVaryByHeader("Authorization")
         .SetVaryByQuery("*")
         .Expire(TimeSpan.FromMinutes(2)),
        excludeDefaultPolicy: true
    );
});
```

```csharp
[HttpGet("my-orders")]
[OutputCache(PolicyName = "PerUser")]
public async Task<IActionResult> MyOrders()
{
    var userId = User.FindFirst("sub")?.Value;
    var orders = await _orderService.GetByUserAsync(userId);
    return Ok(orders);
}
```

## Summary

ASP.NET Core Output Caching with Redis provides full HTTP response caching at the middleware level, storing entire response bodies in Redis with configurable expiration. Named policies in `AddOutputCache` let you define reusable caching rules with TTL, vary-by-query, and vary-by-header options. Tag-based eviction through `IOutputCacheStore.EvictByTagAsync` makes it easy to invalidate groups of cached responses when underlying data changes.
