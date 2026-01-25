# How to Create Custom Model Binders in ASP.NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ASP.NET Core, C#, Model Binding, Web API, MVC, Request Handling, .NET

Description: Learn how to create custom model binders in ASP.NET Core to handle complex request data, parse custom formats, and validate input with practical examples.

---

Model binding in ASP.NET Core converts HTTP request data into action method parameters. While the built-in binders handle most cases, custom model binders let you parse specialized formats, combine data from multiple sources, or add validation logic during binding.

## When to Use Custom Model Binders

The default model binding works well for simple types and JSON payloads. You need custom binders when dealing with:

- Comma-separated values in query strings
- Custom date or number formats
- Encrypted or encoded parameters
- Data that needs to be fetched from a database during binding
- Complex types from headers or other sources

## Basic Model Binder Structure

A model binder implements `IModelBinder` and receives a `ModelBindingContext` containing all request information.

```csharp
// Binders/DateRangeModelBinder.cs
using Microsoft.AspNetCore.Mvc.ModelBinding;

public class DateRangeModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        // Always check for null context
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        // Get the model name from the context
        var modelName = bindingContext.ModelName;

        // Try to get the value from the value provider
        var valueProviderResult = bindingContext.ValueProvider
            .GetValue(modelName);

        if (valueProviderResult == ValueProviderResult.None)
        {
            return Task.CompletedTask;
        }

        // Set the model state value for validation
        bindingContext.ModelState.SetModelValue(
            modelName, valueProviderResult);

        var value = valueProviderResult.FirstValue;

        if (string.IsNullOrEmpty(value))
        {
            return Task.CompletedTask;
        }

        // Parse the custom format: "2024-01-01..2024-12-31"
        var parts = value.Split("..", StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length != 2)
        {
            bindingContext.ModelState.AddModelError(
                modelName, "Invalid date range format. Use: start..end");
            return Task.CompletedTask;
        }

        if (!DateTime.TryParse(parts[0], out var start) ||
            !DateTime.TryParse(parts[1], out var end))
        {
            bindingContext.ModelState.AddModelError(
                modelName, "Invalid date format in range");
            return Task.CompletedTask;
        }

        if (start > end)
        {
            bindingContext.ModelState.AddModelError(
                modelName, "Start date must be before end date");
            return Task.CompletedTask;
        }

        var dateRange = new DateRange { Start = start, End = end };

        bindingContext.Result = ModelBindingResult.Success(dateRange);
        return Task.CompletedTask;
    }
}

public class DateRange
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
}
```

## Registering the Model Binder

There are several ways to register a custom model binder.

### Using an Attribute

```csharp
// Attributes/DateRangeBinderAttribute.cs
[AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property)]
public class DateRangeBinderAttribute : Attribute, IModelNameProvider
{
    public string? Name { get; set; }
}

// Usage in controller
[HttpGet("orders")]
public IActionResult GetOrders(
    [ModelBinder(BinderType = typeof(DateRangeModelBinder))]
    DateRange dateRange)
{
    return Ok(new { dateRange.Start, dateRange.End });
}
```

### Using a Provider

```csharp
// Binders/DateRangeModelBinderProvider.cs
public class DateRangeModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context));
        }

        // Check if the model type is DateRange
        if (context.Metadata.ModelType == typeof(DateRange))
        {
            return new BinderTypeModelBinder(typeof(DateRangeModelBinder));
        }

        return null;
    }
}

// Program.cs - Register the provider
builder.Services.AddControllers(options =>
{
    // Insert at the beginning to take priority
    options.ModelBinderProviders.Insert(0, new DateRangeModelBinderProvider());
});
```

## Comma-Separated List Binder

A common need is parsing comma-separated values from query strings into collections.

