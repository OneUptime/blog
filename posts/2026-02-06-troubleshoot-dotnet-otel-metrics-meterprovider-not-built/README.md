# How to Troubleshoot OpenTelemetry Metrics Not Exporting in .NET Because the MeterProvider Was Not Built

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Metrics, MeterProvider

Description: Diagnose and fix OpenTelemetry metrics not exporting in .NET applications when the MeterProvider is not properly built.

Your .NET application records metrics with OpenTelemetry. You have added counters, histograms, and gauges. But when you check your metrics backend, nothing appears. No errors in the logs. The metrics are being recorded, but they never leave the application.

## The Root Cause

The most common reason for this is that the `MeterProvider` was never built or was not registered correctly with dependency injection. Without a running `MeterProvider`, the `Meter` and its instruments (Counter, Histogram, etc.) record data into a void.

## How .NET Metrics Work

In .NET, metrics use the `System.Diagnostics.Metrics.Meter` class. The OpenTelemetry SDK creates a `MeterListener` that subscribes to your `Meter` instances. If the `MeterProvider` is not built, the listener is never created, and instruments have no subscriber.

When a `Meter` instrument has no subscriber, calls to `Add()` or `Record()` are essentially no-ops. The data is discarded.

## The Broken Configuration

```csharp
// Program.cs - the wrong way
var builder = WebApplication.CreateBuilder(args);

// Configuring metrics but not adding it to the service pipeline
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter("MyApp")
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    });
// Notice: WithTracing is called but WithMetrics configuration
// might be silently failing due to a missing reader

var app = builder.Build();
```

A common variation is forgetting to add an exporter or reader:

```csharp
// BROKEN: no exporter configured for metrics
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter("MyApp")
            .AddAspNetCoreInstrumentation();
        // Missing: .AddOtlpExporter() or any reader
    });
```

Without a reader (exporter), the `MeterProvider` has nothing to push data to. Instruments are subscribed, but collected data has nowhere to go.

## The Fix

Make sure you have both the Meter registration and an exporter:

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            // Register your custom meter
            .AddMeter("MyApp")
            // Add built-in instrumentations
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            // Add an exporter (this creates the reader)
            .AddOtlpExporter();
    });
```

## Verifying the MeterProvider Is Working

Add a console exporter temporarily to verify metrics are flowing:

```bash
dotnet add package OpenTelemetry.Exporter.Console
```

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter("MyApp")
            .AddAspNetCoreInstrumentation()
            // Add console exporter for debugging
            .AddConsoleExporter()
            // Keep your real exporter too
            .AddOtlpExporter();
    });
```

When you run the application, you should see metric data printed to the console every 60 seconds (the default export interval). If you see console output but not data in your backend, the problem is with the OTLP exporter configuration, not the MeterProvider.

## Custom Meters and Instruments

Make sure your custom Meter name matches what you registered:

```csharp
// Define the meter with a specific name
public static class AppMetrics
{
    public const string MeterName = "MyApp";
    private static readonly Meter Meter = new(MeterName, "1.0.0");

    // Define instruments
    public static readonly Counter<long> OrdersCreated =
        Meter.CreateCounter<long>("orders.created",
            description: "Number of orders created");

    public static readonly Histogram<double> OrderProcessingTime =
        Meter.CreateHistogram<double>("orders.processing_time",
            unit: "ms",
            description: "Time to process an order");
}
```

```csharp
// Use the instruments in your code
public class OrderService
{
    public async Task<Order> CreateOrder(OrderRequest request)
    {
        var stopwatch = Stopwatch.StartNew();

        var order = await ProcessOrder(request);

        stopwatch.Stop();

        // Record metrics
        AppMetrics.OrdersCreated.Add(1,
            new KeyValuePair<string, object>("order.type", request.Type));

        AppMetrics.OrderProcessingTime.Record(
            stopwatch.Elapsed.TotalMilliseconds,
            new KeyValuePair<string, object>("order.type", request.Type));

        return order;
    }
}
```

```csharp
// Register the meter name in configuration
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddMeter(AppMetrics.MeterName)  // must match "MyApp"
            .AddOtlpExporter();
    });
```

## Adjusting Export Interval

The default export interval for metrics is 60 seconds. During development, you might want it faster:

```csharp
metrics.AddOtlpExporter((exporterOptions, readerOptions) =>
{
    exporterOptions.Endpoint = new Uri("http://localhost:4317");
    // Export every 10 seconds instead of 60
    readerOptions.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds = 10000;
});
```

## Diagnostic Check

If metrics still do not appear, run through this checklist:

1. Is `AddMeter("YourMeterName")` called with the correct name?
2. Is an exporter (OTLP, Console, or Prometheus) added?
3. Is the MeterProvider being disposed before it can export? (Check application lifetime)
4. Is the OTLP endpoint reachable from the application?
5. Are you waiting long enough for the export interval to trigger?

The `MeterProvider` must be properly built with both a meter subscription and a reader/exporter. Without both pieces, metrics go nowhere.
