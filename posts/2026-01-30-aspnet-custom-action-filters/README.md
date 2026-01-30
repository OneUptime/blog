# How to Build Custom Action Filters in ASP.NET

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CSharp, ASP.NET, Web Development, Filters

Description: Learn to create custom action filters in ASP.NET Core for logging, validation, caching, and cross-cutting concerns with practical implementation examples.

---

Action filters in ASP.NET Core let you run code before and after action methods execute. They are perfect for implementing cross-cutting concerns like logging, validation, caching, and authorization without cluttering your controller logic. This guide walks through building custom action filters from scratch with real-world examples.

## Understanding Action Filters

Action filters sit in the ASP.NET Core request pipeline and intercept requests at the action level. They provide hooks to execute code:

- Before an action executes
- After an action executes
- When an action throws an exception

### Filter Types in ASP.NET Core

ASP.NET Core provides several filter interfaces. Here is a comparison:

| Filter Type | Interface | Purpose |
|-------------|-----------|---------|
| Authorization | `IAuthorizationFilter` | Runs first, handles authorization |
| Resource | `IResourceFilter` | Runs after authorization, before model binding |
| Action | `IActionFilter` | Runs before and after action method |
| Exception | `IExceptionFilter` | Handles unhandled exceptions |
| Result | `IResultFilter` | Runs before and after action result execution |

For this guide, we focus on action filters using `IActionFilter` and `IAsyncActionFilter`.

## The IActionFilter Interface

The synchronous action filter interface contains two methods:

```csharp
public interface IActionFilter : IFilterMetadata
{
    // Runs before the action method executes
    void OnActionExecuting(ActionExecutingContext context);

    // Runs after the action method executes
    void OnActionExecuted(ActionExecutedContext context);
}
```

### ActionExecutingContext Properties

The `ActionExecutingContext` gives you access to request details before the action runs:

```csharp
public class ActionExecutingContext : FilterContext
{
    // The action arguments dictionary
    public IDictionary<string, object?> ActionArguments { get; }

    // The controller instance
    public object Controller { get; }

    // Set this to short-circuit the action
    public IActionResult? Result { get; set; }
}
```

### ActionExecutedContext Properties

The `ActionExecutedContext` provides information after the action completes:

```csharp
public class ActionExecutedContext : FilterContext
{
    // The controller instance
    public object Controller { get; }

    // Any exception thrown by the action
    public Exception? Exception { get; set; }

    // Whether the exception was handled
    public bool ExceptionHandled { get; set; }

    // The action result
    public IActionResult? Result { get; set; }

    // Whether the action was canceled
    public bool Canceled { get; }
}
```

## Building Your First Action Filter

Let's start with a simple logging filter that tracks action execution time.

### Basic Logging Filter

This filter logs when actions start and finish, along with execution duration:

```csharp
using Microsoft.AspNetCore.Mvc.Filters;
using System.Diagnostics;

public class ExecutionTimeFilter : IActionFilter
{
    private readonly ILogger<ExecutionTimeFilter> _logger;
    private Stopwatch? _stopwatch;

    public ExecutionTimeFilter(ILogger<ExecutionTimeFilter> logger)
    {
        _logger = logger;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        _stopwatch = Stopwatch.StartNew();

        var controllerName = context.RouteData.Values["controller"];
        var actionName = context.RouteData.Values["action"];

        _logger.LogInformation(
            "Starting execution of {Controller}.{Action}",
            controllerName,
            actionName);
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        _stopwatch?.Stop();

        var controllerName = context.RouteData.Values["controller"];
        var actionName = context.RouteData.Values["action"];
        var elapsedMs = _stopwatch?.ElapsedMilliseconds ?? 0;

        _logger.LogInformation(
            "Finished execution of {Controller}.{Action} in {ElapsedMs}ms",
            controllerName,
            actionName,
            elapsedMs);
    }
}
```

### Registering the Filter

Register the filter in `Program.cs`:

```csharp
// Register as a service for dependency injection
builder.Services.AddScoped<ExecutionTimeFilter>();

// Add to all controllers globally
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ExecutionTimeFilter>();
});
```

## The IAsyncActionFilter Interface

For async operations, use `IAsyncActionFilter`:

