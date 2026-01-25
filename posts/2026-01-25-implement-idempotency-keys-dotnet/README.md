# How to Implement Idempotency Keys in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, API Design, Distributed Systems, Reliability

Description: Learn how to implement idempotency keys in .NET applications to prevent duplicate operations, ensure safe retries, and build reliable APIs that handle network failures gracefully.

---

Network failures happen. Clients timeout and retry. Users double-click submit buttons. Without idempotency, these scenarios lead to duplicate charges, duplicate orders, and frustrated customers. Idempotency keys solve this problem by ensuring that repeating the same request produces the same result without executing the operation multiple times.

## What is Idempotency?

An operation is idempotent if executing it multiple times produces the same result as executing it once. HTTP GET and DELETE are naturally idempotent, but POST and PATCH are not. When a client sends a payment request and the connection drops after the server processes it but before sending the response, the client does not know if the payment succeeded. Without idempotency, retrying creates a duplicate charge.

| HTTP Method | Naturally Idempotent | Why |
|-------------|---------------------|-----|
| GET | Yes | Reading does not change state |
| PUT | Yes | Replaces entire resource |
| DELETE | Yes | Deleting twice has same effect |
| POST | No | Creates new resource each time |
| PATCH | No | May increment values |

## Basic Idempotency Key Implementation

The simplest approach uses a dictionary to store request results keyed by an idempotency key. When a request arrives, check if we have already processed it. If yes, return the cached result. If no, process the request and cache the result.

```csharp
// Simple in-memory idempotency store
// Good for development, but use Redis or a database in production
public class IdempotencyService
{
    // Stores the result of processed requests
    private readonly ConcurrentDictionary<string, IdempotencyEntry> _cache = new();

    // How long to keep entries before they expire
    private readonly TimeSpan _entryLifetime = TimeSpan.FromHours(24);

    public async Task<T?> GetOrExecuteAsync<T>(
        string idempotencyKey,
        Func<Task<T>> operation)
    {
        // Check if we already processed this request
        if (_cache.TryGetValue(idempotencyKey, out var existing))
        {
            if (existing.Status == IdempotencyStatus.Completed)
            {
                // Return cached result without executing again
                return (T)existing.Result!;
            }

            if (existing.Status == IdempotencyStatus.Processing)
            {
                // Another thread is processing this request
                throw new ConflictException("Request is already being processed");
            }
        }

        // Mark as processing to prevent concurrent duplicate execution
        var entry = new IdempotencyEntry
        {
            Key = idempotencyKey,
            Status = IdempotencyStatus.Processing,
            CreatedAt = DateTime.UtcNow
        };

        if (!_cache.TryAdd(idempotencyKey, entry))
        {
            // Race condition: another thread added the key first
            throw new ConflictException("Request is already being processed");
        }

        try
        {
            // Execute the actual operation
            var result = await operation();

            // Cache the successful result
            entry.Result = result;
            entry.Status = IdempotencyStatus.Completed;
            entry.CompletedAt = DateTime.UtcNow;

            return result;
        }
        catch (Exception ex)
        {
            // Cache the failure so retries with same key get same error
            entry.Status = IdempotencyStatus.Failed;
            entry.ErrorMessage = ex.Message;
            throw;
        }
    }
}

public class IdempotencyEntry
{
    public string Key { get; set; } = string.Empty;
    public IdempotencyStatus Status { get; set; }
    public object? Result { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public enum IdempotencyStatus
{
    Processing,
    Completed,
    Failed
}
```

## ASP.NET Core Middleware for Idempotency

A middleware approach handles idempotency transparently for all endpoints. The middleware intercepts requests, checks for the idempotency key header, and manages caching automatically.

```csharp
// Middleware that automatically handles idempotency for POST/PATCH requests
public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IIdempotencyStore _store;
    private readonly ILogger<IdempotencyMiddleware> _logger;

    // Header name where clients send the idempotency key
    private const string IdempotencyKeyHeader = "Idempotency-Key";

    public IdempotencyMiddleware(
        RequestDelegate next,
        IIdempotencyStore store,
        ILogger<IdempotencyMiddleware> logger)
    {
        _next = next;
        _store = store;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only apply to non-idempotent methods
        if (!ShouldApplyIdempotency(context.Request.Method))
        {
            await _next(context);
            return;
        }

        // Check for idempotency key header
        if (!context.Request.Headers.TryGetValue(IdempotencyKeyHeader, out var keyValues))
        {
            await _next(context);
            return;
        }

        var idempotencyKey = keyValues.ToString();
        if (string.IsNullOrEmpty(idempotencyKey))
        {
            await _next(context);
            return;
        }

        // Create a composite key including the endpoint path
        var compositeKey = $"{context.Request.Path}:{idempotencyKey}";

        // Check for existing response
        var existingResponse = await _store.GetAsync(compositeKey);
        if (existingResponse != null)
        {
            _logger.LogInformation(
                "Returning cached response for idempotency key {Key}",
                idempotencyKey);

            context.Response.StatusCode = existingResponse.StatusCode;
            context.Response.ContentType = existingResponse.ContentType;

            // Add header to indicate this is a cached response
            context.Response.Headers["Idempotency-Replayed"] = "true";

            await context.Response.WriteAsync(existingResponse.Body);
            return;
        }

        // Capture the response
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);

            // Read the response
            responseBody.Seek(0, SeekOrigin.Begin);
            var responseText = await new StreamReader(responseBody).ReadToEndAsync();

            // Store the response for future identical requests
            await _store.SetAsync(compositeKey, new CachedResponse
            {
                StatusCode = context.Response.StatusCode,
                ContentType = context.Response.ContentType ?? "application/json",
                Body = responseText,
                CreatedAt = DateTime.UtcNow
            });

            // Copy response to original stream
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }

    private bool ShouldApplyIdempotency(string method)
    {
        return method == HttpMethods.Post || method == HttpMethods.Patch;
    }
}

// Register in Program.cs
// app.UseMiddleware<IdempotencyMiddleware>();
```