```csharp
// Binders/CommaSeparatedModelBinder.cs
public class CommaSeparatedModelBinder<T> : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        var modelName = bindingContext.ModelName;
        var valueProviderResult = bindingContext.ValueProvider.GetValue(modelName);

        if (valueProviderResult == ValueProviderResult.None)
        {
            return Task.CompletedTask;
        }

        bindingContext.ModelState.SetModelValue(modelName, valueProviderResult);

        var value = valueProviderResult.FirstValue;

        if (string.IsNullOrEmpty(value))
        {
            bindingContext.Result = ModelBindingResult.Success(new List<T>());
            return Task.CompletedTask;
        }

        // Split by comma and parse each value
        var items = value
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .ToList();

        var converter = TypeDescriptor.GetConverter(typeof(T));
        var result = new List<T>();

        foreach (var item in items)
        {
            try
            {
                var converted = (T)converter.ConvertFromString(item)!;
                result.Add(converted);
            }
            catch (Exception)
            {
                bindingContext.ModelState.AddModelError(
                    modelName, $"Cannot convert '{item}' to {typeof(T).Name}");
            }
        }

        bindingContext.Result = ModelBindingResult.Success(result);
        return Task.CompletedTask;
    }
}

// Usage
[HttpGet("products")]
public IActionResult GetProducts(
    [ModelBinder(BinderType = typeof(CommaSeparatedModelBinder<int>))]
    List<int> ids,
    [ModelBinder(BinderType = typeof(CommaSeparatedModelBinder<string>))]
    List<string> tags)
{
    // GET /products?ids=1,2,3&tags=electronics,sale
    return Ok(new { ids, tags });
}
```

## Header-Based Model Binder

Bind model properties from HTTP headers, useful for API versioning or tenant identification.

```csharp
// Binders/RequestContextModelBinder.cs
public class RequestContextModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        var httpContext = bindingContext.HttpContext;
        var headers = httpContext.Request.Headers;

        var context = new RequestContext
        {
            // Get values from headers with fallbacks
            TenantId = headers.TryGetValue("X-Tenant-Id", out var tenantId)
                ? tenantId.ToString()
                : null,

            ApiVersion = headers.TryGetValue("X-Api-Version", out var version)
                ? version.ToString()
                : "1.0",

            CorrelationId = headers.TryGetValue("X-Correlation-Id", out var correlationId)
                ? correlationId.ToString()
                : Guid.NewGuid().ToString(),

            UserId = httpContext.User.Identity?.Name,

            ClientIp = httpContext.Connection.RemoteIpAddress?.ToString()
        };

        // Validate required fields
        if (string.IsNullOrEmpty(context.TenantId))
        {
            bindingContext.ModelState.AddModelError(
                "X-Tenant-Id", "Tenant ID header is required");
            return Task.CompletedTask;
        }

        bindingContext.Result = ModelBindingResult.Success(context);
        return Task.CompletedTask;
    }
}

public class RequestContext
{
    public string? TenantId { get; set; }
    public string ApiVersion { get; set; } = "1.0";
    public string CorrelationId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? ClientIp { get; set; }
}

// Usage
[HttpGet("data")]
public IActionResult GetData(
    [ModelBinder(BinderType = typeof(RequestContextModelBinder))]
    RequestContext context)
{
    return Ok(new
    {
        context.TenantId,
        context.ApiVersion,
        context.CorrelationId
    });
}
```

## Encrypted Parameter Binder

Decrypt parameters that were encrypted on the client side.