```csharp
public interface IAsyncActionFilter : IFilterMetadata
{
    Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next);
}
```

The `next` delegate executes the action (and subsequent filters). You control when and if it runs.

### Async Logging Filter

Here is the logging filter rewritten as an async filter:

```csharp
using Microsoft.AspNetCore.Mvc.Filters;
using System.Diagnostics;

public class AsyncExecutionTimeFilter : IAsyncActionFilter
{
    private readonly ILogger<AsyncExecutionTimeFilter> _logger;

    public AsyncExecutionTimeFilter(ILogger<AsyncExecutionTimeFilter> logger)
    {
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var controllerName = context.RouteData.Values["controller"];
        var actionName = context.RouteData.Values["action"];

        _logger.LogInformation(
            "Starting execution of {Controller}.{Action}",
            controllerName,
            actionName);

        var stopwatch = Stopwatch.StartNew();

        // Execute the action
        var resultContext = await next();

        stopwatch.Stop();

        if (resultContext.Exception != null)
        {
            _logger.LogError(
                resultContext.Exception,
                "Action {Controller}.{Action} threw an exception after {ElapsedMs}ms",
                controllerName,
                actionName,
                stopwatch.ElapsedMilliseconds);
        }
        else
        {
            _logger.LogInformation(
                "Finished execution of {Controller}.{Action} in {ElapsedMs}ms",
                controllerName,
                actionName,
                stopwatch.ElapsedMilliseconds);
        }
    }
}
```

## Practical Example: Input Validation Filter

Create a filter that validates model state and returns consistent error responses:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public class ValidateModelStateFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            var response = new
            {
                Success = false,
                Message = "Validation failed",
                Errors = errors
            };

            // Short-circuit the request
            context.Result = new BadRequestObjectResult(response);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // No post-processing needed
    }
}
```

Apply to controllers or actions using attributes:

```csharp
// Register the filter as a service filter
builder.Services.AddScoped<ValidateModelStateFilter>();

// Apply to a specific controller
[ServiceFilter(typeof(ValidateModelStateFilter))]
public class UsersController : ControllerBase
{
    [HttpPost]
    public IActionResult Create([FromBody] CreateUserRequest request)
    {
        // Model validation already handled by filter
        // Proceed with business logic
        return Ok(new { Id = 1, request.Name, request.Email });
    }
}
```

## Practical Example: Rate Limiting Filter

Build a simple rate limiting filter using in-memory storage:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;

public class RateLimitFilter : IAsyncActionFilter
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<RateLimitFilter> _logger;
    private readonly int _maxRequests;
    private readonly TimeSpan _window;

    public RateLimitFilter(
        IMemoryCache cache,
        ILogger<RateLimitFilter> logger,
        int maxRequests = 100,
        int windowSeconds = 60)
    {
        _cache = cache;
        _logger = logger;
        _maxRequests = maxRequests;
        _window = TimeSpan.FromSeconds(windowSeconds);
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
        var endpoint = context.HttpContext.Request.Path.ToString();
        var cacheKey = $"rate_limit:{ipAddress}:{endpoint}";

        var requestCount = _cache.GetOrCreate(cacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = _window;
            return 0;
        });

        if (requestCount >= _maxRequests)
        {
            _logger.LogWarning(
                "Rate limit exceeded for IP {IpAddress} on endpoint {Endpoint}",
                ipAddress,
                endpoint);

            context.Result = new ObjectResult(new
            {
                Success = false,
                Message = "Rate limit exceeded. Please try again later."
            })
            {
                StatusCode = 429
            };

            return;
        }

        _cache.Set(cacheKey, requestCount + 1, _window);

        await next();
    }
}
```

### Rate Limit Attribute for Configuration

Create an attribute to configure rate limits per action:

```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RateLimitAttribute : Attribute
{
    public int MaxRequests { get; }
    public int WindowSeconds { get; }

    public RateLimitAttribute(int maxRequests, int windowSeconds)
    {
        MaxRequests = maxRequests;
        WindowSeconds = windowSeconds;
    }
}
```

Updated filter that reads configuration from the attribute:

