# How to Troubleshoot ASP.NET Core OpenTelemetry Traces Not Appearing Because ActivitySource Name Is Wrong

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, ASP.NET Core, ActivitySource

Description: Fix missing traces in ASP.NET Core applications caused by ActivitySource name mismatches in OpenTelemetry configuration.

You have added OpenTelemetry to your ASP.NET Core application. The built-in HTTP spans show up fine, but your custom spans are nowhere to be found. No errors, no warnings. They just do not appear in your trace backend.

The most likely cause is a mismatch between the `ActivitySource` name in your code and the name registered with `AddSource()` in your OpenTelemetry configuration.

## How ActivitySource Registration Works

The OpenTelemetry .NET SDK uses `ActivityListener` under the hood. When you call `AddSource("name")`, it tells the listener to pay attention to activities created by an `ActivitySource` with that exact name. If the names do not match, the listener ignores those activities, and `StartActivity()` returns `null`.

## The Bug

```csharp
// In OrderService.cs
private static readonly ActivitySource _source = new("OrderService");

public async Task<Order> CreateOrder(OrderRequest request)
{
    using var activity = _source.StartActivity("CreateOrder");
    activity?.SetTag("order.items", request.Items.Count);
    // ... order creation logic
}
```

```csharp
// In Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource("MyApp.OrderService")  // WRONG: does not match "OrderService"
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    });
```

The `ActivitySource` is named `"OrderService"` but `AddSource` registers `"MyApp.OrderService"`. The SDK never collects activities from your source.

## The Fix

Make the names match. The best practice is to define the source name as a constant:

```csharp
// In a shared constants file or within the service
public static class Telemetry
{
    public const string ServiceName = "MyApp.OrderService";
    public static readonly ActivitySource Source = new(ServiceName);
}
```

```csharp
// In OrderService.cs
public class OrderService
{
    public async Task<Order> CreateOrder(OrderRequest request)
    {
        using var activity = Telemetry.Source.StartActivity("CreateOrder");
        activity?.SetTag("order.items", request.Items.Count);
        // ...
    }
}
```

```csharp
// In Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource(Telemetry.ServiceName)  // uses the same constant
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    });
```

## Debugging Technique: List All ActivitySources

You can enumerate all registered ActivitySources at runtime to verify names. Add a diagnostic endpoint:

```csharp
app.MapGet("/debug/sources", () =>
{
    // Use reflection to get the internal list of sources
    // This is a debugging tool only, not for production
    var listenerType = typeof(ActivitySource);
    var field = listenerType.GetField("s_activeSources",
        System.Reflection.BindingFlags.NonPublic |
        System.Reflection.BindingFlags.Static);

    if (field?.GetValue(null) is IEnumerable sources)
    {
        var names = new List<string>();
        foreach (ActivitySource source in sources)
        {
            names.Add(source.Name);
        }
        return Results.Ok(names);
    }
    return Results.Ok("unable to read sources");
});
```

A simpler approach is to add logging:

```csharp
// Add this temporarily to check if the activity is being created
using var activity = Telemetry.Source.StartActivity("CreateOrder");
if (activity == null)
{
    logger.LogWarning(
        "Activity is null - source '{Source}' may not be registered",
        Telemetry.Source.Name);
}
```

## Multiple ActivitySources in a Single Application

Large applications often have multiple ActivitySources. Register all of them:

```csharp
// Define sources per domain
public static class OrderTelemetry
{
    public const string SourceName = "MyApp.Orders";
    public static readonly ActivitySource Source = new(SourceName);
}

public static class PaymentTelemetry
{
    public const string SourceName = "MyApp.Payments";
    public static readonly ActivitySource Source = new(SourceName);
}

public static class InventoryTelemetry
{
    public const string SourceName = "MyApp.Inventory";
    public static readonly ActivitySource Source = new(SourceName);
}
```

```csharp
// Register all sources in Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource(OrderTelemetry.SourceName)
            .AddSource(PaymentTelemetry.SourceName)
            .AddSource(InventoryTelemetry.SourceName)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter();
    });
```

## Wildcard Matching

If you follow a naming convention like `MyApp.*`, you can use wildcard matching:

```csharp
tracing.AddSource("MyApp.*");
```

This will match `MyApp.Orders`, `MyApp.Payments`, `MyApp.Inventory`, and any other source starting with `MyApp.`. This simplifies registration when you have many sources.

## Testing Source Registration

Write a unit test that validates your sources are registered correctly:

```csharp
[Fact]
public void AllActivitySources_AreRegistered()
{
    var serviceCollection = new ServiceCollection();
    serviceCollection.AddOpenTelemetry()
        .WithTracing(tracing =>
        {
            tracing
                .AddSource(OrderTelemetry.SourceName)
                .AddSource(PaymentTelemetry.SourceName)
                .AddInMemoryExporter(new List<Activity>());
        });

    using var sp = serviceCollection.BuildServiceProvider();
    var tracerProvider = sp.GetRequiredService<TracerProvider>();

    // Verify activities are created (not null)
    using var activity = OrderTelemetry.Source.StartActivity("test");
    Assert.NotNull(activity);
}
```

The fix is always the same: make sure `AddSource()` receives exactly the same string that was passed to `new ActivitySource()`. Using shared constants eliminates this class of bugs entirely.
