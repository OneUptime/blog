# How to Customize Swagger Documentation in ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ASP.NET Core, .NET, Swagger, OpenAPI, API Documentation, REST API, Swashbuckle

Description: Learn how to customize Swagger documentation in ASP.NET Core using Swashbuckle, including XML comments, operation filters, security definitions, and custom UI configuration.

---

Good API documentation makes the difference between an API that developers love and one they avoid. Swagger (OpenAPI) provides interactive documentation that lets consumers explore and test your API directly in the browser. This guide covers how to customize that documentation to be truly useful.

## Basic Setup

### Installation

```bash
dotnet add package Swashbuckle.AspNetCore
```

### Minimal Configuration

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.Run();
```

## Enhanced Configuration

### API Info and Contact

```csharp
// Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Orders API",
        Description = "An API for managing customer orders and inventory",
        TermsOfService = new Uri("https://example.com/terms"),
        Contact = new OpenApiContact
        {
            Name = "API Support",
            Email = "api-support@example.com",
            Url = new Uri("https://example.com/support")
        },
        License = new OpenApiLicense
        {
            Name = "MIT License",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });
});
```

### Multiple API Versions

```csharp
// Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Orders API",
        Description = "Version 1 - Stable release"
    });

    options.SwaggerDoc("v2", new OpenApiInfo
    {
        Version = "v2",
        Title = "Orders API",
        Description = "Version 2 - Beta with new features"
    });
});

// Configure UI to show both versions
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Orders API v1");
    options.SwaggerEndpoint("/swagger/v2/swagger.json", "Orders API v2");
});
```

## XML Documentation Comments

Enable XML comments for rich documentation from your code.

### Project Configuration

```xml
<!-- MyApi.csproj -->
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

### Include XML Comments

```csharp
// Program.cs
builder.Services.AddSwaggerGen(options =>
{
    // Include XML comments from main project
    var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFilename));

    // Include XML comments from referenced projects
    var coreXmlPath = Path.Combine(AppContext.BaseDirectory, "MyApi.Core.xml");
    if (File.Exists(coreXmlPath))
    {
        options.IncludeXmlComments(coreXmlPath);
    }
});
```

### Documenting Controllers

```csharp
/// <summary>
/// Manages customer orders including creation, retrieval, and status updates.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class OrdersController : ControllerBase
{
    /// <summary>
    /// Creates a new order for a customer.
    /// </summary>
    /// <param name="request">The order details including items and shipping address.</param>
    /// <returns>The created order with assigned ID and status.</returns>
    /// <response code="201">Order created successfully</response>
    /// <response code="400">Invalid order data provided</response>
    /// <response code="409">Insufficient inventory for requested items</response>
    /// <remarks>
    /// Sample request:
    ///
    ///     POST /api/orders
    ///     {
    ///         "customerId": "cust_123",
    ///         "items": [
    ///             { "productId": "prod_456", "quantity": 2 }
    ///         ],
    ///         "shippingAddress": {
    ///             "street": "123 Main St",
    ///             "city": "Seattle",
    ///             "state": "WA",
    ///             "zipCode": "98101"
    ///         }
    ///     }
    ///
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var order = await _orderService.CreateAsync(request);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    /// <summary>
    /// Retrieves an order by its unique identifier.
    /// </summary>
    /// <param name="id">The order ID (format: ord_xxxxxxxxxx)</param>
    /// <returns>The order details including current status and line items.</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(string id)
    {
        var order = await _orderService.GetByIdAsync(id);
        if (order == null)
            return NotFound();

        return Ok(order);
    }
}
```

### Documenting Models

```csharp
/// <summary>
/// Request payload for creating a new order.
/// </summary>
public class CreateOrderRequest
{
    /// <summary>
    /// The unique identifier of the customer placing the order.
    /// </summary>
    /// <example>cust_abc123xyz</example>
    [Required]
    public string CustomerId { get; set; }

    /// <summary>
    /// List of items to include in the order. At least one item is required.
    /// </summary>
    [Required]
    [MinLength(1)]
    public List<OrderItemRequest> Items { get; set; }

    /// <summary>
    /// Shipping address for the order. Required for physical products.
    /// </summary>
    public AddressRequest ShippingAddress { get; set; }

    /// <summary>
    /// Optional notes or special instructions for the order.
    /// </summary>
    /// <example>Please leave at the front door</example>
    [MaxLength(500)]
    public string Notes { get; set; }
}

/// <summary>
/// Represents a single item in an order.
/// </summary>
public class OrderItemRequest
{
    /// <summary>
    /// The product identifier.
    /// </summary>
    /// <example>prod_xyz789</example>
    [Required]
    public string ProductId { get; set; }

    /// <summary>
    /// Quantity to order. Must be at least 1.
    /// </summary>
    /// <example>2</example>
    [Required]
    [Range(1, 100)]
    public int Quantity { get; set; }
}
```

