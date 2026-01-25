# How to Configure Response Caching in ASP.NET Core

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: .NET, C#, ASP.NET Core, Caching, Performance, API, Web Development

Description: Learn how to configure response caching in ASP.NET Core to improve performance, reduce server load, and deliver faster responses to clients.

---

Response caching significantly improves application performance by storing HTTP responses and serving them for subsequent identical requests. ASP.NET Core provides both client-side cache headers and server-side response caching middleware.

## Understanding Response Caching

Response caching works at multiple levels - browser caches, CDN caches, and server-side caches. Proper configuration ensures your responses are cached appropriately at each level.

```mermaid
flowchart LR
    Client[Client] --> Browser[Browser Cache]
    Browser --> CDN[CDN Cache]
    CDN --> Server[Server Cache]
    Server --> App[Application]

    Browser -.->|Cache Hit| Client
    CDN -.->|Cache Hit| Browser
    Server -.->|Cache Hit| CDN
```

## Basic Response Caching Setup

Add the response caching services and middleware:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddResponseCaching();
builder.Services.AddControllers();

var app = builder.Build();

// Add before endpoints
app.UseResponseCaching();

app.MapControllers();

app.Run();
```

## Using ResponseCache Attribute

Apply caching to controllers and actions:

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    // Cache for 60 seconds
    [HttpGet]
    [ResponseCache(Duration = 60)]
    public IActionResult GetAll()
    {
        return Ok(products);
    }

    // Cache varies by ID parameter
    [HttpGet("{id}")]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "id" })]
    public IActionResult GetById(int id)
    {
        return Ok(products.Find(p => p.Id == id));
    }

    // No caching for write operations
    [HttpPost]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult Create(Product product)
    {
        return Created($"/api/products/{product.Id}", product);
    }
}
```

## Cache Location Options

Control where responses can be cached:

```csharp
// Cache anywhere (browser, CDN, proxy)
[ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]

// Cache only on client browser
[ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Client)]

// Disable caching entirely
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
```

## VaryBy Options

Cache different versions based on request characteristics:

```csharp
[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    // Different cache for different query parameters
    [HttpGet]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "q", "page", "sort" })]
    public IActionResult Search(string q, int page = 1, string sort = "relevance")
    {
        return Ok(SearchProducts(q, page, sort));
    }
}

// Vary by header
[ResponseCache(Duration = 300, VaryByHeader = "Accept-Language")]
public IActionResult GetLocalizedContent()
{
    return Ok(GetContentForCurrentLanguage());
}
```

## Cache Profiles

Define reusable cache configurations:

```csharp
builder.Services.AddControllers(options =>
{
    options.CacheProfiles.Add("Default", new CacheProfile
    {
        Duration = 60,
        Location = ResponseCacheLocation.Any
    });

    options.CacheProfiles.Add("Short", new CacheProfile
    {
        Duration = 30,
        Location = ResponseCacheLocation.Client
    });

    options.CacheProfiles.Add("Long", new CacheProfile
    {
        Duration = 3600,
        Location = ResponseCacheLocation.Any,
        VaryByHeader = "Accept-Encoding"
    });

    options.CacheProfiles.Add("NoCache", new CacheProfile
    {
        NoStore = true,
        Location = ResponseCacheLocation.None
    });
});
```

Apply profiles to actions:

```csharp
[ApiController]
[Route("api/[controller]")]
public class ContentController : ControllerBase
{
    [HttpGet("static")]
    [ResponseCache(CacheProfileName = "Long")]
    public IActionResult GetStaticContent()
    {
        return Ok(staticContent);
    }

    [HttpGet("dynamic")]
    [ResponseCache(CacheProfileName = "Short")]
    public IActionResult GetDynamicContent()
    {
        return Ok(GetDynamicData());
    }

    [HttpGet("user-specific")]
    [ResponseCache(CacheProfileName = "NoCache")]
    public IActionResult GetUserData()
    {
        return Ok(GetCurrentUserData());
    }
}
```

## Server-Side Response Caching

Configure the response caching middleware options:

```csharp
builder.Services.AddResponseCaching(options =>
{
    options.MaximumBodySize = 64 * 1024 * 1024; // 64 MB
    options.SizeLimit = 100 * 1024 * 1024; // 100 MB total cache
    options.UseCaseSensitivePaths = false;
});
```

## Output Caching in .NET 7+

.NET 7 introduced output caching with more control:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromMinutes(10)));

    options.AddPolicy("Expire20", builder => builder.Expire(TimeSpan.FromMinutes(20)));

    options.AddPolicy("ByQuery", builder => builder
        .SetVaryByQuery("page", "sort")
        .Expire(TimeSpan.FromMinutes(5)));

    options.AddPolicy("NoCache", builder => builder.NoCache());
});