```csharp
// Binders/EncryptedModelBinder.cs
public class EncryptedModelBinder<T> : IModelBinder
{
    private readonly IEncryptionService _encryption;

    public EncryptedModelBinder(IEncryptionService encryption)
    {
        _encryption = encryption;
    }

    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        var modelName = bindingContext.ModelName;
        var valueProviderResult = bindingContext.ValueProvider.GetValue(modelName);

        if (valueProviderResult == ValueProviderResult.None)
        {
            return Task.CompletedTask;
        }

        var encryptedValue = valueProviderResult.FirstValue;

        if (string.IsNullOrEmpty(encryptedValue))
        {
            return Task.CompletedTask;
        }

        try
        {
            // Decrypt and deserialize
            var decrypted = _encryption.Decrypt(encryptedValue);
            var model = JsonSerializer.Deserialize<T>(decrypted);

            bindingContext.Result = ModelBindingResult.Success(model);
        }
        catch (CryptographicException)
        {
            bindingContext.ModelState.AddModelError(
                modelName, "Invalid encrypted value");
        }
        catch (JsonException)
        {
            bindingContext.ModelState.AddModelError(
                modelName, "Invalid data format");
        }

        return Task.CompletedTask;
    }
}

// Create a binder that gets encryption service from DI
public class EncryptedModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context));
        }

        // Check for [Encrypted] attribute on the parameter
        var metadata = context.Metadata;
        if (metadata.ContainerType != null)
        {
            var propertyInfo = metadata.ContainerType
                .GetProperty(metadata.PropertyName ?? "");

            if (propertyInfo?.GetCustomAttribute<EncryptedAttribute>() != null)
            {
                var binderType = typeof(EncryptedModelBinder<>)
                    .MakeGenericType(metadata.ModelType);
                return new BinderTypeModelBinder(binderType);
            }
        }

        return null;
    }
}

[AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property)]
public class EncryptedAttribute : Attribute { }
```

## Database Lookup Binder

Fetch an entity from the database during model binding instead of accepting raw IDs.

```csharp
// Binders/EntityModelBinder.cs
public class EntityModelBinder<TEntity, TKey> : IModelBinder
    where TEntity : class
{
    private readonly IServiceProvider _serviceProvider;

    public EntityModelBinder(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        var modelName = bindingContext.ModelName;
        var valueProviderResult = bindingContext.ValueProvider.GetValue(modelName);

        if (valueProviderResult == ValueProviderResult.None)
        {
            return;
        }

        var value = valueProviderResult.FirstValue;

        if (string.IsNullOrEmpty(value))
        {
            return;
        }

        // Parse the key value
        TKey key;
        try
        {
            var converter = TypeDescriptor.GetConverter(typeof(TKey));
            key = (TKey)converter.ConvertFromString(value)!;
        }
        catch
        {
            bindingContext.ModelState.AddModelError(
                modelName, $"Invalid {typeof(TEntity).Name} ID");
            return;
        }

        // Get the DbContext from DI and find the entity
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var entity = await dbContext.Set<TEntity>().FindAsync(key);

        if (entity == null)
        {
            bindingContext.ModelState.AddModelError(
                modelName, $"{typeof(TEntity).Name} not found");
            return;
        }

        bindingContext.Result = ModelBindingResult.Success(entity);
    }
}

// Provider to create the generic binder
public class EntityModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context));
        }

        // Check if type has [FromEntity] attribute
        var metadata = context.Metadata;
        var fromEntityAttr = metadata.ModelType
            .GetCustomAttribute<FromEntityAttribute>();

        if (fromEntityAttr != null)
        {
            var binderType = typeof(EntityModelBinder<,>)
                .MakeGenericType(metadata.ModelType, fromEntityAttr.KeyType);
            return new BinderTypeModelBinder(binderType);
        }

        return null;
    }
}

[AttributeUsage(AttributeTargets.Class)]
public class FromEntityAttribute : Attribute
{
    public Type KeyType { get; }

    public FromEntityAttribute(Type keyType)
    {
        KeyType = keyType;
    }
}

// Usage
[FromEntity(typeof(int))]
public class Order
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal Total { get; set; }
}

[HttpGet("orders/{order}")]
public IActionResult GetOrder(Order order)
{
    // Order is fetched from database by ID automatically
    return Ok(order);
}
```

## Composite Binder

Combine data from multiple sources into a single model.