## Security Definitions

### JWT Bearer Authentication

```csharp
// Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your token below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
```

### API Key Authentication

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Description = "API Key authentication. Provide your API key in the header.",
        Name = "X-API-Key",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            Array.Empty<string>()
        }
    });
});
```

### OAuth2 with Scopes

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri("https://auth.example.com/authorize"),
                TokenUrl = new Uri("https://auth.example.com/token"),
                Scopes = new Dictionary<string, string>
                {
                    ["orders:read"] = "Read order information",
                    ["orders:write"] = "Create and modify orders",
                    ["admin"] = "Administrative access"
                }
            }
        }
    });
});

// Configure UI for OAuth
app.UseSwaggerUI(options =>
{
    options.OAuthClientId("swagger-ui-client");
    options.OAuthUsePkce();
});
```

## Operation Filters

Customize individual operations with filters.

### Add Custom Headers

```csharp
// AddRequiredHeaderParameter.cs
public class AddRequiredHeaderParameter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        operation.Parameters ??= new List<OpenApiParameter>();

        // Add tenant header to all operations
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Tenant-Id",
            In = ParameterLocation.Header,
            Description = "Tenant identifier for multi-tenant operations",
            Required = true,
            Schema = new OpenApiSchema
            {
                Type = "string"
            }
        });
    }
}

// Register in Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.OperationFilter<AddRequiredHeaderParameter>();
});
```

### Apply Security Per Operation

```csharp
// SecurityRequirementsOperationFilter.cs
public class SecurityRequirementsOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // Check if operation has AllowAnonymous attribute
        var allowAnonymous = context.MethodInfo
            .GetCustomAttributes(true)
            .OfType<AllowAnonymousAttribute>()
            .Any();

        if (allowAnonymous)
            return;

        // Check for Authorize attribute
        var authorizeAttributes = context.MethodInfo
            .GetCustomAttributes(true)
            .OfType<AuthorizeAttribute>()
            .ToList();

        var controllerAuthorize = context.MethodInfo.DeclaringType?
            .GetCustomAttributes(true)
            .OfType<AuthorizeAttribute>()
            .ToList() ?? new List<AuthorizeAttribute>();

        authorizeAttributes.AddRange(controllerAuthorize);

        if (!authorizeAttributes.Any())
            return;

        // Add security requirement
        operation.Security = new List<OpenApiSecurityRequirement>
        {
            new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    authorizeAttributes
                        .Where(a => !string.IsNullOrEmpty(a.Policy))
                        .Select(a => a.Policy)
                        .ToList()
                }
            }
        };

        // Add 401 and 403 responses
        operation.Responses.TryAdd("401", new OpenApiResponse
        {
            Description = "Unauthorized - Invalid or missing authentication"
        });

        operation.Responses.TryAdd("403", new OpenApiResponse
        {
            Description = "Forbidden - Insufficient permissions"
        });
    }
}
```

### Add Response Examples

```csharp
// ResponseExamplesOperationFilter.cs
public class ResponseExamplesOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // Add example for 400 Bad Request
        if (operation.Responses.TryGetValue("400", out var badRequest))
        {
            badRequest.Content ??= new Dictionary<string, OpenApiMediaType>();

            if (badRequest.Content.TryGetValue("application/json", out var mediaType))
            {
                mediaType.Example = new OpenApiString(@"{
                    ""type"": ""https://tools.ietf.org/html/rfc7231#section-6.5.1"",
                    ""title"": ""Bad Request"",
                    ""status"": 400,
                    ""errors"": {
                        ""CustomerId"": [""The CustomerId field is required.""],
                        ""Items"": [""At least one item is required.""]
                    }
                }");
            }
        }

        // Add example for 500 Internal Server Error
        if (operation.Responses.TryGetValue("500", out var serverError))
        {
            serverError.Content ??= new Dictionary<string, OpenApiMediaType>();

            serverError.Content["application/json"] = new OpenApiMediaType
            {
                Example = new OpenApiString(@"{
                    ""type"": ""https://tools.ietf.org/html/rfc7231#section-6.6.1"",
                    ""title"": ""Internal Server Error"",
                    ""status"": 500,
                    ""traceId"": ""00-abc123-def456-00""
                }")
            };
        }
    }
}
```

## Schema Filters

