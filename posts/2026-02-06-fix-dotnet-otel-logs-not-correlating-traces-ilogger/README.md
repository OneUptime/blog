# How to Fix OpenTelemetry Logs Not Correlating with Traces in .NET Because ILogger Is Not Bridged to OTel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Logging, Trace Correlation

Description: Fix missing trace correlation in .NET OpenTelemetry logs by properly bridging ILogger to the OpenTelemetry logging pipeline.

You have tracing and logging configured in your .NET application with OpenTelemetry. Traces show up in your backend. Logs show up too. But they are not correlated. When you look at a trace, you cannot see the related logs. When you look at a log, there is no trace ID attached to it. The connection between them is missing.

## Why Correlation Is Broken

In .NET, application logging uses `ILogger<T>` from `Microsoft.Extensions.Logging`. OpenTelemetry tracing uses `System.Diagnostics.Activity`. These are two separate systems.

For logs to be correlated with traces, each log record needs to include the `trace_id` and `span_id` of the active span at the time the log was written. The OpenTelemetry logging bridge does this automatically, but only if it is properly configured.

## The Missing Configuration

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    });
// Missing: WithLogging() - logs are not sent through OTel

var app = builder.Build();
```

Without `WithLogging()`, the `ILogger` output goes through the default .NET logging pipeline (console, debug, etc.) but not through OpenTelemetry. The logs never get trace context attached.

## The Fix

Add `WithLogging()` to bridge `ILogger` to OpenTelemetry:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    })
    .WithLogging(logging =>
    {
        logging.AddOtlpExporter();
    });

var app = builder.Build();
```

Now when you write a log inside a traced request, the OpenTelemetry log exporter automatically includes `trace_id` and `span_id`:

```csharp
app.MapGet("/api/orders/{id}", (string id, ILogger<Program> logger) =>
{
    // This log will automatically include trace_id and span_id
    logger.LogInformation("Fetching order {OrderId}", id);

    var order = GetOrder(id);

    if (order == null)
    {
        logger.LogWarning("Order {OrderId} not found", id);
        return Results.NotFound();
    }

    return Results.Ok(order);
});
```

## Alternative: Using the Logging Builder

If you need more control over the logging pipeline, you can configure it through the logging builder:

```csharp
builder.Logging.AddOpenTelemetry(options =>
{
    options.IncludeScopes = true;
    options.IncludeFormattedMessage = true;
    options.ParseStateValues = true;

    options.AddOtlpExporter();
});
```

The key options:

- `IncludeScopes`: includes logging scopes as log record attributes
- `IncludeFormattedMessage`: includes the fully formatted log message
- `ParseStateValues`: parses structured log parameters into individual attributes

## Verifying Correlation

After configuration, log records sent through OTLP should contain these fields:

```json
{
    "body": "Fetching order ord-12345",
    "trace_id": "abc123def456...",
    "span_id": "789ghi...",
    "severity_text": "Information",
    "attributes": {
        "OrderId": "ord-12345"
    }
}
```

You can verify this with a console exporter:

```csharp
builder.Logging.AddOpenTelemetry(options =>
{
    options.IncludeFormattedMessage = true;
    options.AddConsoleExporter(); // temporary, for debugging
    options.AddOtlpExporter();
});
```

Check the console output for log records with `TraceId` and `SpanId` fields.

## Structured Logging Best Practices for Correlation

Use structured logging consistently so that log attributes are searchable:

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public OrderService(ILogger<OrderService> logger)
    {
        _logger = logger;
    }

    public async Task<Order> ProcessOrder(string orderId)
    {
        // Use structured parameters (not string interpolation)
        _logger.LogInformation("Processing order {OrderId}", orderId);

        try
        {
            var result = await ChargePayment(orderId);
            _logger.LogInformation(
                "Payment charged for order {OrderId}, amount {Amount}",
                orderId, result.Amount);
            return result.Order;
        }
        catch (Exception ex)
        {
            // The exception will be included as a log attribute
            _logger.LogError(ex,
                "Failed to process order {OrderId}", orderId);
            throw;
        }
    }
}
```

## Using Scopes for Context

Logging scopes add context that persists across multiple log statements:

```csharp
public async Task<Order> ProcessOrder(string orderId, string customerId)
{
    using (_logger.BeginScope(new Dictionary<string, object>
    {
        ["OrderId"] = orderId,
        ["CustomerId"] = customerId
    }))
    {
        // All logs within this scope include OrderId and CustomerId
        _logger.LogInformation("Starting order processing");
        await ValidateOrder(orderId);
        _logger.LogInformation("Order validated");
        await ChargePayment(orderId);
        _logger.LogInformation("Payment charged");
    }
}
```

With `IncludeScopes = true`, these scope values are included as attributes on every log record within the scope, alongside the trace and span IDs.

## Summary

To correlate logs with traces in .NET OpenTelemetry:

1. Add `WithLogging()` or `builder.Logging.AddOpenTelemetry()` to bridge ILogger
2. Add the same exporter (OTLP) for both traces and logs
3. Enable `IncludeFormattedMessage` and `ParseStateValues` for better log detail
4. Use structured logging parameters instead of string interpolation
5. Verify correlation by checking that log records contain `trace_id` and `span_id`