```csharp
public class ConfigurableRateLimitFilter : IAsyncActionFilter
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<ConfigurableRateLimitFilter> _logger;

    public ConfigurableRateLimitFilter(
        IMemoryCache cache,
        ILogger<ConfigurableRateLimitFilter> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        // Get rate limit settings from attribute
        var rateLimitAttribute = context.ActionDescriptor.EndpointMetadata
            .OfType<RateLimitAttribute>()
            .FirstOrDefault();

        // Use defaults if no attribute found
        var maxRequests = rateLimitAttribute?.MaxRequests ?? 100;
        var windowSeconds = rateLimitAttribute?.WindowSeconds ?? 60;
        var window = TimeSpan.FromSeconds(windowSeconds);

        var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
        var endpoint = context.HttpContext.Request.Path.ToString();
        var cacheKey = $"rate_limit:{ipAddress}:{endpoint}";

        var requestCount = _cache.GetOrCreate(cacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = window;
            return 0;
        });

        if (requestCount >= maxRequests)
        {
            context.Result = new ObjectResult(new
            {
                Success = false,
                Message = $"Rate limit of {maxRequests} requests per {windowSeconds} seconds exceeded."
            })
            {
                StatusCode = 429
            };

            return;
        }

        _cache.Set(cacheKey, requestCount + 1, window);

        await next();
    }
}
```

Usage:

```csharp
[ApiController]
[Route("api/[controller]")]
[ServiceFilter(typeof(ConfigurableRateLimitFilter))]
public class OrdersController : ControllerBase
{
    // 10 requests per minute for expensive operations
    [HttpPost]
    [RateLimit(maxRequests: 10, windowSeconds: 60)]
    public IActionResult Create([FromBody] CreateOrderRequest request)
    {
        return Ok(new { OrderId = Guid.NewGuid() });
    }

    // 100 requests per minute for read operations
    [HttpGet("{id}")]
    [RateLimit(maxRequests: 100, windowSeconds: 60)]
    public IActionResult Get(int id)
    {
        return Ok(new { Id = id, Status = "Processing" });
    }
}
```

## Practical Example: Response Caching Filter

Build a filter that caches action results:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

public class ResponseCacheFilter : IAsyncActionFilter
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<ResponseCacheFilter> _logger;
    private readonly TimeSpan _cacheDuration;

    public ResponseCacheFilter(
        IMemoryCache cache,
        ILogger<ResponseCacheFilter> logger,
        int cacheDurationSeconds = 300)
    {
        _cache = cache;
        _logger = logger;
        _cacheDuration = TimeSpan.FromSeconds(cacheDurationSeconds);
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        // Only cache GET requests
        if (!HttpMethods.IsGet(context.HttpContext.Request.Method))
        {
            await next();
            return;
        }

        var cacheKey = GenerateCacheKey(context);

        // Try to get cached response
        if (_cache.TryGetValue(cacheKey, out CachedResponse? cachedResponse)
            && cachedResponse != null)
        {
            _logger.LogDebug("Cache hit for key {CacheKey}", cacheKey);

            context.Result = new ContentResult
            {
                Content = cachedResponse.Content,
                ContentType = cachedResponse.ContentType,
                StatusCode = cachedResponse.StatusCode
            };

            return;
        }

        _logger.LogDebug("Cache miss for key {CacheKey}", cacheKey);

        // Execute the action
        var resultContext = await next();

        // Cache successful responses
        if (resultContext.Exception == null && resultContext.Result is ObjectResult objectResult)
        {
            var content = JsonSerializer.Serialize(objectResult.Value);

            var responseToCache = new CachedResponse
            {
                Content = content,
                ContentType = "application/json",
                StatusCode = objectResult.StatusCode ?? 200
            };

            _cache.Set(cacheKey, responseToCache, _cacheDuration);

            _logger.LogDebug(
                "Cached response for key {CacheKey} with duration {Duration}",
                cacheKey,
                _cacheDuration);
        }
    }

    private static string GenerateCacheKey(ActionExecutingContext context)
    {
        var request = context.HttpContext.Request;
        var keyParts = new List<string>
        {
            request.Path.ToString().ToLowerInvariant()
        };

        // Include query string parameters in cache key
        foreach (var query in request.Query.OrderBy(q => q.Key))
        {
            keyParts.Add($"{query.Key}={query.Value}");
        }

        return string.Join(":", keyParts);
    }
}

