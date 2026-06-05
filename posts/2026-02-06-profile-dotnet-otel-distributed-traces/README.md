# How to Profile .NET Applications with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Profiling, Distributed Trace

Description: Profile .NET applications using OpenTelemetry and link profiling data to distributed traces for deep diagnostics.

.NET applications have mature profiling support through the CLR's built-in diagnostics infrastructure. With Pyroscope and OpenTelemetry, you can capture .NET profiles continuously and link CPU profiling data directly to distributed traces. This gives you the ability to click on a slow span in your trace view and see which .NET methods were consuming CPU during that span.

## .NET Profiling Fundamentals

The .NET runtime exposes diagnostic data through EventPipe, a cross-platform diagnostics mechanism. EventPipe can carry runtime events such as CPU sampling, GC allocation tracking, contention events, and more. Pyroscope's .NET profiler uses the CLR profiling APIs and native profiler libraries to capture profiles, while `Pyroscope.OpenTelemetry` links those profiles to OpenTelemetry traces.

## Installing the Profiling Package

Add the profiling packages to your .NET project:

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.SqlClient
dotnet add package Pyroscope
dotnet add package Pyroscope.OpenTelemetry
```

## Configuring Profiling with Trace Correlation

Set up the profiling agent alongside your existing OpenTelemetry tracing configuration:

```csharp
using OpenTelemetry.Trace;
using OpenTelemetry.Resources;
using Pyroscope.OpenTelemetry;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry tracing with profiling span processor
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("order-service")
        .AddAttributes(new Dictionary<string, object>
        {
            ["deployment.environment"] = "production",
            ["service.version"] = "1.4.2"
        }))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSqlClientInstrumentation()
        // Add the profiling span processor to link profiles to spans
        .AddProcessor(new PyroscopeSpanProcessor())
        .AddOtlpExporter(opts =>
        {
            opts.Endpoint = new Uri("http://collector:4317");
        }));

var app = builder.Build();
```

Configure the Pyroscope .NET profiler with environment variables when you start the application:

```bash
export CORECLR_ENABLE_PROFILING=1
export CORECLR_PROFILER={BD1A650D-AC5D-4896-B64F-D6FA25D6B26A}
export CORECLR_PROFILER_PATH=/dotnet/Pyroscope.Profiler.Native.so
export LD_PRELOAD=/dotnet/Pyroscope.Linux.ApiWrapper.x64.so
export LD_LIBRARY_PATH=/dotnet
export PYROSCOPE_APPLICATION_NAME=order-service
export PYROSCOPE_SERVER_ADDRESS=http://pyroscope:4040
export PYROSCOPE_PROFILING_ENABLED=1
export PYROSCOPE_PROFILING_CPU_ENABLED=1
export PYROSCOPE_PROFILING_ALLOCATION_ENABLED=1
export PYROSCOPE_PROFILING_LOCK_ENABLED=1
```

The `PyroscopeSpanProcessor` intercepts span start and end events. For root spans, it sets the active Pyroscope profile ID from the span ID and adds a `pyroscope.profile.id` tag to the span. Profiling samples captured while that profile ID is active can then be associated with the trace in Grafana. Span profiles for .NET currently support CPU profiling; allocation and contention profiles are still useful as service-level continuous profiles.

## CPU Profiling for .NET

CPU profiling captures which methods are on the call stack when the profiler samples. For .NET, this includes both managed code (your C# methods) and native code (runtime internals, P/Invoke calls).

```csharp
// Example: a controller action that we want to profile
[ApiController]
[Route("api/orders")]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrderController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] OrderRequest request)
    {
        // The profiler captures CPU samples during this entire method
        // If this span is slow, the flame graph shows exactly where
        var validated = await _orderService.ValidateOrder(request);
        var priced = await _orderService.CalculatePricing(validated);
        var order = await _orderService.PersistOrder(priced);
        await _orderService.PublishOrderEvent(order);

        return Ok(new { orderId = order.Id });
    }
}
```

When you view the trace for a slow `CreateOrder` span, the linked profile might reveal that `CalculatePricing` consumed 70% of the span's CPU time due to an inefficient discount lookup.

## Allocation Profiling

Allocation profiling tracks where objects are created on the managed heap. This is critical for identifying GC pressure:

```csharp
// This method might appear as a hotspot in allocation profiles
public async Task<PricedOrder> CalculatePricing(ValidatedOrder order)
{
    var results = new List<PriceLineItem>();

    foreach (var item in order.Items)
    {
        // Each iteration creates multiple temporary objects
        var basePrice = await _pricingClient.GetPrice(item.Sku);
        var discounts = await _discountEngine.Calculate(item, order.Customer);

        // String interpolation creates temporary strings
        var description = $"{item.Name} x {item.Quantity} @ {basePrice.Amount}";

        results.Add(new PriceLineItem
        {
            Sku = item.Sku,
            Description = description,
            UnitPrice = basePrice.Amount,
            Discount = discounts.Total,
            LineTotal = (basePrice.Amount - discounts.Total) * item.Quantity
        });
    }

    return new PricedOrder { Items = results, Total = results.Sum(r => r.LineTotal) };
}
```

The allocation profile would show `CalculatePricing` as a hotspot, with allocations from `List<T>.Add` (list resizing), string interpolation, and the `PriceLineItem` constructor.

## Contention Profiling

.NET contention profiling tracks time spent waiting on locks. This is one of the Pyroscope .NET profiler's supported profile types and is useful for diagnosing lock-related latency under load:

```csharp
// Contention profiling would flag this pattern
private static readonly object _cacheLock = new object();
private static Dictionary<string, decimal> _priceCache = new();

public decimal GetCachedPrice(string sku)
{
    lock (_cacheLock)  // Contention shows up here under load
    {
        if (_priceCache.TryGetValue(sku, out var price))
            return price;

        price = FetchPriceFromDatabase(sku);
        _priceCache[sku] = price;
        return price;
    }
}
```

The contention profile would show threads blocking on `_cacheLock`, giving you evidence to switch to a `ConcurrentDictionary` or `ReaderWriterLockSlim`.

## Collector Configuration

In this setup, the OpenTelemetry Collector receives traces from the .NET SDK and forwards them to Tempo. The Pyroscope .NET profiler sends profiles directly to Pyroscope using `PYROSCOPE_SERVER_ADDRESS`.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/tempo]
```

## Viewing Connected Data

In Grafana with Tempo and Pyroscope both configured:

1. Open the Explore view for Tempo.
2. Find a trace with a slow span.
3. Click on the span.
4. Open the linked profile view for the span.
5. The flame graph shows .NET method-level CPU profiling data associated with that span.

This workflow eliminates the guesswork. Instead of attaching a local profiler and trying to reproduce the issue, you have production profiling data linked directly to the trace that showed the problem. For .NET applications, the combination of span-linked CPU profiles plus service-level allocation and contention profiles gives you a thorough view of what your code is actually doing in production.
