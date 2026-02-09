# How to Troubleshoot High Memory Usage in .NET OpenTelemetry When Histogram Buckets Explode Cardinality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Metrics, Histograms

Description: Diagnose and fix high memory usage in .NET applications caused by OpenTelemetry histogram bucket explosion with high cardinality.

Your .NET application's memory usage keeps growing. You trace the issue to OpenTelemetry metrics, specifically to histogram instruments. Each unique combination of histogram bucket boundaries and attribute values creates aggregation state in memory. With high cardinality attributes, this can consume hundreds of megabytes.

## How Histogram Memory Works

A histogram in OpenTelemetry stores a count for each bucket boundary. The default bucket boundaries for the explicit bucket histogram are:

```
[0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]
```

That is 16 buckets (15 boundaries plus the overflow bucket). Each unique attribute set gets its own 16-bucket array.

If you have a histogram with attributes `{method, path, status}` and you have:
- 5 methods
- 500 unique paths (high cardinality)
- 10 status codes

That is `5 * 500 * 10 = 25,000` unique attribute sets, each with 16 buckets. That is 400,000 bucket counters, plus metadata overhead.

## Identifying the Problem

Check your application's memory profile. Look for types related to metric aggregation:

```csharp
// Add a diagnostic endpoint to check metric state
app.MapGet("/debug/metrics", (MeterProvider provider) =>
{
    var stats = new
    {
        GCTotalMemory = GC.GetTotalMemory(false) / 1024 / 1024,
        Gen0Collections = GC.CollectionCount(0),
        Gen1Collections = GC.CollectionCount(1),
        Gen2Collections = GC.CollectionCount(2),
    };
    return Results.Ok(stats);
});
```

If Gen2 collections are increasing and total memory keeps growing, metric cardinality is a likely cause.

## Fix 1: Reduce Attribute Cardinality

The most effective fix is to reduce the number of unique attribute values:

```csharp
// BAD: raw URL path creates high cardinality
histogram.Record(latency,
    new("http.method", method),
    new("http.route", request.Path),  // /users/123, /users/456, etc.
    new("http.status_code", statusCode));

// GOOD: use route template instead
histogram.Record(latency,
    new("http.method", method),
    new("http.route", GetRouteTemplate(request)),  // /users/{id}
    new("http.status_code", statusCode));
```

```csharp
private static string GetRouteTemplate(HttpRequest request)
{
    var endpoint = request.HttpContext.GetEndpoint();
    if (endpoint is RouteEndpoint routeEndpoint)
    {
        return routeEndpoint.RoutePattern.RawText ?? request.Path;
    }
    return request.Path;
}
```

## Fix 2: Use Views to Limit Attributes

Configure a View that drops high-cardinality attributes:

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter("MyApp")
            .AddView("http.server.request.duration", new MetricStreamConfiguration
            {
                // Only keep low-cardinality attributes
                TagKeys = new[] { "http.method", "http.status_code" }
            })
            .AddOtlpExporter();
    });
```

This view ensures only `http.method` and `http.status_code` are kept. All other attributes on the `http.server.request.duration` histogram are dropped, dramatically reducing cardinality.

## Fix 3: Reduce Histogram Bucket Count

Fewer buckets mean less memory per attribute set. Use custom boundaries that match your use case:

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter("MyApp")
            .AddView("http.server.request.duration", new ExplicitBucketHistogramConfiguration
            {
                // Only 6 buckets instead of 16
                Boundaries = new double[] { 10, 50, 100, 500, 1000 }
            })
            .AddOtlpExporter();
    });
```

## Fix 4: Switch to Exponential Histograms

Exponential histograms (also called base2 exponential histograms) adapt their buckets dynamically and are more memory-efficient for many workloads:

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter("MyApp")
            .AddView("http.server.request.duration",
                new Base2ExponentialBucketHistogramConfiguration
                {
                    MaxSize = 160,  // max number of buckets
                    MaxScale = 20   // precision scale
                })
            .AddOtlpExporter();
    });
```

Exponential histograms provide better precision where the data actually falls, without wasting memory on empty buckets.

## Fix 5: Set Cardinality Limits

The .NET OpenTelemetry SDK supports cardinality limits via Views:

```csharp
metrics.AddView(instrument =>
{
    // Apply a cardinality limit to all histograms
    if (instrument.GetType().Name.Contains("Histogram"))
    {
        return new MetricStreamConfiguration
        {
            CardinalityLimit = 500  // max 500 unique attribute combos
        };
    }
    return null; // use defaults for non-histograms
});
```

When the limit is reached, additional attribute combinations are mapped to an overflow series.

## Monitoring Memory Impact

Track the memory impact of metrics with a background service:

```csharp
public class MetricMemoryMonitor : BackgroundService
{
    private readonly ILogger<MetricMemoryMonitor> _logger;

    public MetricMemoryMonitor(ILogger<MetricMemoryMonitor> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var memInfo = GC.GetGCMemoryInfo();
            _logger.LogInformation(
                "Memory: Heap={HeapMB}MB, Committed={CommittedMB}MB, " +
                "Gen2Count={Gen2}",
                memInfo.HeapSizeBytes / 1024 / 1024,
                memInfo.TotalCommittedBytes / 1024 / 1024,
                GC.CollectionCount(2));

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

Watch for steady growth in heap size, which indicates a cardinality leak.

## Summary

High memory usage from histograms is caused by the combination of many unique attribute values and many bucket boundaries. The fix involves reducing cardinality (fewer unique attribute values), reducing buckets (fewer boundaries), or switching to exponential histograms. Use Views to enforce these limits at the SDK level.