public class CachedResponse
{
    public string Content { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int StatusCode { get; set; }
}
```

## Dependency Injection in Filters

ASP.NET Core offers several ways to inject dependencies into filters.

### ServiceFilterAttribute

Use `ServiceFilter` when your filter has constructor dependencies:

```csharp
// Register the filter
builder.Services.AddScoped<ExecutionTimeFilter>();

// Apply using ServiceFilter
[ServiceFilter(typeof(ExecutionTimeFilter))]
public class ProductsController : ControllerBase
{
    // ...
}
```

### TypeFilterAttribute

Use `TypeFilter` when you need to pass additional arguments:

```csharp
public class CustomCacheFilter : IAsyncActionFilter
{
    private readonly IMemoryCache _cache;
    private readonly int _durationSeconds;

    public CustomCacheFilter(IMemoryCache cache, int durationSeconds)
    {
        _cache = cache;
        _durationSeconds = durationSeconds;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        // Implementation
        await next();
    }
}

// Apply with custom duration
[TypeFilter(typeof(CustomCacheFilter), Arguments = new object[] { 600 })]
public IActionResult GetProducts()
{
    return Ok(new[] { "Product1", "Product2" });
}
```

### IFilterFactory

Implement `IFilterFactory` for complete control over filter creation:

```csharp
public class CustomFilterAttribute : Attribute, IFilterFactory
{
    public bool IsReusable => false;
    public string ConfigValue { get; set; } = string.Empty;

    public IFilterMetadata CreateInstance(IServiceProvider serviceProvider)
    {
        var logger = serviceProvider.GetRequiredService<ILogger<CustomFilter>>();
        return new CustomFilter(logger, ConfigValue);
    }
}

public class CustomFilter : IActionFilter
{
    private readonly ILogger<CustomFilter> _logger;
    private readonly string _configValue;

    public CustomFilter(ILogger<CustomFilter> logger, string configValue)
    {
        _logger = logger;
        _configValue = configValue;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        _logger.LogInformation("Custom filter with config: {Config}", _configValue);
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}

// Usage
[CustomFilter(ConfigValue = "MyConfiguration")]
public IActionResult Index()
{
    return Ok();
}
```

## Filter Ordering

Filters run in a specific order. You can control this with the `Order` property.

### Default Filter Order

Filters execute in this sequence:

1. Authorization filters
2. Resource filters (OnResourceExecuting)
3. Model binding
4. Action filters (OnActionExecuting)
5. Action method
6. Action filters (OnActionExecuted)
7. Result filters (OnResultExecuting)
8. Result execution
9. Result filters (OnResultExecuted)
10. Resource filters (OnResourceExecuted)

### Setting Filter Order

Implement `IOrderedFilter` to control execution order:

```csharp
public class FirstFilter : IActionFilter, IOrderedFilter
{
    // Lower values run first
    public int Order => 1;

    public void OnActionExecuting(ActionExecutingContext context)
    {
        Console.WriteLine("FirstFilter - OnActionExecuting");
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        Console.WriteLine("FirstFilter - OnActionExecuted");
    }
}

public class SecondFilter : IActionFilter, IOrderedFilter
{
    public int Order => 2;

    public void OnActionExecuting(ActionExecutingContext context)
    {
        Console.WriteLine("SecondFilter - OnActionExecuting");
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        Console.WriteLine("SecondFilter - OnActionExecuted");
    }
}
```

Output when both filters are applied:

```
FirstFilter - OnActionExecuting
SecondFilter - OnActionExecuting
[Action executes]
SecondFilter - OnActionExecuted
FirstFilter - OnActionExecuted
```

### Order with Attributes

Configure order when applying filters:

```csharp
[ServiceFilter(typeof(LoggingFilter), Order = 1)]
[ServiceFilter(typeof(ValidationFilter), Order = 2)]
[ServiceFilter(typeof(CachingFilter), Order = 3)]
public class ProductsController : ControllerBase
{
    // ...
}
```

## Global vs Controller vs Action Filters

Filters can be applied at three scopes:

| Scope | Registration | Use Case |
|-------|--------------|----------|
| Global | `options.Filters.Add<T>()` | Logging, error handling |
| Controller | `[ServiceFilter]` on controller | Controller-specific validation |
| Action | `[ServiceFilter]` on action | Action-specific caching |

### Scope Example

```csharp
// Global filter in Program.cs
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalLoggingFilter>();
});

