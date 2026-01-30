# How to Implement Custom Result Types in ASP.NET

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CSharp, ASP.NET, Web API, Architecture

Description: Create custom action result types in ASP.NET Core for consistent API responses, problem details, and specialized content negotiation.

---

## Introduction

ASP.NET Core provides several built-in result types like `OkResult`, `NotFoundResult`, and `JsonResult`. However, real-world APIs often need custom response formats, standardized error handling, and specialized content negotiation. This post walks through implementing custom result types that give you full control over API responses.

## Understanding IActionResult

The `IActionResult` interface is the foundation for all action results in ASP.NET Core. It defines a single method that executes the result operation.

Here is the basic interface definition:

```csharp
public interface IActionResult
{
    Task ExecuteResultAsync(ActionContext context);
}
```

When your controller action returns an `IActionResult`, the MVC framework calls `ExecuteResultAsync` to write the response. This gives you complete control over status codes, headers, and response body content.

## Building a Basic Custom Result

Let's start with a simple custom result that returns a standardized success response.

This result wraps data in a consistent envelope format with metadata:

```csharp
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

public class ApiSuccessResult<T> : IActionResult
{
    private readonly T _data;
    private readonly string _message;
    private readonly int _statusCode;

    public ApiSuccessResult(T data, string message = "Success", int statusCode = 200)
    {
        _data = data;
        _message = message;
        _statusCode = statusCode;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var response = context.HttpContext.Response;
        response.StatusCode = _statusCode;
        response.ContentType = "application/json";

        var envelope = new
        {
            success = true,
            message = _message,
            data = _data,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        await response.WriteAsync(json);
    }
}
```

Usage in a controller is straightforward:

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult GetProduct(int id)
    {
        var product = new { Id = id, Name = "Widget", Price = 29.99 };
        return new ApiSuccessResult<object>(product, "Product retrieved");
    }
}
```

## Extending ObjectResult for Better Integration

The `ObjectResult` class provides built-in support for content negotiation and formatters. Extending it gives you these features while adding custom behavior.

This custom result handles paginated collections with metadata:

```csharp
using Microsoft.AspNetCore.Mvc;

public class PaginatedResult<T> : ObjectResult
{
    public PaginatedResult(
        IEnumerable<T> items,
        int page,
        int pageSize,
        int totalCount) : base(null)
    {
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        // Set the response envelope as the value
        Value = new PaginatedResponse<T>
        {
            Items = items.ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            HasNextPage = page < totalPages,
            HasPreviousPage = page > 1
        };

        StatusCode = 200;
    }
}

