# How to Use .NET Built-In Diagnostics APIs with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Diagnostics, ActivitySource, Meter, C#

Description: Master the System.Diagnostics.Activity and System.Diagnostics.Metrics APIs in .NET to build comprehensive observability with OpenTelemetry integration.

The .NET platform includes powerful diagnostics APIs built directly into the runtime. System.Diagnostics.Activity provides distributed tracing capabilities, while System.Diagnostics.Metrics offers a modern metrics collection API. These APIs form the foundation of observability in .NET, and they integrate seamlessly with OpenTelemetry.

Understanding these built-in APIs is crucial because many .NET libraries and frameworks already emit diagnostics through them. ASP.NET Core, HttpClient, SqlClient, and numerous other components create activities and metrics automatically. When you understand how these APIs work, you can leverage existing instrumentation and add your own custom telemetry.

## The Activity API: Distributed Tracing in .NET

Activity represents a single unit of work in your application. In OpenTelemetry terminology, an activity corresponds to a span. Activities form a tree structure, with child activities nested under parent activities, creating a complete picture of request flow through your system.

The Activity API has been part of .NET since .NET Framework 4.5, but .NET 5 and later versions significantly enhanced it with OpenTelemetry-compatible features like status, events, and links.

## Creating Your First ActivitySource

ActivitySource is a factory for creating activities. You create one ActivitySource per logical component in your application:

```csharp
using System.Diagnostics;

namespace DiagnosticsDemo.Services;

public class PaymentService
{
    // Create an ActivitySource for this component
    // The name should be unique and hierarchical
    private static readonly ActivitySource ActivitySource = new(
        "DiagnosticsDemo.PaymentService",
        "1.0.0");

    public async Task<PaymentResult> ProcessPaymentAsync(string orderId, decimal amount)
    {
        // Start a new activity
        using var activity = ActivitySource.StartActivity("ProcessPayment");

        // Activities might be null if no listener is registered
        if (activity != null)
        {
            // Add tags for context
            activity.SetTag("order.id", orderId);
            activity.SetTag("payment.amount", amount);
            activity.SetTag("payment.currency", "USD");
        }

        try
        {
            // Simulate payment processing
            await Task.Delay(100);

            // Validate amount
            if (amount <= 0)
            {
                throw new ArgumentException("Payment amount must be positive");
            }

            // Process with payment gateway
            var transactionId = await ChargePaymentGatewayAsync(orderId, amount);

            activity?.SetTag("transaction.id", transactionId);
            activity?.SetStatus(ActivityStatusCode.Ok);

            return new PaymentResult
            {
                Success = true,
                TransactionId = transactionId
            };
        }
        catch (Exception ex)
        {
            // Record the exception in the activity
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }

    private async Task<string> ChargePaymentGatewayAsync(string orderId, decimal amount)
    {
        // Child activities are automatically linked to their parent
        using var activity = ActivitySource.StartActivity("ChargePaymentGateway");

        activity?.SetTag("order.id", orderId);
        activity?.SetTag("gateway.provider", "stripe");

        // Simulate gateway call
        await Task.Delay(50);

        var transactionId = Guid.NewGuid().ToString();
        activity?.SetTag("transaction.id", transactionId);

        return transactionId;
    }
}

public class PaymentResult
{
    public bool Success { get; set; }
    public string TransactionId { get; set; } = string.Empty;
}
```

The null check for activity is important. Activities are only created if something is listening. In production with OpenTelemetry configured, activities will be created. During unit tests without OpenTelemetry, they'll be null.

## Activity Kinds and Context Propagation

Activities have different kinds that indicate their role in distributed tracing:

```csharp
public class ApiClient
{
    private static readonly ActivitySource ActivitySource = new("DiagnosticsDemo.ApiClient");
    private readonly HttpClient _httpClient;

    public ApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string> CallExternalApiAsync(string endpoint)
    {
        // Client activities represent outgoing calls
        using var activity = ActivitySource.StartActivity(
            "CallExternalApi",
            ActivityKind.Client);

        activity?.SetTag("http.url", endpoint);
        activity?.SetTag("http.method", "GET");

        try
        {
            // HttpClient automatically propagates trace context
            var response = await _httpClient.GetAsync(endpoint);

            activity?.SetTag("http.status_code", (int)response.StatusCode);
            activity?.SetStatus(
                response.IsSuccessStatusCode ? ActivityStatusCode.Ok : ActivityStatusCode.Error);

            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }
}

public class MessageProcessor
{
    private static readonly ActivitySource ActivitySource = new("DiagnosticsDemo.MessageProcessor");

    public async Task ProcessMessageAsync(string message, Dictionary<string, string> headers)
    {
        // Consumer activities represent processing of messages/events
        // Extract parent context from message headers
        var parentContext = ExtractTraceContext(headers);

        using var activity = ActivitySource.StartActivity(
            "ProcessMessage",
            ActivityKind.Consumer,
            parentContext);

        activity?.SetTag("message.size", message.Length);
        activity?.SetTag("message.source", "queue");

        await Task.Delay(50); // Simulate processing

        activity?.SetStatus(ActivityStatusCode.Ok);
    }

    private ActivityContext ExtractTraceContext(Dictionary<string, string> headers)
    {
        // Extract W3C Trace Context from headers
        if (headers.TryGetValue("traceparent", out var traceparent))
        {
            return ActivityContext.Parse(traceparent, headers.GetValueOrDefault("tracestate"));
        }

        return default;
    }
}
```

