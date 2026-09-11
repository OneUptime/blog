# Use Activity.Current and Logging Scopes for .NET Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, .NET, ASP.NET Core, Logging, Distributed Tracing

Description: Keep correlation metadata out of domain method signatures using request logging scopes and Activity.Current, while preserving async isolation and cleanup.

---

Passing a correlation ID into every .NET method adds plumbing without improving the domain API. Logging scopes provide an execution-scoped place for application correlation metadata, while `Activity.Current` exposes the active tracing operation.

Use these facilities for diagnostic context. Keep domain inputs, authorization data, and cancellation tokens explicit. A method should still accept an order ID when it operates on an order; it does not need another string parameter solely to enrich every log line.

## Separate the two sources of context

`Activity.Current` identifies the current trace operation. Its `TraceId` stays constant across child activities, while `SpanId` changes. A logging scope adds properties to log events emitted inside its lifetime, including logs from injected `ILogger<T>` instances.

Microsoft documents that activities flow through ordinary synchronous and asynchronous calls. Logging providers must support scopes and be configured to display them. Do not assume a scope exists merely because code calls `BeginScope`; inspect the selected provider's output.

The [distributed tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts) and [logging documentation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview) describe these independent mechanisms.

## Create the scope at the request boundary

This complete minimal web application generates a fresh public support ID. A downstream method logs without receiving that ID as a parameter:

```csharp
using System.Diagnostics;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options => options.IncludeScopes = true);
builder.Logging.Configure(options =>
    options.ActivityTrackingOptions = ActivityTrackingOptions.TraceId
        | ActivityTrackingOptions.SpanId);
builder.Services.AddScoped<InventoryService>();

var app = builder.Build();
app.Use(async (context, next) =>
{
    var id = Guid.NewGuid().ToString("N");
    context.Response.Headers["X-Correlation-ID"] = id;
    using var scope = app.Logger.BeginScope(
        new Dictionary<string, object?>
        {
            ["correlation_id"] = id,
        });
    Activity.Current?.SetTag("app.correlation_id", id);
    await next(context);
});

app.MapGet("/stock/{sku}", async (
    string sku, InventoryService inventory, CancellationToken token) =>
{
    await inventory.CheckAsync(sku, token);
    return Results.Ok(new { sku, available = true });
});
app.Run();

sealed class InventoryService(ILogger<InventoryService> logger)
{
    public async Task CheckAsync(string sku, CancellationToken token)
    {
        logger.LogInformation("Checking stock for {Sku}", sku);
        await Task.Delay(10, token);
        logger.LogInformation("Stock check complete for {Sku}", sku);
    }
}
```

Run this with `dotnet run` and request two different SKUs concurrently. The logs for each request should contain its scope value before and after the `await`. The example leaves business arguments and cancellation visible while keeping diagnostic metadata at the boundary.

For an internal service behind an authenticated gateway, replace generation with validated extraction according to your gateway contract. Do not trust a public caller merely because the header has a UUID-like shape.

## Dispose scopes at their actual lifetime boundary

The `using` declaration keeps the scope active until the awaited downstream pipeline returns. It also disposes the scope when an exception propagates. Omitting `await` and returning a task from inside a prematurely disposed scope can produce logs without the intended context.

Never store a scope disposable in a singleton or close it from an unrelated worker. Nested scopes should be nested in code, and their lifetimes should correspond to the operation they describe.

You may add another scope for a bounded operation:

```csharp
using (logger.BeginScope(new Dictionary<string, object?>
{
    ["operation"] = "stock-reservation",
}))
{
    logger.LogInformation("Reservation started");
    await Task.Delay(10, token);
}
```

Use distinct field names when scopes represent different concepts. Repeated keys can be rendered differently by different providers, so avoid relying on a particular flattening rule unless it is part of your tested logging configuration.

## Read the current activity when you need the current span

A child activity can change `Activity.Current`. If you cache its span ID at the start of the request and use it for every later log, nested operation logs may point to the wrong span. Prefer the provider's supported activity enrichment or read `Activity.Current` at the moment the event is emitted.

Custom instrumentation should use `ActivitySource`. Its `StartActivity` can return `null` when no listener requests an activity, so use null-safe access. Correlation logging must continue to work without a trace exporter or when tracing is disabled.

Do not use an activity tag as a general-purpose ambient key-value store. Tags describe the activity for telemetry. If application code truly needs a diagnostic accessor, expose a small scoped abstraction with a stable contract instead of requiring every method to know the transport header name.

## Recognize boundaries that do not inherit automatically

A queue does not serialize the current logging scope. A new process cannot see `Activity.Current` from the producer. Background work that executes after a request ends needs an explicit envelope containing the selected correlation ID and propagatable trace context.

Similarly, suppressing `ExecutionContext` flow or using unusual scheduling mechanisms can change ambient behavior. When crossing a boundary, verify it with concurrent requests rather than inferring behavior from a single sequential call.

Avoid fire-and-forget request tasks that retain scoped dependencies. An ambient ID remaining visible does not make a disposed database context safe to use.

## Verify isolation and provider behavior

Check successful requests, thrown exceptions, canceled requests, child activities, and concurrent calls. Confirm the response ID matches all expected logs, one request never receives another request's ID, and child-operation logs use the current span ID.

Inspect the exported JSON structure before writing queries. Some providers preserve scopes as arrays or nested objects instead of flattening them into top-level properties. Configure ingestion accordingly and keep exact IDs out of metric labels.

## Conclusion

Create one application correlation scope at the request boundary, let it flow across awaited calls, and dispose it reliably. Use `Activity.Current` for the current trace operation and provider-supported enrichment for logs, keeping domain methods focused on the inputs they actually need.

## Official Documentation

- [.NET distributed tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)
- [.NET logging scopes and activity tracking](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview)
- [ASP.NET Core hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0)