Customize how types are represented in the schema.

### Add Enum Descriptions

```csharp
// EnumSchemaFilter.cs
public class EnumSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (!context.Type.IsEnum)
            return;

        var enumType = context.Type;
        var enumValues = Enum.GetValues(enumType);

        var descriptions = new List<string>();

        foreach (var value in enumValues)
        {
            var memberInfo = enumType.GetMember(value.ToString()).FirstOrDefault();
            var description = memberInfo?
                .GetCustomAttribute<DescriptionAttribute>()?
                .Description ?? value.ToString();

            descriptions.Add($"- `{value}` - {description}");
        }

        schema.Description = $"{schema.Description}\n\nPossible values:\n{string.Join("\n", descriptions)}";
    }
}

// Usage
public enum OrderStatus
{
    [Description("Order has been placed but not yet processed")]
    Pending,

    [Description("Order is being prepared for shipment")]
    Processing,

    [Description("Order has been shipped and is in transit")]
    Shipped,

    [Description("Order has been delivered to the customer")]
    Delivered,

    [Description("Order has been cancelled")]
    Cancelled
}
```

### Apply Default Values

```csharp
// DefaultValueSchemaFilter.cs
public class DefaultValueSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema.Properties == null)
            return;

        foreach (var property in context.Type.GetProperties())
        {
            var defaultValueAttr = property.GetCustomAttribute<DefaultValueAttribute>();
            if (defaultValueAttr == null)
                continue;

            var propertyName = property.Name.ToCamelCase();

            if (schema.Properties.TryGetValue(propertyName, out var propertySchema))
            {
                propertySchema.Default = OpenApiAnyFactory.CreateFromJson(
                    JsonSerializer.Serialize(defaultValueAttr.Value));
            }
        }
    }
}
```

## Customizing Swagger UI

### UI Configuration

```csharp
// Program.cs
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Orders API v1");

    // UI behavior
    options.DefaultModelsExpandDepth(2);
    options.DefaultModelExpandDepth(2);
    options.DocExpansion(DocExpansion.List);
    options.EnableFilter();
    options.EnableDeepLinking();
    options.DisplayRequestDuration();

    // Try it out enabled by default
    options.EnableTryItOutByDefault();

    // Custom styling
    options.InjectStylesheet("/swagger/custom.css");
    options.InjectJavascript("/swagger/custom.js");

    // Document title
    options.DocumentTitle = "Orders API Documentation";

    // Persist authorization
    options.EnablePersistAuthorization();
});
```

### Custom CSS

```css
/* wwwroot/swagger/custom.css */
.swagger-ui .topbar {
    background-color: #2c3e50;
}

.swagger-ui .topbar .download-url-wrapper .select-label {
    color: white;
}

.swagger-ui .info .title {
    color: #2c3e50;
}

.swagger-ui .opblock.opblock-post {
    border-color: #49cc90;
    background: rgba(73, 204, 144, 0.1);
}

.swagger-ui .opblock.opblock-get {
    border-color: #61affe;
    background: rgba(97, 175, 254, 0.1);
}
```

## Grouping Operations

Organize operations by tags and groups.

```csharp
// Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.TagActionsBy(api =>
    {
        if (api.GroupName != null)
            return new[] { api.GroupName };

        var controllerName = api.ActionDescriptor.RouteValues["controller"];
        return new[] { controllerName };
    });

    options.DocInclusionPredicate((docName, api) =>
    {
        // Include all for v1
        if (docName == "v1")
            return true;

        // v2 only includes operations with ApiVersion attribute
        var versions = api.ActionDescriptor.EndpointMetadata
            .OfType<ApiVersionAttribute>()
            .SelectMany(a => a.Versions)
            .ToList();

        return versions.Any(v => v.ToString() == docName.TrimStart('v'));
    });
});

// Controller with explicit grouping
[ApiController]
[Route("api/[controller]")]
[ApiExplorerSettings(GroupName = "Order Management")]
public class OrdersController : ControllerBase
{
    // ...
}
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **XML Comments** | Enable in csproj, include in SwaggerGen |
| **Security** | AddSecurityDefinition + AddSecurityRequirement |
| **Operation Filters** | Custom headers, security, examples |
| **Schema Filters** | Enum descriptions, default values |
| **UI Customization** | CSS injection, behavior options |
| **Versioning** | Multiple SwaggerDoc entries |

Well-documented APIs reduce support burden and improve developer adoption. Invest time in XML comments, meaningful examples, and clear error responses. The Swagger UI becomes a powerful tool when properly configured, letting API consumers explore and test without writing code.