public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
}
```

The controller uses it like any other result:

```csharp
[HttpGet]
public IActionResult GetProducts([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
{
    var allProducts = GetAllProducts(); // Your data source
    var totalCount = allProducts.Count();

    var items = allProducts
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToList();

    return new PaginatedResult<Product>(items, page, pageSize, totalCount);
}
```

## Implementing Problem Details (RFC 7807)

RFC 7807 defines a standard format for HTTP API error responses. ASP.NET Core has built-in support, but custom implementations offer more flexibility.

Here is a comparison of standard vs custom problem details:

| Feature | Built-in ProblemDetails | Custom Implementation |
|---------|------------------------|----------------------|
| RFC 7807 compliance | Yes | Yes |
| Custom extensions | Limited | Full control |
| Logging integration | Manual | Built-in |
| Correlation IDs | Manual | Automatic |
| Stack traces | Manual | Configurable |

This custom problem result adds logging and correlation tracking:

```csharp
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

public class ApiProblemResult : IActionResult
{
    private readonly ApiProblemDetails _problemDetails;
    private readonly ILogger? _logger;

    public ApiProblemResult(
        int statusCode,
        string title,
        string? detail = null,
        string? instance = null,
        IDictionary<string, object>? extensions = null,
        ILogger? logger = null)
    {
        _logger = logger;
        _problemDetails = new ApiProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = instance,
            Type = GetProblemTypeUri(statusCode),
            TraceId = Activity.Current?.Id ?? Guid.NewGuid().ToString(),
            Timestamp = DateTime.UtcNow
        };

        if (extensions != null)
        {
            foreach (var extension in extensions)
            {
                _problemDetails.Extensions[extension.Key] = extension.Value;
            }
        }
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        // Log the error with structured data
        _logger?.LogError(
            "API Error: {Title} - {Detail} (TraceId: {TraceId})",
            _problemDetails.Title,
            _problemDetails.Detail,
            _problemDetails.TraceId);

        var response = context.HttpContext.Response;
        response.StatusCode = _problemDetails.Status ?? 500;
        response.ContentType = "application/problem+json";

        var json = JsonSerializer.Serialize(_problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        await response.WriteAsync(json);
    }

    private static string GetProblemTypeUri(int statusCode) => statusCode switch
    {
        400 => "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        401 => "https://tools.ietf.org/html/rfc7235#section-3.1",
        403 => "https://tools.ietf.org/html/rfc7231#section-6.5.3",
        404 => "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        409 => "https://tools.ietf.org/html/rfc7231#section-6.5.8",
        422 => "https://tools.ietf.org/html/rfc4918#section-11.2",
        500 => "https://tools.ietf.org/html/rfc7231#section-6.6.1",
        _ => "https://tools.ietf.org/html/rfc7231#section-6"
    };
}

public class ApiProblemDetails
{
    public string? Type { get; set; }
    public string? Title { get; set; }
    public int? Status { get; set; }
    public string? Detail { get; set; }
    public string? Instance { get; set; }
    public string? TraceId { get; set; }
    public DateTime Timestamp { get; set; }
    public IDictionary<string, object> Extensions { get; set; } = new Dictionary<string, object>();
}
```

Create factory methods for common error scenarios:

```csharp
public static class ApiProblems
{
    public static ApiProblemResult NotFound(string resource, object id, ILogger? logger = null)
    {
        return new ApiProblemResult(
            404,
            "Resource Not Found",
            $"The {resource} with identifier '{id}' was not found.",
            logger: logger);
    }

    public static ApiProblemResult ValidationFailed(
        IDictionary<string, string[]> errors,
        ILogger? logger = null)
    {
        return new ApiProblemResult(
            400,
            "Validation Failed",
            "One or more validation errors occurred.",
            extensions: new Dictionary<string, object> { ["errors"] = errors },
            logger: logger);
    }

    public static ApiProblemResult Conflict(string message, ILogger? logger = null)
    {
        return new ApiProblemResult(
            409,
            "Conflict",
            message,
            logger: logger);
    }

    public static ApiProblemResult InternalError(Exception ex, bool includeDetails, ILogger? logger = null)
    {
        var extensions = includeDetails
            ? new Dictionary<string, object>
            {
                ["exceptionType"] = ex.GetType().Name,
                ["stackTrace"] = ex.StackTrace ?? string.Empty
            }
            : null;

        return new ApiProblemResult(
            500,
            "Internal Server Error",
            includeDetails ? ex.Message : "An unexpected error occurred.",
            extensions: extensions,
            logger: logger);
    }
}
```

## Custom Output Formatters

Output formatters handle content negotiation and serialization. Custom formatters support specialized media types.

This formatter outputs CSV for collection endpoints:

```csharp
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Net.Http.Headers;
using System.Reflection;
using System.Text;

public class CsvOutputFormatter : TextOutputFormatter
{
    public CsvOutputFormatter()
    {
        SupportedMediaTypes.Add(MediaTypeHeaderValue.Parse("text/csv"));
        SupportedEncodings.Add(Encoding.UTF8);
        SupportedEncodings.Add(Encoding.Unicode);
    }

    protected override bool CanWriteType(Type? type)
    {
        if (type == null) return false;

        // Support IEnumerable<T> types
        if (type.IsGenericType)
        {
            var genericType = type.GetGenericTypeDefinition();
            if (genericType == typeof(IEnumerable<>) ||
                genericType == typeof(List<>) ||
                genericType == typeof(IList<>))
            {
                return true;
            }
        }

        // Support arrays
        return type.IsArray;
    }

    public override async Task WriteResponseBodyAsync(
        OutputFormatterWriteContext context,
        Encoding selectedEncoding)
    {
        var response = context.HttpContext.Response;
        var buffer = new StringBuilder();

        var items = (context.Object as IEnumerable<object>)?.ToList();
        if (items == null || !items.Any())
        {
            await response.WriteAsync(string.Empty);
            return;
        }

        // Get properties from the first item
        var properties = items.First().GetType().GetProperties(
            BindingFlags.Public | BindingFlags.Instance);

        // Write header row
        buffer.AppendLine(string.Join(",", properties.Select(p => EscapeCsvValue(p.Name))));

        // Write data rows
        foreach (var item in items)
        {
            var values = properties.Select(p =>
            {
                var value = p.GetValue(item);
                return EscapeCsvValue(value?.ToString() ?? string.Empty);
            });
            buffer.AppendLine(string.Join(",", values));
        }

        await response.WriteAsync(buffer.ToString(), selectedEncoding);
    }

    private static string EscapeCsvValue(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
```

Register the formatter in Program.cs:

```csharp
builder.Services.AddControllers(options =>
{
    options.OutputFormatters.Add(new CsvOutputFormatter());
});
```

## Content Negotiation with Custom Results

Build a result type that handles multiple response formats based on the Accept header:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using System.Text.Json;
using System.Xml.Serialization;

public class NegotiatedResult<T> : IActionResult
{
    private readonly T _data;
    private readonly int _statusCode;

    public NegotiatedResult(T data, int statusCode = 200)
    {
        _data = data;
        _statusCode = statusCode;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var request = context.HttpContext.Request;
        var response = context.HttpContext.Response;
        response.StatusCode = _statusCode;

        var acceptHeader = request.Headers.Accept.FirstOrDefault() ?? "application/json";

        if (acceptHeader.Contains("application/xml"))
        {
            await WriteXmlResponse(response);
        }
        else if (acceptHeader.Contains("text/plain"))
        {
            await WritePlainTextResponse(response);
        }
        else
        {
            await WriteJsonResponse(response);
        }
    }

    private async Task WriteJsonResponse(HttpResponse response)
    {
        response.ContentType = "application/json";
        var json = JsonSerializer.Serialize(_data, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        await response.WriteAsync(json);
    }

    private async Task WriteXmlResponse(HttpResponse response)
    {
        response.ContentType = "application/xml";
        using var writer = new StringWriter();
        var serializer = new XmlSerializer(typeof(T));
        serializer.Serialize(writer, _data);
        await response.WriteAsync(writer.ToString());
    }

    private async Task WritePlainTextResponse(HttpResponse response)
    {
        response.ContentType = "text/plain";
        await response.WriteAsync(_data?.ToString() ?? string.Empty);
    }
}
```

## TypedResults in Minimal APIs

ASP.NET Core 7+ introduced `TypedResults` for minimal APIs, providing compile-time safety and better OpenAPI support.

Here is how different result approaches compare:

| Approach | Type Safety | OpenAPI Support | Flexibility |
|----------|-------------|-----------------|-------------|
| IResult | Runtime | Manual | High |
| Results<T1,T2> | Compile-time | Automatic | Medium |
| TypedResults | Compile-time | Automatic | High |
| Custom IResult | Compile-time | Manual | Highest |

Implement a custom typed result for minimal APIs:

```csharp
using Microsoft.AspNetCore.Http.HttpResults;
using System.Reflection;

// Custom result type implementing IResult
public class ApiResponse<T> : IResult, IStatusCodeHttpResult, IContentTypeHttpResult
{
    private readonly T? _data;
    private readonly string _message;

    public int? StatusCode { get; }
    public string? ContentType => "application/json";

    public ApiResponse(T? data, string message, int statusCode)
    {
        _data = data;
        _message = message;
        StatusCode = statusCode;
    }

    public async Task ExecuteAsync(HttpContext httpContext)
    {
        httpContext.Response.StatusCode = StatusCode ?? 200;
        httpContext.Response.ContentType = ContentType;

        var response = new
        {
            success = StatusCode >= 200 && StatusCode < 300,
            message = _message,
            data = _data
        };

        await httpContext.Response.WriteAsJsonAsync(response);
    }

    // Factory methods for common responses
    public static ApiResponse<T> Success(T data, string message = "Success")
        => new(data, message, 200);

    public static ApiResponse<T> Created(T data, string message = "Created")
        => new(data, message, 201);

    public static ApiResponse<T> NotFound(string message = "Not found")
        => new(default, message, 404);
}
```

Use the custom result in minimal API endpoints:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/api/products/{id}", (int id, ProductService service) =>
{
    var product = service.GetById(id);

    if (product == null)
    {
        return ApiResponse<Product>.NotFound($"Product {id} not found");
    }

    return ApiResponse<Product>.Success(product);
});

app.MapPost("/api/products", (Product product, ProductService service) =>
{
    var created = service.Create(product);
    return ApiResponse<Product>.Created(created, "Product created successfully");
});

app.Run();
```

## Combining Results with Union Types

Use the `Results<T1, T2>` type for endpoints that return different result types:

```csharp
using Microsoft.AspNetCore.Http.HttpResults;

app.MapGet("/api/orders/{id}", async (
    int id,
    OrderService service) =>
{
    var order = await service.GetByIdAsync(id);

    if (order == null)
    {
        return Results.NotFound(new ProblemDetails
        {
            Title = "Order Not Found",
            Detail = $"Order with ID {id} does not exist",
            Status = 404
        });
    }

    if (order.Status == OrderStatus.Cancelled)
    {
        return Results.BadRequest(new ProblemDetails
        {
            Title = "Order Cancelled",
            Detail = "This order has been cancelled and cannot be accessed",
            Status = 400
        });
    }

    return Results.Ok(order);
});
```

For better type safety, define explicit return types:

```csharp
app.MapGet("/api/orders/{id}",
    async Task<Results<Ok<Order>, NotFound<ProblemDetails>, BadRequest<ProblemDetails>>> (
        int id,
        OrderService service) =>
{
    var order = await service.GetByIdAsync(id);

    if (order == null)
    {
        return TypedResults.NotFound(new ProblemDetails
        {
            Title = "Order Not Found",
            Status = 404
        });
    }

    if (order.Status == OrderStatus.Cancelled)
    {
        return TypedResults.BadRequest(new ProblemDetails
        {
            Title = "Order Cancelled",
            Status = 400
        });
    }

    return TypedResults.Ok(order);
});
```

## Building a Result Factory Service

Create a centralized service for consistent result creation across your API:

```csharp
public interface IApiResultFactory
{
    IActionResult Success<T>(T data, string? message = null);
    IActionResult Created<T>(T data, string location);
    IActionResult NoContent();
    IActionResult NotFound(string resource, object id);
    IActionResult BadRequest(string message, IDictionary<string, string[]>? errors = null);
    IActionResult Conflict(string message);
    IActionResult Error(Exception ex);
}

public class ApiResultFactory : IApiResultFactory
{
    private readonly ILogger<ApiResultFactory> _logger;
    private readonly IWebHostEnvironment _environment;

    public ApiResultFactory(
        ILogger<ApiResultFactory> logger,
        IWebHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public IActionResult Success<T>(T data, string? message = null)
    {
        return new ApiSuccessResult<T>(data, message ?? "Success");
    }

    public IActionResult Created<T>(T data, string location)
    {
        var result = new ApiSuccessResult<T>(data, "Created", 201);
        return result;
    }

    public IActionResult NoContent()
    {
        return new NoContentResult();
    }

    public IActionResult NotFound(string resource, object id)
    {
        return ApiProblems.NotFound(resource, id, _logger);
    }

    public IActionResult BadRequest(string message, IDictionary<string, string[]>? errors = null)
    {
        if (errors != null)
        {
            return ApiProblems.ValidationFailed(errors, _logger);
        }

        return new ApiProblemResult(400, "Bad Request", message, logger: _logger);
    }

    public IActionResult Conflict(string message)
    {
        return ApiProblems.Conflict(message, _logger);
    }

    public IActionResult Error(Exception ex)
    {
        var includeDetails = _environment.IsDevelopment();
        return ApiProblems.InternalError(ex, includeDetails, _logger);
    }
}
```

Register and use the factory:

```csharp
// In Program.cs
builder.Services.AddScoped<IApiResultFactory, ApiResultFactory>();

// In a controller
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IApiResultFactory _results;

    public OrdersController(IOrderService orderService, IApiResultFactory results)
    {
        _orderService = orderService;
        _results = results;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(int id)
    {
        try
        {
            var order = await _orderService.GetByIdAsync(id);

            if (order == null)
            {
                return _results.NotFound("Order", id);
            }

            return _results.Success(order);
        }
        catch (Exception ex)
        {
            return _results.Error(ex);
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    x => x.Key,
                    x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

            return _results.BadRequest("Validation failed", errors);
        }

        try
        {
            var order = await _orderService.CreateAsync(request);
            return _results.Created(order, $"/api/orders/{order.Id}");
        }
        catch (DuplicateOrderException ex)
        {
            return _results.Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            return _results.Error(ex);
        }
    }
}
```

## Adding Response Caching to Custom Results

Extend custom results to include caching headers:

```csharp
public class CachedApiResult<T> : IActionResult
{
    private readonly T _data;
    private readonly TimeSpan _cacheDuration;
    private readonly string? _etag;

    public CachedApiResult(T data, TimeSpan cacheDuration, string? etag = null)
    {
        _data = data;
        _cacheDuration = cacheDuration;
        _etag = etag ?? GenerateEtag(data);
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var request = context.HttpContext.Request;
        var response = context.HttpContext.Response;

        // Check If-None-Match header for conditional requests
        var ifNoneMatch = request.Headers.IfNoneMatch.FirstOrDefault();
        if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch == _etag)
        {
            response.StatusCode = 304; // Not Modified
            return;
        }

        // Set caching headers
        response.Headers.CacheControl = $"public, max-age={(int)_cacheDuration.TotalSeconds}";
        response.Headers.ETag = _etag;
        response.Headers.Vary = "Accept, Accept-Encoding";

        response.StatusCode = 200;
        response.ContentType = "application/json";

        var envelope = new
        {
            data = _data,
            cached = true,
            expiresAt = DateTime.UtcNow.Add(_cacheDuration)
        };

        await response.WriteAsJsonAsync(envelope);
    }

    private static string GenerateEtag(T data)
    {
        var json = JsonSerializer.Serialize(data);
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        var hash = System.Security.Cryptography.SHA256.HashData(bytes);
        return $"\"{Convert.ToBase64String(hash)[..16]}\"";
    }
}
```

## File Download Results

Create a result type for file downloads with proper headers:

```csharp
public class FileDownloadResult : IActionResult
{
    private readonly byte[] _fileContents;
    private readonly string _fileName;
    private readonly string _contentType;
    private readonly bool _inline;

    public FileDownloadResult(
        byte[] fileContents,
        string fileName,
        string contentType = "application/octet-stream",
        bool inline = false)
    {
        _fileContents = fileContents;
        _fileName = fileName;
        _contentType = contentType;
        _inline = inline;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var response = context.HttpContext.Response;

        response.StatusCode = 200;
        response.ContentType = _contentType;
        response.ContentLength = _fileContents.Length;

        var disposition = _inline ? "inline" : "attachment";
        response.Headers.ContentDisposition = $"{disposition}; filename=\"{_fileName}\"";

        await response.Body.WriteAsync(_fileContents);
    }

    // Factory method for common file types
    public static FileDownloadResult Pdf(byte[] content, string fileName)
        => new(content, fileName, "application/pdf");

    public static FileDownloadResult Excel(byte[] content, string fileName)
        => new(content, fileName,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    public static FileDownloadResult Csv(string content, string fileName)
        => new(System.Text.Encoding.UTF8.GetBytes(content), fileName, "text/csv");
}
```

## Testing Custom Results

Write unit tests for custom result types:

```csharp
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Xunit;

public class ApiSuccessResultTests
{
    [Fact]
    public async Task ExecuteResultAsync_SetsCorrectStatusCode()
    {
        // Arrange
        var data = new { Id = 1, Name = "Test" };
        var result = new ApiSuccessResult<object>(data, "Success", 200);
        var context = CreateActionContext();

        // Act
        await result.ExecuteResultAsync(context);

        // Assert
        Assert.Equal(200, context.HttpContext.Response.StatusCode);
    }

    [Fact]
    public async Task ExecuteResultAsync_WritesJsonResponse()
    {
        // Arrange
        var data = new { Id = 1, Name = "Test" };
        var result = new ApiSuccessResult<object>(data);
        var context = CreateActionContext();

        // Act
        await result.ExecuteResultAsync(context);

        // Assert
        context.HttpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.HttpContext.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        Assert.Contains("\"success\":true", responseBody);
        Assert.Contains("\"data\":", responseBody);
    }

    private static ActionContext CreateActionContext()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        return new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor());
    }
}
```

## Summary

Custom result types in ASP.NET Core provide several benefits:

1. **Consistency** - Standardized response formats across all endpoints
2. **Separation of concerns** - Response formatting logic stays out of controllers
3. **Testability** - Results can be unit tested independently
4. **Flexibility** - Full control over headers, status codes, and content
5. **Type safety** - TypedResults in minimal APIs provide compile-time checking

Start with simple `IActionResult` implementations for basic needs, then progress to `ObjectResult` extensions when you need content negotiation. Use the factory pattern to centralize result creation and maintain consistency. For minimal APIs, prefer `TypedResults` with union types for the best developer experience and OpenAPI documentation.

The code examples in this post provide a foundation you can adapt to your specific requirements. Consider packaging your custom results into a shared library if you maintain multiple APIs that need consistent response handling.
