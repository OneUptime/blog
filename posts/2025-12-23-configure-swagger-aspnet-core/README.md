# How to Configure Swagger in ASP.NET Core

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: C#, ASP.NET Core, Swagger, OpenAPI, API Documentation, .NET

Description: Learn how to configure Swagger/OpenAPI in ASP.NET Core with practical examples covering customization, authentication, XML comments, and production deployment best practices.

---

Swagger (OpenAPI) provides interactive documentation for your ASP.NET Core APIs. It allows developers to explore and test endpoints directly from the browser. This guide covers complete Swagger configuration from basic setup to advanced customization.

## Basic Setup

### Installation

```bash
dotnet add package Swashbuckle.AspNetCore
```

### Minimal Configuration

```csharp
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

app.UseAuthorization();
app.MapControllers();
app.Run();
```

Access Swagger UI at: `https://localhost:5001/swagger`

## Customizing Swagger

### API Information

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Order Management API",
        Description = "An ASP.NET Core Web API for managing orders",
        TermsOfService = new Uri("https://example.com/terms"),
        Contact = new OpenApiContact
        {
            Name = "API Support",
            Email = "support@example.com",
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

### XML Comments

Enable XML documentation in your project:

```xml
<!-- In .csproj file -->
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

Configure Swagger to use XML comments:

```csharp
builder.Services.AddSwaggerGen(options =>
{
    // Include XML comments
    var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFilename));
});
```

Document your API:

```csharp
/// <summary>
/// Manages order operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    /// <summary>
    /// Gets all orders for a customer
    /// </summary>
    /// <param name="customerId">The customer's unique identifier</param>
    /// <returns>A list of orders</returns>
    /// <response code="200">Returns the list of orders</response>
    /// <response code="404">If the customer is not found</response>
    [HttpGet("customer/{customerId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<Order>>> GetCustomerOrders(int customerId)
    {
        var orders = await _orderService.GetByCustomerAsync(customerId);
        return Ok(orders);
    }

    /// <summary>
    /// Creates a new order
    /// </summary>
    /// <param name="request">The order creation request</param>
    /// <returns>The created order</returns>
    /// <remarks>
    /// Sample request:
    ///
    ///     POST /api/orders
    ///     {
    ///        "customerId": 1,
    ///        "items": [
    ///          { "productId": 100, "quantity": 2 }
    ///        ]
    ///     }
    ///
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Order>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var order = await _orderService.CreateAsync(request);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }
}
```

## Authentication Configuration

### JWT Bearer Authentication

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });

    // Add JWT authentication
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
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
options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
{
    Description = "API Key needed to access the endpoints. X-API-Key: {key}",
    In = ParameterLocation.Header,
    Name = "X-API-Key",
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
```

### OAuth2 Configuration

```csharp
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
                { "read", "Read access" },
                { "write", "Write access" }
            }
        }
    }
});
```

## API Versioning

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My API",
        Version = "v1",
        Description = "Version 1 of the API"
    });

    options.SwaggerDoc("v2", new OpenApiInfo
    {
        Title = "My API",
        Version = "v2",
        Description = "Version 2 with new features"
    });
});

// Configure UI for multiple versions
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1");
    options.SwaggerEndpoint("/swagger/v2/swagger.json", "My API v2");
});
```

## Customizing the UI

```csharp
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1");

    // Customize UI
    options.DocumentTitle = "My API Documentation";
    options.DefaultModelsExpandDepth(-1); // Hide schemas section
    options.DocExpansion(DocExpansion.None); // Collapse all operations
    options.EnableDeepLinking();
    options.DisplayRequestDuration();

    // Custom CSS
    options.InjectStylesheet("/swagger-ui/custom.css");

    // Custom JavaScript
    options.InjectJavascript("/swagger-ui/custom.js");

    // OAuth configuration
    options.OAuthClientId("swagger-ui");
    options.OAuthAppName("Swagger UI");
    options.OAuthUsePkce();
});
```

## Operation Filters

### Add Common Parameters

```csharp
public class AddCommonParametersFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        operation.Parameters ??= new List<OpenApiParameter>();

        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Correlation-Id",
            In = ParameterLocation.Header,
            Required = false,
            Schema = new OpenApiSchema { Type = "string" },
            Description = "Correlation ID for request tracking"
        });
    }
}

// Register filter
options.OperationFilter<AddCommonParametersFilter>();
```

### Conditional Security Requirements

```csharp
public class AuthorizeCheckOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var hasAuthorize = context.MethodInfo.DeclaringType!
            .GetCustomAttributes(true)
            .Union(context.MethodInfo.GetCustomAttributes(true))
            .OfType<AuthorizeAttribute>()
            .Any();

        var hasAllowAnonymous = context.MethodInfo
            .GetCustomAttributes(true)
            .OfType<AllowAnonymousAttribute>()
            .Any();

        if (hasAuthorize && !hasAllowAnonymous)
        {
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
                        Array.Empty<string>()
                    }
                }
            };
        }
    }
}
```

## Schema Filters

### Customize Schema Generation

```csharp
public class EnumSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type.IsEnum)
        {
            schema.Enum.Clear();
            foreach (var name in Enum.GetNames(context.Type))
            {
                schema.Enum.Add(new OpenApiString(name));
            }
            schema.Type = "string";
        }
    }
}

// Register filter
options.SchemaFilter<EnumSchemaFilter>();
```

### Add Examples

```csharp
public class OrderExampleFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type == typeof(CreateOrderRequest))
        {
            schema.Example = new OpenApiObject
            {
                ["customerId"] = new OpenApiInteger(1),
                ["items"] = new OpenApiArray
                {
                    new OpenApiObject
                    {
                        ["productId"] = new OpenApiInteger(100),
                        ["quantity"] = new OpenApiInteger(2)
                    }
                }
            };
        }
    }
}
```

## Production Considerations

```csharp
var app = builder.Build();

// Swagger only in non-production or with feature flag
if (app.Environment.IsDevelopment() ||
    app.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        // Serve Swagger UI at root
        options.RoutePrefix = string.Empty;
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1");
    });
}

// Or protect with authentication
app.UseSwagger();
app.UseSwaggerUI().RequireAuthorization("SwaggerAccess");
```

## Minimal API Documentation

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/orders/{id}", (int id) => Results.Ok(new Order { Id = id }))
   .WithName("GetOrder")
   .WithTags("Orders")
   .WithDescription("Gets an order by ID")
   .Produces<Order>(StatusCodes.Status200OK)
   .Produces(StatusCodes.Status404NotFound)
   .WithOpenApi(operation =>
   {
       operation.Parameters[0].Description = "The order ID";
       return operation;
   });

app.MapPost("/orders", (CreateOrderRequest request) => Results.Created("/orders/1", new Order()))
   .WithName("CreateOrder")
   .WithTags("Orders")
   .WithDescription("Creates a new order")
   .Accepts<CreateOrderRequest>("application/json")
   .Produces<Order>(StatusCodes.Status201Created);

app.Run();
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Use XML comments** | Document all public endpoints |
| **Add response types** | Use ProducesResponseType attributes |
| **Configure authentication** | Show auth requirements in UI |
| **Hide in production** | Or protect with authentication |
| **Add examples** | Help consumers understand payloads |
| **Version your API** | Use multiple Swagger docs |

## Conclusion

Swagger/OpenAPI documentation makes your API more accessible and easier to consume. Enable XML comments for comprehensive documentation, configure authentication to test protected endpoints, and customize the UI to match your needs. Consider your production strategy - either disable Swagger entirely or protect it with authentication to prevent unauthorized access to your API documentation.
