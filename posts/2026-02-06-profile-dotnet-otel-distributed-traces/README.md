# How to Profile .NET Applications with OpenTelemetry and Connect Profiles to Distributed Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Profiling, Distributed Traces

Description: Profile .NET applications using OpenTelemetry and link profiling data to distributed traces for deep diagnostics.

.NET applications have mature profiling support through the CLR's built-in diagnostics infrastructure. With OpenTelemetry, you can capture .NET CPU and allocation profiles continuously and link them directly to distributed traces. This gives you the ability to click on a slow span in your trace view and see exactly which .NET methods were consuming CPU or allocating memory during that span.

## .NET Profiling Fundamentals

The .NET runtime exposes profiling data through EventPipe, a cross-platform diagnostics mechanism. It provides CPU sampling, GC allocation tracking, contention events, and more. The OpenTelemetry .NET profiling integration taps into EventPipe to capture this data and export it as OpenTelemetry profiles.

## Installing the Profiling Package

Add the profiling packages to your .NET project:

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
dotnet add package Pyroscope.OpenTelemetry
```

## Configuring Profiling with Trace Correlation

Set up the profiling agent alongside your existing OpenTelemetry tracing configuration:

```csharp
using OpenTelemetry;
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

// Configure Pyroscope profiling
Pyroscope.Profiler.Instance.Configure(new Pyroscope.ProfilerConfiguration
{
    ApplicationName = "order-service",
    ServerAddress = "http://pyroscope:4040",
    ProfilingEnabled = true,
    CpuProfilingEnabled = true,
    AllocationProfilingEnabled = true,
    ContentionProfilingEnabled = true,
    // Enable span-profile linking
    SpanProfileLinkingEnabled = true
});

var app = builder.Build();
```

The `PyroscopeSpanProcessor` intercepts span start and end events. When a span starts, it tags the current profiling session with the span's trace ID and span ID. All profiling samples captured during that span's lifetime are then associated with it.

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

.NET contention profiling tracks time spent waiting on locks. This is unique to .NET's profiling capabilities and extremely useful for diagnosing thread pool starvation:

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
  otlphttp/pyroscope:
    endpoint: http://pyroscope:4040

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/tempo]
    profiles:
      receivers: [otlp]
      exporters: [otlphttp/pyroscope]
```

## Viewing Connected Data

In Grafana with Tempo and Pyroscope both configured:

1. Open the Explore view for Tempo.
2. Find a trace with a slow span.
3. Click on the span.
4. Click the "Profiles" tab.
5. The flame graph shows .NET method-level profiling data for exactly that span's duration.

This workflow eliminates the guesswork. Instead of attaching a local profiler and trying to reproduce the issue, you have production profiling data linked directly to the trace that showed the problem. For .NET applications, the combination of CPU, allocation, and contention profiles connected to distributed traces gives you a thorough view of what your code is actually doing in production.
