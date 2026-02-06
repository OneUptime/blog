# How to Fix Activity Sampling Dropping All Spans When ActivityListener.ShouldListenTo Returns False

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Sampling, ActivityListener

Description: Fix all spans being dropped in .NET OpenTelemetry because ActivityListener.ShouldListenTo is incorrectly filtering sources.

You set up custom sampling in your .NET OpenTelemetry configuration. You expected some spans to be sampled out. Instead, you get no spans at all. Every single span is dropped. The issue is almost certainly in how `ActivityListener.ShouldListenTo` is configured, either directly or through the OpenTelemetry SDK's sampling pipeline.

## How Activity Sampling Works in .NET

The .NET runtime uses `ActivityListener` to determine whether to create `Activity` objects. The listener has two key callbacks:

1. `ShouldListenTo` - decides whether to listen to a given `ActivitySource` at all
2. `Sample` - decides the sampling level for individual activities

If `ShouldListenTo` returns `false` for an `ActivitySource`, none of the activities from that source will ever be created. The `Sample` callback is never even called.

## The Problem

When you configure OpenTelemetry in .NET, the SDK creates an `ActivityListener` internally. If your configuration causes `ShouldListenTo` to reject your sources, everything is dropped:

```csharp
// This configuration registers NO sources
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            // Forgot to add AddSource for custom sources
            // Only HTTP instrumentation is registered
            .AddAspNetCoreInstrumentation()
            .SetSampler(new AlwaysOnSampler())
            .AddOtlpExporter();
    });
```

Even with `AlwaysOnSampler`, your custom `ActivitySource` activities are not collected because the source is not registered.

## Debugging: Check What Gets Sampled

Add a custom `ActivityListener` temporarily to see what is happening:

```csharp
// Add this in Program.cs for debugging
ActivitySource.AddActivityListener(new ActivityListener
{
    ShouldListenTo = source =>
    {
        Console.WriteLine($"ShouldListenTo: {source.Name} -> checking");
        return false; // return false so it doesn't interfere with OTel
    },
    Sample = (ref ActivityCreationOptions<ActivityContext> options) =>
    {
        Console.WriteLine($"Sample: {options.Source.Name}/{options.Name}");
        return ActivitySamplingResult.None; // don't interfere
    }
});
```

This will print every `ActivitySource` that tries to create activities, helping you identify which sources exist and whether they match your configuration.

## The Fix: Register All Required Sources

```csharp
// Define your source
public static class Telemetry
{
    public static readonly ActivitySource Source = new("MyApp.OrderService");
}

// Register it properly
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource("MyApp.OrderService")    // register custom source
            .AddAspNetCoreInstrumentation()     // register HTTP source
            .AddHttpClientInstrumentation()     // register HTTP client source
            .SetSampler(new TraceIdRatioBasedSampler(0.1)) // sample 10%
            .AddOtlpExporter();
    });
```

## Custom Sampler Pitfalls

If you write a custom sampler, a common mistake is returning `Drop` for all decisions:

```csharp
// BROKEN: this sampler drops everything
public class MySampler : Sampler
{
    public override SamplingResult ShouldSample(in SamplingParameters parameters)
    {
        // Bug: the condition is always true, drops everything
        if (parameters.ParentContext.TraceFlags == ActivityTraceFlags.None)
        {
            return new SamplingResult(SamplingDecision.Drop);
        }
        return new SamplingResult(SamplingDecision.RecordAndSample);
    }
}
```

The issue is that root spans always have `TraceFlags.None` (because there is no parent). This sampler drops all root spans, which means no trace ever starts.

Fix: handle root spans explicitly:

```csharp
public class MySampler : Sampler
{
    private readonly double _ratio;

    public MySampler(double ratio)
    {
        _ratio = ratio;
    }

    public override SamplingResult ShouldSample(in SamplingParameters parameters)
    {
        // For root spans (no parent), use ratio-based sampling
        if (!parameters.ParentContext.IsValid())
        {
            // Use the trace ID to make a deterministic decision
            var traceIdBytes = new byte[16];
            parameters.TraceId.CopyTo(traceIdBytes);
            var value = BitConverter.ToUInt64(traceIdBytes, 0);
            var threshold = (ulong)(_ratio * ulong.MaxValue);

            if (value < threshold)
            {
                return new SamplingResult(SamplingDecision.RecordAndSample);
            }
            return new SamplingResult(SamplingDecision.Drop);
        }

        // For child spans, follow the parent's decision
        if (parameters.ParentContext.TraceFlags.HasFlag(ActivityTraceFlags.Recorded))
        {
            return new SamplingResult(SamplingDecision.RecordAndSample);
        }
        return new SamplingResult(SamplingDecision.Drop);
    }
}
```

## Testing Your Sampler

Write a test that verifies the sampler behavior:

```csharp
[Fact]
public void Sampler_DoesNotDropAllSpans()
{
    var exportedActivities = new List<Activity>();

    var services = new ServiceCollection();
    services.AddOpenTelemetry()
        .WithTracing(tracing =>
        {
            tracing
                .AddSource("TestSource")
                .SetSampler(new MySampler(1.0)) // 100% sampling
                .AddInMemoryExporter(exportedActivities);
        });

    using var sp = services.BuildServiceProvider();
    var source = new ActivitySource("TestSource");

    // Create 10 activities
    for (int i = 0; i < 10; i++)
    {
        using var activity = source.StartActivity($"test-{i}");
        // activity should not be null when sampling at 100%
        Assert.NotNull(activity);
    }

    sp.GetRequiredService<TracerProvider>().ForceFlush();
    Assert.Equal(10, exportedActivities.Count);
}
```

## Key Points

1. `ShouldListenTo` is the first gate. If it rejects an `ActivitySource`, no activities from that source are ever created.
2. Always register your `ActivitySource` names with `AddSource()`.
3. Custom samplers must handle root spans (no parent context) correctly.
4. Use `AlwaysOnSampler` during development to rule out sampling issues.
5. Add temporary debugging listeners to see which sources are active and what decisions are being made.