## Redis-Based Idempotency Store

For production systems, store idempotency data in Redis. This handles multiple server instances and provides automatic expiration.

```csharp
// Production-ready idempotency store using Redis
// Supports distributed scenarios with multiple API instances
public class RedisIdempotencyStore : IIdempotencyStore
{
    private readonly IConnectionMultiplexer _redis;
    private readonly TimeSpan _defaultExpiry = TimeSpan.FromHours(24);
    private readonly ILogger<RedisIdempotencyStore> _logger;

    public RedisIdempotencyStore(
        IConnectionMultiplexer redis,
        ILogger<RedisIdempotencyStore> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<CachedResponse?> GetAsync(string key)
    {
        var db = _redis.GetDatabase();
        var value = await db.StringGetAsync($"idempotency:{key}");

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<CachedResponse>(value!);
    }

    public async Task SetAsync(string key, CachedResponse response)
    {
        var db = _redis.GetDatabase();
        var json = JsonSerializer.Serialize(response);

        // Set with expiration so old entries clean up automatically
        await db.StringSetAsync(
            $"idempotency:{key}",
            json,
            _defaultExpiry);
    }

    // Use Redis SETNX to prevent race conditions
    public async Task<bool> TryLockAsync(string key, TimeSpan lockDuration)
    {
        var db = _redis.GetDatabase();

        // SETNX returns true only if the key did not exist
        return await db.StringSetAsync(
            $"idempotency:lock:{key}",
            DateTime.UtcNow.ToString("O"),
            lockDuration,
            When.NotExists);
    }

    public async Task ReleaseLockAsync(string key)
    {
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync($"idempotency:lock:{key}");
    }
}

public interface IIdempotencyStore
{
    Task<CachedResponse?> GetAsync(string key);
    Task SetAsync(string key, CachedResponse response);
    Task<bool> TryLockAsync(string key, TimeSpan lockDuration);
    Task ReleaseLockAsync(string key);
}

public class CachedResponse
{
    public int StatusCode { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
```

## Attribute-Based Idempotency

Use an action filter attribute for fine-grained control over which endpoints require idempotency.

```csharp
// Attribute to mark endpoints as idempotent
// Apply to specific actions that need idempotency protection
[AttributeUsage(AttributeTargets.Method)]
public class IdempotentAttribute : Attribute, IAsyncActionFilter
{
    public string? HeaderName { get; set; } = "Idempotency-Key";
    public int CacheSeconds { get; set; } = 86400; // 24 hours

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var store = context.HttpContext.RequestServices
            .GetRequiredService<IIdempotencyStore>();
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILogger<IdempotentAttribute>>();

        // Extract idempotency key from header
        if (!context.HttpContext.Request.Headers
            .TryGetValue(HeaderName!, out var keyValue))
        {
            // No idempotency key provided, proceed normally
            await next();
            return;
        }

        var idempotencyKey = keyValue.ToString();
        var compositeKey = $"{context.HttpContext.Request.Path}:{idempotencyKey}";

        // Try to acquire lock to prevent concurrent processing
        if (!await store.TryLockAsync(compositeKey, TimeSpan.FromSeconds(30)))
        {
            context.Result = new ConflictObjectResult(new
            {
                Error = "Request with this idempotency key is already being processed"
            });
            return;
        }

        try
        {
            // Check for cached response
            var cached = await store.GetAsync(compositeKey);
            if (cached != null)
            {
                logger.LogInformation(
                    "Returning cached response for key {Key}",
                    idempotencyKey);

                context.HttpContext.Response.Headers["Idempotency-Replayed"] = "true";
                context.Result = new ContentResult
                {
                    StatusCode = cached.StatusCode,
                    Content = cached.Body,
                    ContentType = cached.ContentType
                };
                return;
            }

            // Execute the action
            var executedContext = await next();

            // Cache successful responses
            if (executedContext.Result is ObjectResult objectResult)
            {
                var json = JsonSerializer.Serialize(objectResult.Value);
                await store.SetAsync(compositeKey, new CachedResponse
                {
                    StatusCode = objectResult.StatusCode ?? 200,
                    ContentType = "application/json",
                    Body = json,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        finally
        {
            await store.ReleaseLockAsync(compositeKey);
        }
    }
}

// Usage in a controller
[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost]
    [Idempotent] // This endpoint is now idempotent
    public async Task<ActionResult<PaymentResult>> ProcessPayment(
        PaymentRequest request)
    {
        var result = await _paymentService.ProcessAsync(request);
        return Ok(result);
    }
}
```