Activity kinds help observability tools understand the role of each span and correctly visualize service dependencies.

## Adding Events and Baggage

Activities support events for marking specific points in time and baggage for propagating key-value pairs:

```csharp
public class OrderService
{
    private static readonly ActivitySource ActivitySource = new("DiagnosticsDemo.OrderService");

    public async Task<Order> ProcessOrderAsync(CreateOrderRequest request)
    {
        using var activity = ActivitySource.StartActivity("ProcessOrder");

        activity?.SetTag("customer.id", request.CustomerId);

        // Add baggage that propagates to all child activities
        activity?.SetBaggage("customer.tier", request.CustomerTier);
        activity?.SetBaggage("order.priority", request.Priority.ToString());

        // Add an event to mark a specific point
        activity?.AddEvent(new ActivityEvent(
            "OrderValidationStarted",
            DateTimeOffset.UtcNow));

        await ValidateOrderAsync(request);

        activity?.AddEvent(new ActivityEvent(
            "OrderValidationCompleted",
            DateTimeOffset.UtcNow,
            new ActivityTagsCollection
            {
                { "validation.duration_ms", 45 },
                { "validation.result", "success" }
            }));

        // Baggage is automatically available in child activities
        await AllocateInventoryAsync(request);

        await ChargePaymentAsync(request);

        activity?.SetStatus(ActivityStatusCode.Ok);

        return new Order { Id = Guid.NewGuid().ToString() };
    }

    private async Task AllocateInventoryAsync(CreateOrderRequest request)
    {
        using var activity = ActivitySource.StartActivity("AllocateInventory");

        // Access baggage from parent activity
        var customerTier = Activity.Current?.GetBaggageItem("customer.tier");
        var priority = Activity.Current?.GetBaggageItem("order.priority");

        activity?.SetTag("customer.tier", customerTier);
        activity?.SetTag("order.priority", priority);

        // Prioritize inventory allocation based on customer tier
        if (customerTier == "premium")
        {
            activity?.AddEvent(new ActivityEvent("PriorityAllocation"));
        }

        await Task.Delay(30);
    }

    private async Task ChargePaymentAsync(CreateOrderRequest request)
    {
        using var activity = ActivitySource.StartActivity("ChargePayment");
        await Task.Delay(100);
    }

    private async Task ValidateOrderAsync(CreateOrderRequest request)
    {
        using var activity = ActivitySource.StartActivity("ValidateOrder");
        await Task.Delay(45);
    }
}

public class CreateOrderRequest
{
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerTier { get; set; } = "standard";
    public int Priority { get; set; } = 0;
}

public class Order
{
    public string Id { get; set; } = string.Empty;
}
```

Events provide temporal markers within a span, while baggage propagates contextual information across service boundaries.

## The Meter API: Modern Metrics in .NET

System.Diagnostics.Metrics provides a modern, efficient metrics API. A Meter is a factory for creating metric instruments, similar to how ActivitySource creates activities:

```csharp
using System.Diagnostics.Metrics;

namespace DiagnosticsDemo.Services;

public class InventoryService
{
    private readonly Meter _meter;
    private readonly Counter<long> _itemsSoldCounter;
    private readonly Counter<long> _inventoryDepletedCounter;
    private readonly Histogram<double> _orderValueHistogram;
    private readonly ObservableGauge<int> _currentInventoryGauge;

    private readonly Dictionary<string, int> _inventory = new();

    public InventoryService(IMeterFactory meterFactory)
    {
        // Create a meter for this component
        _meter = meterFactory.Create("DiagnosticsDemo.Inventory", "1.0.0");

        // Counter: Monotonically increasing value
        _itemsSoldCounter = _meter.CreateCounter<long>(
            name: "inventory.items.sold",
            unit: "{items}",
            description: "Total number of items sold");

        // Counter for tracking issues
        _inventoryDepletedCounter = _meter.CreateCounter<long>(
            name: "inventory.depleted",
            unit: "{events}",
            description: "Number of times inventory was depleted");

        // Histogram: Distribution of values
        _orderValueHistogram = _meter.CreateHistogram<double>(
            name: "inventory.order.value",
            unit: "USD",
            description: "Distribution of order values");

        // Observable gauge: Async callback for current value
        _currentInventoryGauge = _meter.CreateObservableGauge<int>(
            name: "inventory.current.level",
            observeValue: () => _inventory.Values.Sum(),
            unit: "{items}",
            description: "Current total inventory level");

        // Initialize some inventory
        _inventory["ITEM-001"] = 100;
        _inventory["ITEM-002"] = 50;
        _inventory["ITEM-003"] = 75;
    }

    public async Task<bool> ProcessSaleAsync(string itemId, int quantity, double orderValue)
    {
        await Task.Delay(10); // Simulate processing

        if (!_inventory.TryGetValue(itemId, out var currentStock))
        {
            return false;
        }

        if (currentStock < quantity)
        {
            // Record inventory depletion
            _inventoryDepletedCounter.Add(1,
                new KeyValuePair<string, object?>("item.id", itemId));
            return false;
        }

        // Update inventory
        _inventory[itemId] = currentStock - quantity;

        // Record metrics with tags for dimensionality
        _itemsSoldCounter.Add(quantity,
            new KeyValuePair<string, object?>("item.id", itemId),
            new KeyValuePair<string, object?>("sale.channel", "online"));

        _orderValueHistogram.Record(orderValue,
            new KeyValuePair<string, object?>("item.id", itemId));

        return true;
    }
}
```

The Meter API is designed for high-performance metric collection with minimal allocation and overhead.

## Advanced Meter Patterns

Create more sophisticated metrics patterns for complex scenarios:

```csharp
public class ApiMetrics
{
    private readonly Meter _meter;
    private readonly Histogram<double> _requestDuration;
    private readonly Counter<long> _requestsTotal;
    private readonly UpDownCounter<long> _activeRequests;
    private readonly ObservableCounter<long> _totalBytesProcessed;

    private long _bytesProcessed = 0;

    public ApiMetrics(IMeterFactory meterFactory)
    {
        _meter = meterFactory.Create("DiagnosticsDemo.Api");

        // Histogram for request latency
        _requestDuration = _meter.CreateHistogram<double>(
            "http.server.request.duration",
            unit: "ms",
            description: "HTTP request duration");

        // Counter for total requests
        _requestsTotal = _meter.CreateCounter<long>(
            "http.server.requests.total",
            unit: "{requests}",
            description: "Total HTTP requests");

        // UpDownCounter for active requests (can increase or decrease)
        _activeRequests = _meter.CreateUpDownCounter<long>(
            "http.server.requests.active",
            unit: "{requests}",
            description: "Number of active HTTP requests");

        // Observable counter for cumulative bytes
        _totalBytesProcessed = _meter.CreateObservableCounter<long>(
            "http.server.bytes.processed",
            observeValue: () => Interlocked.Read(ref _bytesProcessed),
            unit: "By",
            description: "Total bytes processed");
    }

    public IDisposable TrackRequest(string method, string route)
    {
        // Increment active requests
        _activeRequests.Add(1,
            new KeyValuePair<string, object?>("http.method", method),
            new KeyValuePair<string, object?>("http.route", route));

        var startTime = Stopwatch.GetTimestamp();

        return new RequestTracker(this, method, route, startTime);
    }

    private class RequestTracker : IDisposable
    {
        private readonly ApiMetrics _metrics;
        private readonly string _method;
        private readonly string _route;
        private readonly long _startTime;

        public RequestTracker(ApiMetrics metrics, string method, string route, long startTime)
        {
            _metrics = metrics;
            _method = method;
            _route = route;
            _startTime = startTime;
        }

        public void Dispose()
        {
            var duration = Stopwatch.GetElapsedTime(_startTime).TotalMilliseconds;

            var tags = new[]
            {
                new KeyValuePair<string, object?>("http.method", _method),
                new KeyValuePair<string, object?>("http.route", _route)
            };

            // Record duration
            _metrics._requestDuration.Record(duration, tags);

            // Increment total requests
            _metrics._requestsTotal.Add(1, tags);

            // Decrement active requests
            _metrics._activeRequests.Add(-1, tags);
        }
    }

    public void RecordBytesProcessed(long bytes)
    {
        Interlocked.Add(ref _bytesProcessed, bytes);
    }
}
```

This pattern uses IDisposable to automatically track request lifecycle, ensuring metrics are recorded even if exceptions occur.

## Integrating with OpenTelemetry

Configure OpenTelemetry to listen to your custom ActivitySources and Meters:

```csharp
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Register your services
builder.Services.AddSingleton<PaymentService>();
builder.Services.AddSingleton<InventoryService>();
builder.Services.AddSingleton<ApiMetrics>();

// Configure OpenTelemetry
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("DiagnosticsDemo", "1.0.0"))
    .WithTracing(tracing => tracing
        // Register your ActivitySources
        .AddSource("DiagnosticsDemo.*")
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddConsoleExporter())
    .WithMetrics(metrics => metrics
        // Register your Meters
        .AddMeter("DiagnosticsDemo.*")
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddConsoleExporter());

var app = builder.Build();

app.MapControllers();
app.Run();
```

The wildcard pattern "DiagnosticsDemo.*" matches all ActivitySources and Meters with names starting with "DiagnosticsDemo."

## Activity Sampling and Filtering

Control which activities are recorded using sampling:

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetSampler(new TraceIdRatioBasedSampler(0.1)) // Sample 10%
        .AddSource("DiagnosticsDemo.*")
        .AddConsoleExporter());
```

Implement custom sampling logic:

```csharp
using OpenTelemetry.Trace;

public class CustomSampler : Sampler
{
    private readonly double _samplingRate;

    public CustomSampler(double samplingRate)
    {
        _samplingRate = samplingRate;
    }

    public override SamplingResult ShouldSample(in SamplingParameters samplingParameters)
    {
        // Always sample errors
        var tags = samplingParameters.Tags;
        if (tags != null)
        {
            foreach (var tag in tags)
            {
                if (tag.Key == "error" && (bool)tag.Value!)
                {
                    return new SamplingResult(SamplingDecision.RecordAndSample);
                }
            }
        }

        // Sample based on rate for normal requests
        var hash = samplingParameters.TraceId.GetHashCode();
        var shouldSample = (hash & int.MaxValue) < int.MaxValue * _samplingRate;

        return new SamplingResult(
            shouldSample ? SamplingDecision.RecordAndSample : SamplingDecision.Drop);
    }
}

// Use the custom sampler
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetSampler(new CustomSampler(0.1))
        .AddSource("DiagnosticsDemo.*")
        .AddConsoleExporter());
```

## Using ActivityListener for Custom Processing

For advanced scenarios, implement a custom ActivityListener:

```csharp
public class CustomActivityListener : IDisposable
{
    private readonly ActivityListener _listener;

    public CustomActivityListener()
    {
        _listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name.StartsWith("DiagnosticsDemo"),
            Sample = (ref ActivityCreationOptions<ActivityContext> options) =>
                ActivitySamplingResult.AllDataAndRecorded,
            ActivityStarted = OnActivityStarted,
            ActivityStopped = OnActivityStopped
        };

        ActivitySource.AddActivityListener(_listener);
    }

    private void OnActivityStarted(Activity activity)
    {
        Console.WriteLine($"Activity started: {activity.OperationName}");
    }

    private void OnActivityStopped(Activity activity)
    {
        Console.WriteLine($"Activity stopped: {activity.OperationName}, Duration: {activity.Duration}");

        // Access all activity data
        foreach (var tag in activity.Tags)
        {
            Console.WriteLine($"  Tag: {tag.Key} = {tag.Value}");
        }

        foreach (var evt in activity.Events)
        {
            Console.WriteLine($"  Event: {evt.Name} at {evt.Timestamp}");
        }
    }

    public void Dispose()
    {
        _listener.Dispose();
    }
}
```

## Best Practices for Diagnostics APIs

Follow these practices to build effective observability:

Use hierarchical naming for ActivitySources and Meters. Names like "CompanyName.ServiceName.Component" create clear organization and enable wildcard matching.

Create ActivitySources and Meters as static readonly fields. They're designed to be long-lived and reused throughout your application's lifetime.

Always check for null activities. Activities are only created when listeners are active, so defensive null checks prevent unnecessary work.

Use semantic conventions for tag names. Follow OpenTelemetry semantic conventions to ensure consistency and enable better tooling support.

Keep tag cardinality under control. High-cardinality tags (like user IDs or unique identifiers) can explode metric storage and query costs.

## Conclusion

The .NET diagnostics APIs provide a powerful, vendor-neutral foundation for observability. System.Diagnostics.Activity gives you distributed tracing with automatic context propagation, while System.Diagnostics.Metrics offers efficient, modern metric collection.

These APIs integrate seamlessly with OpenTelemetry, allowing you to collect telemetry from both your custom code and the extensive built-in instrumentation in .NET libraries. Understanding how to use ActivitySource and Meter effectively lets you build comprehensive observability into your applications without vendor lock-in.

Start by leveraging the automatic instrumentation that already exists in ASP.NET Core, HttpClient, and other framework components. Then add custom activities and metrics for your business logic. Use consistent naming conventions, follow semantic conventions for tags, and control cardinality carefully. With these practices in place, you'll have deep visibility into your application's behavior in production.