var app = builder.Build();

app.UseOutputCache();

// Apply caching to endpoints
app.MapGet("/products", GetProducts)
   .CacheOutput("Expire20");

app.MapGet("/search", Search)
   .CacheOutput("ByQuery");

app.MapPost("/orders", CreateOrder)
   .CacheOutput("NoCache");

app.Run();
```

## Cache Tag Invalidation

Invalidate cached responses when data changes:

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("Products", builder => builder
        .Tag("products")
        .Expire(TimeSpan.FromHours(1)));
});

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IOutputCacheStore _cache;

    public ProductsController(IOutputCacheStore cache)
    {
        _cache = cache;
    }

    [HttpGet]
    [OutputCache(PolicyName = "Products")]
    public IActionResult GetAll()
    {
        return Ok(products);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Product product)
    {
        // Save product
        SaveProduct(product);

        // Invalidate cache
        await _cache.EvictByTagAsync("products", default);

        return Created($"/api/products/{product.Id}", product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Product product)
    {
        UpdateProduct(id, product);
        await _cache.EvictByTagAsync("products", default);
        return NoContent();
    }
}
```

## Distributed Caching with Redis

For multi-server deployments, use Redis:

```csharp
builder.Services.AddStackExchangeRedisOutputCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "MyApp:";
});

builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromMinutes(10)));
});
```

## ETag Support

Implement ETags for conditional requests:

```csharp
[ApiController]
[Route("api/[controller]")]
public class ResourceController : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var resource = GetResource(id);

        if (resource == null)
            return NotFound();

        // Generate ETag from content hash
        var etag = $"\"{ComputeHash(resource)}\"";

        // Check If-None-Match header
        if (Request.Headers.IfNoneMatch.ToString() == etag)
        {
            return StatusCode(304); // Not Modified
        }

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "max-age=3600";

        return Ok(resource);
    }

    private string ComputeHash(object obj)
    {
        var json = JsonSerializer.Serialize(obj);
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(json));
        return Convert.ToBase64String(hash)[..12];
    }
}
```

## Cache-Control Headers

Set headers manually for fine-grained control:

```csharp
[HttpGet("{id}")]
public IActionResult GetWithCustomHeaders(int id)
{
    var resource = GetResource(id);

    Response.Headers.CacheControl = new CacheControlHeaderValue
    {
        Public = true,
        MaxAge = TimeSpan.FromHours(1),
        SharedMaxAge = TimeSpan.FromHours(24), // CDN cache time
        MustRevalidate = true
    }.ToString();

    Response.Headers.Vary = "Accept-Encoding, Accept-Language";

    return Ok(resource);
}
```

## Private vs Public Caching

Understand when to use each:

```csharp
// Public - can be cached by CDN/proxies
// Use for data that is the same for all users
[HttpGet("catalog")]
[ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
public IActionResult GetCatalog()
{
    return Ok(GetPublicCatalog());
}

// Private - only browser can cache
// Use for user-specific data
[HttpGet("preferences")]
[ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
[Authorize]
public IActionResult GetUserPreferences()
{
    return Ok(GetPreferencesForCurrentUser());
}

// No cache - sensitive data
[HttpGet("account/balance")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Authorize]
public IActionResult GetAccountBalance()
{
    return Ok(GetSensitiveFinancialData());
}
```

## Complete Configuration Example

Here is a production-ready caching setup:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Output caching with Redis for distributed scenarios
builder.Services.AddStackExchangeRedisOutputCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "MyApp:OutputCache:";
});

builder.Services.AddOutputCache(options =>
{
    // Default policy
    options.AddBasePolicy(builder => builder
        .Expire(TimeSpan.FromMinutes(5)));

    // Static content - long cache
    options.AddPolicy("Static", builder => builder
        .Expire(TimeSpan.FromHours(24))
        .Tag("static"));

    // API responses - medium cache with query variation
    options.AddPolicy("Api", builder => builder
        .Expire(TimeSpan.FromMinutes(10))
        .SetVaryByQuery("page", "limit", "sort", "filter")
        .Tag("api"));

    // User-specific - no server cache
    options.AddPolicy("UserSpecific", builder => builder
        .NoCache());
});

builder.Services.AddControllers();

var app = builder.Build();

app.UseOutputCache();
app.MapControllers();

app.Run();
```

## Summary

| Scenario | Configuration |
|----------|---------------|
| **Static content** | Long duration, public, CDN-cacheable |
| **API responses** | Medium duration, vary by query |
| **User-specific data** | Short duration, client-only |
| **Sensitive data** | No caching |
| **Distributed apps** | Use Redis output cache |

Response caching dramatically improves performance and reduces server load. Configure it appropriately for each type of content in your application, and remember to invalidate caches when underlying data changes.