## Database-Level Idempotency

For critical operations like payments, combine application-level idempotency with database constraints. This provides an extra safety layer even if the cache fails.

```csharp
// Entity for tracking processed idempotent operations
public class IdempotentOperation
{
    public Guid Id { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string OperationType { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public string ResponseJson { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

// DbContext configuration
public class AppDbContext : DbContext
{
    public DbSet<IdempotentOperation> IdempotentOperations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IdempotentOperation>(entity =>
        {
            // Unique constraint ensures no duplicate keys
            entity.HasIndex(e => new { e.IdempotencyKey, e.OperationType })
                .IsUnique();

            // Index for cleanup queries
            entity.HasIndex(e => e.ExpiresAt);
        });
    }
}

// Service that uses database for idempotency
public class DatabaseIdempotencyService
{
    private readonly AppDbContext _context;
    private readonly ILogger<DatabaseIdempotencyService> _logger;

    public DatabaseIdempotencyService(
        AppDbContext context,
        ILogger<DatabaseIdempotencyService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<T> ExecuteIdempotentAsync<T>(
        string idempotencyKey,
        string operationType,
        object request,
        Func<Task<T>> operation)
    {
        // Calculate request hash to detect mismatched payloads
        var requestHash = ComputeHash(JsonSerializer.Serialize(request));

        // Check for existing operation
        var existing = await _context.IdempotentOperations
            .FirstOrDefaultAsync(o =>
                o.IdempotencyKey == idempotencyKey &&
                o.OperationType == operationType);

        if (existing != null)
        {
            // Verify the request matches the original
            if (existing.RequestHash != requestHash)
            {
                throw new InvalidOperationException(
                    "Idempotency key was used with a different request payload");
            }

            _logger.LogInformation(
                "Returning stored result for idempotency key {Key}",
                idempotencyKey);

            return JsonSerializer.Deserialize<T>(existing.ResponseJson)!;
        }

        // Execute the operation
        var result = await operation();

        // Store the result
        var entry = new IdempotentOperation
        {
            Id = Guid.NewGuid(),
            IdempotencyKey = idempotencyKey,
            OperationType = operationType,
            RequestHash = requestHash,
            ResponseJson = JsonSerializer.Serialize(result),
            StatusCode = 200,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        _context.IdempotentOperations.Add(entry);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (IsDuplicateKeyException())
        {
            // Race condition: another request created the entry
            // Fetch and return the existing result
            existing = await _context.IdempotentOperations
                .FirstAsync(o =>
                    o.IdempotencyKey == idempotencyKey &&
                    o.OperationType == operationType);

            return JsonSerializer.Deserialize<T>(existing.ResponseJson)!;
        }

        return result;
    }

    private string ComputeHash(string input)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToBase64String(bytes);
    }

    private bool IsDuplicateKeyException()
    {
        // Implementation depends on your database provider
        return true;
    }
}
```

## Client-Side Implementation

Clients should generate idempotency keys and include them in requests. A good practice is using UUIDs combined with operation context.

```csharp
// HTTP client with automatic idempotency key generation
public class IdempotentHttpClient
{
    private readonly HttpClient _httpClient;

    public IdempotentHttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<T?> PostWithIdempotencyAsync<T>(
        string url,
        object content,
        string? idempotencyKey = null)
    {
        // Generate key if not provided
        idempotencyKey ??= Guid.NewGuid().ToString();

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(content)
        };

        // Add idempotency key header
        request.Headers.Add("Idempotency-Key", idempotencyKey);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        // Check if response was replayed
        if (response.Headers.Contains("Idempotency-Replayed"))
        {
            // Log that this was a cached response
        }

        return await response.Content.ReadFromJsonAsync<T>();
    }
}
```

## Summary

Idempotency keys transform unreliable networks into reliable operations. Key takeaways:

| Approach | Best For | Trade-offs |
|----------|----------|------------|
| In-memory cache | Development, single instance | Lost on restart |
| Redis | Distributed systems | Extra infrastructure |
| Database | Critical operations, auditing | Slower, but durable |
| Middleware | Automatic coverage | Less control |
| Attribute | Selective endpoints | More configuration |

Always validate that the request payload matches when returning cached responses. Different payloads with the same idempotency key indicate a client bug. Implement cleanup for expired entries to prevent unbounded storage growth.
