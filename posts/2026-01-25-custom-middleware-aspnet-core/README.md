# How to Build Custom Middleware in ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, ASP.NET Core, Middleware, C#, Web Development

Description: Learn how to build custom middleware in ASP.NET Core to handle cross-cutting concerns like logging, authentication, and request transformation with practical examples and best practices.

---

Middleware in ASP.NET Core is the backbone of the request pipeline. Every HTTP request passes through a chain of middleware components, each with the opportunity to inspect, modify, or short-circuit the request before it reaches your controller. Understanding how to build custom middleware gives you powerful control over your application's behavior.

## Understanding the Middleware Pipeline

When a request arrives at your ASP.NET Core application, it travels through middleware components in a specific order. Each middleware can perform work before and after the next component in the pipeline.

```mermaid
flowchart LR
    A[Request] --> B[Middleware 1]
    B --> C[Middleware 2]
    C --> D[Middleware 3]
    D --> E[Endpoint]
    E --> F[Response]
    F --> D
    D --> C
    C --> B
    B --> A
```

The order matters. Authentication middleware must run before authorization middleware. Logging middleware at the start captures the full request lifecycle.

## Creating Your First Middleware

The simplest way to create middleware is using the inline delegate approach:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Inline middleware using Use
app.Use(async (context, next) =>
{
    // Work before the next middleware
    var startTime = DateTime.UtcNow;

    // Call the next middleware in the pipeline
    await next(context);

    // Work after the response comes back
    var elapsed = DateTime.UtcNow - startTime;
    Console.WriteLine($"Request took {elapsed.TotalMilliseconds}ms");
});

app.MapGet("/", () => "Hello World!");
app.Run();
```

## Building a Middleware Class

For reusable middleware with dependencies, create a dedicated class:

```csharp
// RequestTimingMiddleware.cs
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    // Constructor receives the next middleware and any injected services
    public RequestTimingMiddleware(
        RequestDelegate next,
        ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // The Invoke or InvokeAsync method is called for each request
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        // Add a correlation ID if one doesn't exist
        if (!context.Request.Headers.ContainsKey("X-Correlation-Id"))
        {
            context.Request.Headers["X-Correlation-Id"] = Guid.NewGuid().ToString();
        }

        var correlationId = context.Request.Headers["X-Correlation-Id"].ToString();

        try
        {
            // Call the next middleware
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            _logger.LogInformation(
                "Request {Method} {Path} completed in {ElapsedMs}ms with status {StatusCode}. CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds,
                context.Response.StatusCode,
                correlationId);
        }
    }
}
```

Register it in your pipeline:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Add the middleware to the pipeline
app.UseMiddleware<RequestTimingMiddleware>();

app.MapGet("/", () => "Hello World!");
app.Run();
```

## Creating an Extension Method

Make your middleware easier to use with an extension method:

```csharp
// RequestTimingMiddlewareExtensions.cs
public static class RequestTimingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestTiming(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestTimingMiddleware>();
    }
}

// Usage in Program.cs becomes cleaner
app.UseRequestTiming();
```

## Middleware with Configuration Options

For configurable middleware, use the options pattern:

```csharp
// RateLimitingOptions.cs
public class RateLimitingOptions
{
    public int MaxRequestsPerMinute { get; set; } = 100;
    public bool EnableLogging { get; set; } = true;
    public string[] ExcludedPaths { get; set; } = Array.Empty<string>();
}

// RateLimitingMiddleware.cs
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly RateLimitingOptions _options;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly ConcurrentDictionary<string, ClientStatistics> _clients = new();

    public RateLimitingMiddleware(
        RequestDelegate next,
        IOptions<RateLimitingOptions> options,
        ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _options = options.Value;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Check if the path is excluded
        if (_options.ExcludedPaths.Any(p =>
            context.Request.Path.StartsWithSegments(p)))
        {
            await _next(context);
            return;
        }

        // Get client identifier (IP address or authenticated user)
        var clientId = GetClientId(context);
        var stats = _clients.GetOrAdd(clientId, _ => new ClientStatistics());

        // Clean up old requests
        stats.CleanupOldRequests();

        if (stats.RequestCount >= _options.MaxRequestsPerMinute)
        {
            if (_options.EnableLogging)
            {
                _logger.LogWarning(
                    "Rate limit exceeded for client {ClientId}", clientId);
            }

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = "60";
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded. Try again later."
            });
            return;
        }

        stats.AddRequest();
        await _next(context);
    }

    private string GetClientId(HttpContext context)
    {
        // Use authenticated user ID if available, otherwise use IP
        if (context.User.Identity?.IsAuthenticated == true)
        {
            return context.User.Identity.Name ?? "anonymous";
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}

// Helper class to track request statistics
public class ClientStatistics
{
    private readonly Queue<DateTime> _requests = new();
    private readonly object _lock = new();

    public int RequestCount
    {
        get
        {
            lock (_lock)
            {
                return _requests.Count;
            }
        }
    }

    public void AddRequest()
    {
        lock (_lock)
        {
            _requests.Enqueue(DateTime.UtcNow);
        }
    }

    public void CleanupOldRequests()
    {
        lock (_lock)
        {
            var threshold = DateTime.UtcNow.AddMinutes(-1);
            while (_requests.Count > 0 && _requests.Peek() < threshold)
            {
                _requests.Dequeue();
            }
        }
    }
}
```

