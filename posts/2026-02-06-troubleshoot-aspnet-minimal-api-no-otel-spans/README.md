# How to Troubleshoot ASP.NET Core Minimal API Routes Not Producing OpenTelemetry Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, ASP.NET Core, Minimal API

Description: Fix ASP.NET Core Minimal API endpoints that do not produce OpenTelemetry spans due to instrumentation configuration issues.

ASP.NET Core Minimal APIs are the default way to build HTTP APIs in modern .NET. But if you set up OpenTelemetry and your minimal API endpoints do not produce spans, you are probably missing a piece of the instrumentation setup.

## The Setup That Does Not Work

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource("MyApp")
            .AddOtlpExporter();
        // Missing: AddAspNetCoreInstrumentation()
    });

var app = builder.Build();

app.MapGet("/api/orders", () =>
{
    return Results.Ok(new { orders = new[] { "order-1", "order-2" } });
});

app.Run();
```

You make a request to `/api/orders` and check your tracing backend. No span. The endpoint works fine, but there is no trace.

## Why Minimal APIs Need Explicit Instrumentation

ASP.NET Core's request pipeline emits `Activity` objects through the `Microsoft.AspNetCore` ActivitySource. The OpenTelemetry SDK does not automatically subscribe to this source. You need `AddAspNetCoreInstrumentation()` to register the listener.

## The Fix

Add the ASP.NET Core instrumentation:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource("MyApp")
            .AddAspNetCoreInstrumentation() // this creates HTTP server spans
            .AddHttpClientInstrumentation() // for outgoing HTTP calls
            .AddOtlpExporter();
    });

var app = builder.Build();

app.MapGet("/api/orders", () =>
{
    return Results.Ok(new { orders = new[] { "order-1", "order-2" } });
});

app.Run();
```

Now every incoming HTTP request to any minimal API endpoint will produce a span.

## Adding Custom Spans Inside Minimal API Handlers

The ASP.NET Core instrumentation creates a server span for each request. To add more detail, create child spans inside your handler:

```csharp
private static readonly ActivitySource Source = new("MyApp");

app.MapGet("/api/orders/{customerId}", async (string customerId, AppDbContext db) =>
{
    using var activity = Source.StartActivity("GetOrdersByCustomer");
    activity?.SetTag("customer.id", customerId);

    var orders = await db.Orders
        .Where(o => o.CustomerId == customerId)
        .ToListAsync();

    activity?.SetTag("order.count", orders.Count);

    return Results.Ok(orders);
});
```

The child span `GetOrdersByCustomer` will appear nested under the ASP.NET Core server span in your trace view.

## Enriching the Server Span

You can add additional information to the automatically created server span:

```csharp
tracing.AddAspNetCoreInstrumentation(options =>
{
    // Add custom tags to every server span
    options.EnrichWithHttpRequest = (activity, request) =>
    {
        activity.SetTag("tenant.id",
            request.Headers["X-Tenant-Id"].FirstOrDefault());
    };

    options.EnrichWithHttpResponse = (activity, response) =>
    {
        activity.SetTag("response.content_length",
            response.ContentLength);
    };

    // Filter out health check endpoints
    options.Filter = (httpContext) =>
    {
        return httpContext.Request.Path != "/health"
            && httpContext.Request.Path != "/ready";
    };
});
```

## Route Template in Span Name

By default, the span name includes the HTTP method and route template. For minimal APIs, the route template should be the pattern you defined, not the actual URL with parameter values:

```
// Expected span name: GET /api/orders/{customerId}
// Not: GET /api/orders/cust-12345
```

If you see actual values instead of templates, check that you are using the latest version of the ASP.NET Core instrumentation library. Older versions had issues with minimal API route template resolution.

```bash
# Update to the latest version
dotnet add package OpenTelemetry.Instrumentation.AspNetCore --version 1.9.0
```

## Handling Middleware-Only Endpoints

Some endpoints are handled by middleware (like `UseStaticFiles` or custom middleware) rather than by the routing pipeline. These may not produce route-specific spans:

```csharp
// Static file middleware handles this before routing
app.UseStaticFiles();

// This health check middleware runs before UseRouting
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ping")
    {
        context.Response.StatusCode = 200;
        await context.Response.WriteAsync("pong");
        return; // short-circuits - no route-level span
    }
    await next();
});
```

The ASP.NET Core instrumentation will still create a span for these requests, but the route name may be empty or generic. To get better names, consider moving these into the routing pipeline:

```csharp
app.MapGet("/ping", () => "pong");
app.MapGet("/health", () => Results.Ok());
```

## Testing Span Creation

```csharp
[Fact]
public async Task MinimalApi_ProducesSpans()
{
    var exportedActivities = new List<Activity>();

    var builder = WebApplication.CreateBuilder();
    builder.Services.AddOpenTelemetry()
        .WithTracing(tracing =>
        {
            tracing
                .AddAspNetCoreInstrumentation()
                .AddInMemoryExporter(exportedActivities);
        });

    var app = builder.Build();
    app.MapGet("/api/test", () => "hello");

    await app.StartAsync();

    var client = new HttpClient { BaseAddress = new Uri("http://localhost:5000") };
    await client.GetAsync("/api/test");

    // Flush and check
    app.Services.GetRequiredService<TracerProvider>().ForceFlush();

    var serverSpans = exportedActivities
        .Where(a => a.Kind == ActivityKind.Server)
        .ToList();

    Assert.NotEmpty(serverSpans);

    await app.StopAsync();
}
```

The takeaway is simple: always add `AddAspNetCoreInstrumentation()` when using ASP.NET Core, whether you use Minimal APIs or controllers. Without it, HTTP server spans are not created.
