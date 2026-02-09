# How to Fix the Confusion Between .NET System.Diagnostics.Activity and OpenTelemetry Span Concepts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Activity, Tracing

Description: Understand the relationship between System.Diagnostics.Activity and OpenTelemetry Span in .NET to avoid common mistakes.

If you come from a background using OpenTelemetry in other languages and then start working with .NET, you will immediately hit a conceptual wall. In .NET, the tracing primitive is not called a "Span." It is called an `Activity`. This naming difference causes real confusion and real bugs.

## The Mapping

Here is how the concepts align:

| OpenTelemetry Concept | .NET Equivalent |
|----------------------|-----------------|
| TracerProvider | ActivitySource + ActivityListener |
| Tracer | ActivitySource |
| Span | Activity |
| SpanContext | ActivityContext |
| SpanKind | ActivityKind |

The .NET team built `System.Diagnostics.Activity` before OpenTelemetry existed. When OTel came along, the .NET SDK was built on top of the existing `Activity` infrastructure rather than creating a parallel system.

## The Common Mistake

Developers new to .NET OpenTelemetry often try to use the OpenTelemetry API directly, creating spans with `Tracer.StartActiveSpan()`. While this works, it is not the idiomatic .NET approach and can cause issues:

```csharp
// This works but is not the recommended .NET pattern
using var span = tracer.StartActiveSpan("my-operation");
span.SetAttribute("key", "value");
```

The idiomatic .NET approach uses `ActivitySource`:

```csharp
// Create an ActivitySource (equivalent to a Tracer)
private static readonly ActivitySource Source = new("MyService");

public void ProcessOrder(Order order)
{
    // Start an Activity (equivalent to starting a Span)
    using var activity = Source.StartActivity("ProcessOrder");

    // Set attributes using the Activity API
    activity?.SetTag("order.id", order.Id);
    activity?.SetTag("order.total", order.Total);

    // Do work...
    ValidateOrder(order);
    ChargePayment(order);
}
```

Notice the `?.` null-conditional operator. This is important because `StartActivity` returns `null` when no listener is sampling the activity. If the OpenTelemetry SDK is not configured, or if the sampler decides not to sample this trace, `StartActivity` returns `null` instead of creating an object.

## Why This Matters for Instrumentation

If you forget the null check, you get a `NullReferenceException`:

```csharp
// BAD: will throw NullReferenceException when activity is null
using var activity = Source.StartActivity("ProcessOrder");
activity.SetTag("order.id", order.Id); // NullReferenceException!

// GOOD: use null-conditional operator
using var activity = Source.StartActivity("ProcessOrder");
activity?.SetTag("order.id", order.Id); // safe
```

## Setting Up the ActivitySource Correctly

The `ActivitySource` name must match what you register in the OpenTelemetry SDK configuration. If they do not match, your activities will not be collected:

```csharp
// In your service code
private static readonly ActivitySource Source = new("MyCompany.MyService");

// In your startup/configuration
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            // This name MUST match the ActivitySource name
            .AddSource("MyCompany.MyService")
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter();
    });
```

If the names do not match, activities are created but never exported. There is no error or warning.

## Working with Activity Context Propagation

Context propagation in .NET uses `Activity.Current`, which is stored in an `AsyncLocal<T>`. This means it flows automatically across `await` calls:

```csharp
public async Task HandleRequest()
{
    using var activity = Source.StartActivity("HandleRequest");

    // Activity.Current is set automatically
    // It flows across await boundaries
    var result = await FetchDataAsync();

    // Activity.Current is still the same activity here
    activity?.SetTag("result.count", result.Count);
}

public async Task<Data> FetchDataAsync()
{
    // Activity.Current here is the "HandleRequest" activity
    // A new child activity will be parented correctly
    using var activity = Source.StartActivity("FetchData");

    return await httpClient.GetFromJsonAsync<Data>("/api/data");
}
```

## Adding Span Events and Status

The Activity API has methods that map to OpenTelemetry span operations:

```csharp
using var activity = Source.StartActivity("ProcessPayment");

// Add an event (equivalent to span.AddEvent)
activity?.AddEvent(new ActivityEvent("payment.started",
    tags: new ActivityTagsCollection
    {
        { "payment.method", "credit_card" }
    }));

try
{
    await chargeCard(order);

    // Set status to OK
    activity?.SetStatus(ActivityStatusCode.Ok);
}
catch (Exception ex)
{
    // Record the exception and set error status
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    activity?.AddEvent(new ActivityEvent("exception",
        tags: new ActivityTagsCollection
        {
            { "exception.type", ex.GetType().FullName },
            { "exception.message", ex.Message },
            { "exception.stacktrace", ex.StackTrace }
        }));
    throw;
}
```

## Key Takeaways

1. In .NET, `Activity` is the span. Do not fight this; embrace it.
2. Always use `?.` when calling methods on an `Activity` because it can be `null`.
3. The `ActivitySource` name must match what you register with `AddSource()`.
4. Context propagation works automatically with `async/await` thanks to `AsyncLocal<T>`.
5. Use `SetTag` for attributes, `AddEvent` for events, and `SetStatus` for span status.

Once you internalize the Activity/Span mapping, working with OpenTelemetry in .NET becomes straightforward. The underlying mechanics are the same; only the names differ.