// Controller-level filter
[ServiceFilter(typeof(ControllerValidationFilter))]
public class UsersController : ControllerBase
{
    // Action-level filter
    [ServiceFilter(typeof(ActionCacheFilter))]
    public IActionResult GetUser(int id)
    {
        return Ok(new { Id = id });
    }
}
```

## Using ActionFilterAttribute

For simpler filters, inherit from `ActionFilterAttribute`:

```csharp
public class LogActionAttribute : ActionFilterAttribute
{
    private readonly string _actionName;

    public LogActionAttribute(string actionName)
    {
        _actionName = actionName;
    }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILogger<LogActionAttribute>>();

        logger.LogInformation("Executing action: {ActionName}", _actionName);

        base.OnActionExecuting(context);
    }

    public override void OnActionExecuted(ActionExecutedContext context)
    {
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILogger<LogActionAttribute>>();

        logger.LogInformation("Executed action: {ActionName}", _actionName);

        base.OnActionExecuted(context);
    }
}

// Usage
[LogAction("CreateOrder")]
public IActionResult Create([FromBody] OrderRequest request)
{
    return Ok();
}
```

## Exception Handling in Action Filters

Handle exceptions within action filters:

```csharp
public class ExceptionHandlingFilter : IAsyncActionFilter
{
    private readonly ILogger<ExceptionHandlingFilter> _logger;

    public ExceptionHandlingFilter(ILogger<ExceptionHandlingFilter> logger)
    {
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var resultContext = await next();

        if (resultContext.Exception != null && !resultContext.ExceptionHandled)
        {
            _logger.LogError(
                resultContext.Exception,
                "Unhandled exception in action {Action}",
                context.ActionDescriptor.DisplayName);

            // Mark exception as handled
            resultContext.ExceptionHandled = true;

            // Return error response
            resultContext.Result = new ObjectResult(new
            {
                Success = false,
                Message = "An unexpected error occurred",
                TraceId = context.HttpContext.TraceIdentifier
            })
            {
                StatusCode = 500
            };
        }
    }
}
```

## Testing Action Filters

Unit test your filters by mocking the context:

```csharp
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Moq;
using Xunit;

public class ValidateModelStateFilterTests
{
    [Fact]
    public void OnActionExecuting_InvalidModelState_ReturnsBadRequest()
    {
        // Arrange
        var filter = new ValidateModelStateFilter();

        var httpContext = new DefaultHttpContext();
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor());

        var context = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new Mock<Controller>().Object);

        // Add model state error
        context.ModelState.AddModelError("Name", "Name is required");

        // Act
        filter.OnActionExecuting(context);

        // Assert
        Assert.NotNull(context.Result);
        Assert.IsType<BadRequestObjectResult>(context.Result);
    }

    [Fact]
    public void OnActionExecuting_ValidModelState_DoesNotSetResult()
    {
        // Arrange
        var filter = new ValidateModelStateFilter();

        var httpContext = new DefaultHttpContext();
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor());

        var context = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new Mock<Controller>().Object);

        // Act
        filter.OnActionExecuting(context);

        // Assert
        Assert.Null(context.Result);
    }
}
```

## Summary

Action filters provide a clean way to implement cross-cutting concerns in ASP.NET Core. Key takeaways:

- Use `IActionFilter` for synchronous filters and `IAsyncActionFilter` for async operations
- Short-circuit requests by setting `context.Result` in `OnActionExecuting`
- Use `ServiceFilter` for filters with dependencies and `TypeFilter` for custom arguments
- Control execution order with `IOrderedFilter`
- Apply filters at global, controller, or action scope based on requirements
- Test filters by mocking `ActionExecutingContext` and `ActionExecutedContext`

Build your filters to be focused and reusable. Each filter should handle one concern, whether that is logging, validation, caching, or rate limiting. This approach keeps your controllers clean and your cross-cutting logic maintainable.