```csharp
// Binders/CompositeSearchModelBinder.cs
public class CompositeSearchModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        var request = bindingContext.HttpContext.Request;
        var query = request.Query;
        var headers = request.Headers;

        var searchModel = new SearchRequest
        {
            // From query string
            Query = query.TryGetValue("q", out var q)
                ? q.ToString()
                : null,

            Page = query.TryGetValue("page", out var page)
                && int.TryParse(page, out var pageNum)
                ? pageNum
                : 1,

            PageSize = query.TryGetValue("pageSize", out var size)
                && int.TryParse(size, out var sizeNum)
                ? Math.Min(sizeNum, 100)  // Cap at 100
                : 20,

            // From headers
            AcceptLanguage = headers.TryGetValue("Accept-Language", out var lang)
                ? lang.ToString().Split(',').FirstOrDefault()
                : "en",

            // Sort parameters
            SortBy = query.TryGetValue("sortBy", out var sortBy)
                ? sortBy.ToString()
                : null,

            SortDescending = query.TryGetValue("sortDesc", out var sortDesc)
                && bool.TryParse(sortDesc, out var desc)
                && desc
        };

        // Parse filters from query string: filter[field]=value
        foreach (var key in query.Keys)
        {
            if (key.StartsWith("filter[") && key.EndsWith("]"))
            {
                var fieldName = key[7..^1];
                searchModel.Filters[fieldName] = query[key].ToString();
            }
        }

        bindingContext.Result = ModelBindingResult.Success(searchModel);
        return Task.CompletedTask;
    }
}

public class SearchRequest
{
    public string? Query { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string AcceptLanguage { get; set; } = "en";
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; }
    public Dictionary<string, string> Filters { get; set; } = new();
}

// Usage
[HttpGet("search")]
public IActionResult Search(
    [ModelBinder(BinderType = typeof(CompositeSearchModelBinder))]
    SearchRequest search)
{
    // GET /search?q=laptop&page=2&pageSize=10&sortBy=price&sortDesc=true&filter[category]=electronics
    return Ok(search);
}
```

## Testing Model Binders

Write unit tests to verify your binders work correctly.

```csharp
// Tests/DateRangeModelBinderTests.cs
public class DateRangeModelBinderTests
{
    [Fact]
    public async Task BindModelAsync_ValidRange_ReturnsDateRange()
    {
        // Arrange
        var binder = new DateRangeModelBinder();
        var context = CreateBindingContext("dateRange", "2024-01-01..2024-12-31");

        // Act
        await binder.BindModelAsync(context);

        // Assert
        Assert.True(context.Result.IsModelSet);
        var range = context.Result.Model as DateRange;
        Assert.NotNull(range);
        Assert.Equal(new DateTime(2024, 1, 1), range.Start);
        Assert.Equal(new DateTime(2024, 12, 31), range.End);
    }

    [Fact]
    public async Task BindModelAsync_InvalidFormat_AddsModelError()
    {
        // Arrange
        var binder = new DateRangeModelBinder();
        var context = CreateBindingContext("dateRange", "invalid");

        // Act
        await binder.BindModelAsync(context);

        // Assert
        Assert.False(context.Result.IsModelSet);
        Assert.True(context.ModelState.ErrorCount > 0);
    }

    private ModelBindingContext CreateBindingContext(string name, string value)
    {
        var valueProvider = new QueryStringValueProvider(
            BindingSource.Query,
            new QueryCollection(new Dictionary<string, StringValues>
            {
                { name, value }
            }),
            CultureInfo.InvariantCulture);

        return new DefaultModelBindingContext
        {
            ModelName = name,
            ModelMetadata = new EmptyModelMetadataProvider()
                .GetMetadataForType(typeof(DateRange)),
            ModelState = new ModelStateDictionary(),
            ValueProvider = valueProvider
        };
    }
}
```

## Summary

| Binder Type | Use Case |
|-------------|----------|
| Date Range | Parse custom date formats |
| Comma-Separated | Convert delimited strings to lists |
| Header-Based | Extract data from HTTP headers |
| Encrypted | Decrypt secure parameters |
| Entity Lookup | Fetch from database during binding |
| Composite | Combine multiple sources |

Custom model binders give you complete control over how request data becomes action parameters. Use them to parse custom formats, validate input, fetch related data, or combine information from multiple sources into a single strongly-typed object.
