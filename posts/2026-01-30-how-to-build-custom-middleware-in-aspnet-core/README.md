# How to Build Custom Middleware in ASP.NET Core

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: .NET, ASP.NET Core, Middleware, C#

Description: Learn how to build custom middleware in ASP.NET Core for request processing, logging, authentication, and error handling.

---

Middleware in ASP.NET Core forms the backbone of the request processing pipeline. Each middleware component can inspect, modify, or short-circuit requests before passing them to the next component. Understanding how to build custom middleware is essential for implementing cross-cutting concerns like logging, authentication, and error handling.

## Understanding the Middleware Pipeline

The middleware pipeline in ASP.NET Core processes requests sequentially. Each component receives a `RequestDelegate` representing the next middleware in the chain. This delegate-based approach allows middleware to perform operations before and after calling the next component.

```csharp
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        await _next(context);

        stopwatch.Stop();
        _logger.LogInformation("Request {Method} {Path} completed in {ElapsedMs}ms",
            context.Request.Method,
            context.Request.Path,
            stopwatch.ElapsedMilliseconds);
    }
}
```

## Using the IMiddleware Interface

For middleware that requires scoped dependencies, implement the `IMiddleware` interface. Unlike convention-based middleware, `IMiddleware` implementations are resolved from the dependency injection container per request.

```csharp
public class TransactionMiddleware : IMiddleware
{
    private readonly ITransactionService _transactionService;

    public TransactionMiddleware(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        await _transactionService.BeginTransactionAsync();

        try
        {
            await next(context);
            await _transactionService.CommitAsync();
        }
        catch
        {
            await _transactionService.RollbackAsync();
            throw;
        }
    }
}
```

Register `IMiddleware` implementations in the DI container:

```csharp
builder.Services.AddScoped<TransactionMiddleware>();
```

## Registering Middleware with UseMiddleware

The `UseMiddleware` extension method provides a clean way to add middleware to the pipeline:

```csharp
var app = builder.Build();

app.UseMiddleware<RequestTimingMiddleware>();
app.UseMiddleware<TransactionMiddleware>();

app.MapControllers();
app.Run();
```

## Conditional Middleware Execution

Use `UseWhen` or `MapWhen` to apply middleware conditionally based on request properties:

```csharp
// Apply middleware only to API routes
app.UseWhen(context => context.Request.Path.StartsWithSegments("/api"), appBuilder =>
{
    appBuilder.UseMiddleware<ApiKeyValidationMiddleware>();
});

// Branch the pipeline for health checks
app.MapWhen(context => context.Request.Path.StartsWithSegments("/health"), appBuilder =>
{
    appBuilder.Run(async context =>
    {
        context.Response.StatusCode = 200;
        await context.Response.WriteAsync("Healthy");
    });
});
```

## Short-Circuiting the Pipeline

Middleware can terminate request processing early by not calling the next delegate. This is useful for validation, caching, or error responses:

```csharp
public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private const string ApiKeyHeader = "X-API-Key";

    public ApiKeyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var apiKey))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "API key required" });
            return; // Short-circuit: don't call _next
        }

        if (!IsValidApiKey(apiKey))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
            return;
        }

        await _next(context);
    }

    private bool IsValidApiKey(string apiKey) => /* validation logic */;
}
```

## Dependency Injection in Middleware

Constructor injection works for singleton-lifetime dependencies. For scoped or transient services, inject them through the `InvokeAsync` method:

```csharp
public class AuditMiddleware
{
    private readonly RequestDelegate _next;

    public AuditMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        var auditEntry = new AuditEntry
        {
            Timestamp = DateTime.UtcNow,
            Method = context.Request.Method,
            Path = context.Request.Path,
            UserId = context.User?.Identity?.Name
        };

        await _next(context);

        auditEntry.StatusCode = context.Response.StatusCode;
        await auditService.LogAsync(auditEntry);
    }
}
```

## Creating Extension Methods

Encapsulate middleware registration with extension methods for cleaner startup configuration:

```csharp
public static class MiddlewareExtensions
{
    public static IApplicationBuilder UseRequestTiming(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RequestTimingMiddleware>();
    }

    public static IApplicationBuilder UseApiKeyValidation(this IApplicationBuilder app, string headerName = "X-API-Key")
    {
        return app.UseMiddleware<ApiKeyMiddleware>(headerName);
    }
}
```

Usage becomes straightforward:

```csharp
app.UseRequestTiming();
app.UseApiKeyValidation();
```

## Middleware Ordering Best Practices

The order of middleware registration matters significantly. A typical ordering follows this pattern:

1. Exception handling middleware (first to catch all errors)
2. HTTPS redirection
3. Static files
4. Routing
5. Authentication
6. Authorization
7. Custom middleware
8. Endpoint execution

Custom middleware fits naturally into this pipeline, allowing you to intercept requests at the appropriate stage for your specific requirements.

Building custom middleware in ASP.NET Core provides powerful capabilities for implementing cross-cutting concerns while keeping your application code clean and maintainable. Whether you need simple request logging or complex transaction management, the middleware pipeline offers the flexibility to handle diverse requirements efficiently.