Configure and register the middleware:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Configure options from appsettings.json or inline
builder.Services.Configure<RateLimitingOptions>(
    builder.Configuration.GetSection("RateLimiting"));

var app = builder.Build();

app.UseMiddleware<RateLimitingMiddleware>();

app.MapGet("/", () => "Hello World!");
app.Run();
```

## Exception Handling Middleware

A common use case is global exception handling:

```csharp
// ExceptionHandlingMiddleware.cs
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "Unhandled exception occurred");

        var (statusCode, message) = exception switch
        {
            ArgumentException => (StatusCodes.Status400BadRequest, exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            _ => (StatusCodes.Status500InternalServerError, "An error occurred")
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            error = message,
            // Only include stack trace in development
            details = _environment.IsDevelopment() ? exception.ToString() : null
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}
```

## Request and Response Manipulation

Middleware can modify requests and responses:

```csharp
// ResponseCompressionMiddleware.cs - Example of response manipulation
public class JsonResponseWrapperMiddleware
{
    private readonly RequestDelegate _next;

    public JsonResponseWrapperMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Capture the original response body stream
        var originalBodyStream = context.Response.Body;

        using var newBodyStream = new MemoryStream();
        context.Response.Body = newBodyStream;

        await _next(context);

        // Only wrap JSON responses
        if (context.Response.ContentType?.Contains("application/json") == true)
        {
            newBodyStream.Seek(0, SeekOrigin.Begin);
            var originalContent = await new StreamReader(newBodyStream).ReadToEndAsync();

            // Wrap the response
            var wrappedContent = JsonSerializer.Serialize(new
            {
                success = context.Response.StatusCode < 400,
                data = JsonSerializer.Deserialize<object>(originalContent),
                timestamp = DateTime.UtcNow
            });

            // Write the wrapped content
            context.Response.Body = originalBodyStream;
            context.Response.ContentLength = Encoding.UTF8.GetByteCount(wrappedContent);
            await context.Response.WriteAsync(wrappedContent);
        }
        else
        {
            // Copy unchanged content back
            newBodyStream.Seek(0, SeekOrigin.Begin);
            await newBodyStream.CopyToAsync(originalBodyStream);
        }
    }
}
```

## Conditional Middleware

Use MapWhen or UseWhen to apply middleware conditionally:

```csharp
// Program.cs
var app = builder.Build();

// Only apply to API routes
app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/api"),
    appBuilder =>
    {
        appBuilder.UseMiddleware<ApiKeyValidationMiddleware>();
    });

// Different middleware for specific paths
app.MapWhen(
    context => context.Request.Path.StartsWithSegments("/admin"),
    appBuilder =>
    {
        appBuilder.UseMiddleware<AdminAuthenticationMiddleware>();
        appBuilder.UseMiddleware<AuditLoggingMiddleware>();
    });

app.MapGet("/", () => "Public endpoint");
app.MapGet("/api/data", () => "API endpoint");
app.MapGet("/admin/dashboard", () => "Admin endpoint");

app.Run();
```

## Best Practices

| Practice | Reason |
|----------|--------|
| Keep middleware focused | Single responsibility makes testing easier |
| Order matters | Authentication before authorization |
| Use async properly | Never block with .Result or .Wait() |
| Handle exceptions | Middleware should not leak exceptions |
| Clean up resources | Use try/finally or using statements |

## Summary

Custom middleware in ASP.NET Core provides a clean way to handle cross-cutting concerns. Whether you need request logging, rate limiting, exception handling, or request transformation, middleware keeps your controllers focused on business logic. Start with inline delegates for simple cases and graduate to full middleware classes when you need dependency injection or configuration.

The middleware pattern encourages separation of concerns and makes your application more testable and maintainable. By understanding the request pipeline and following the patterns shown here, you can build robust middleware that integrates seamlessly with your ASP.NET Core applications.
