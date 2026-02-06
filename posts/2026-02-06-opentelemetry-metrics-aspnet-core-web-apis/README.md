# How to Configure OpenTelemetry Metrics Collection for ASP.NET Core Web APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, ASP.NET Core, .NET, Metrics, Web API, C#

Description: Complete guide to implementing metrics collection in ASP.NET Core Web APIs using OpenTelemetry and System.Diagnostics.Metrics for production observability.

Metrics provide quantitative measurements that help you understand the health and performance of your ASP.NET Core applications. Unlike logs and traces that capture discrete events, metrics aggregate data over time, making them ideal for monitoring trends, setting alerts, and capacity planning.

OpenTelemetry's metrics implementation in .NET builds on System.Diagnostics.Metrics, which was introduced in .NET 6. This gives you a vendor-neutral way to collect metrics that can be exported to any compatible backend like Prometheus, OneUptime, or Datadog.

## Core Metrics Concepts

Understanding three fundamental metric types helps you choose the right instrument for your measurements:

Counter measures values that only increase, like total requests processed or errors encountered. Use counters for cumulative values that reset only on application restart.

Histogram records distributions of values, perfect for request durations or response sizes. Histograms automatically calculate percentiles, allowing you to answer questions like "what's the 95th percentile response time?"

Gauge represents a value that can go up or down, such as active connections or memory usage. Unlike counters, gauges snapshot the current state at collection time.

## Setting Up the Project

Start by creating an ASP.NET Core Web API and adding the necessary OpenTelemetry packages:

```bash
# Create a new Web API project
dotnet new webapi -n MetricsDemo
cd MetricsDemo

# Add OpenTelemetry metrics packages
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.Runtime
dotnet add package OpenTelemetry.Exporter.Console
dotnet add package OpenTelemetry.Exporter.Prometheus.AspNetCore
```

The Runtime instrumentation package automatically collects .NET runtime metrics like garbage collection, thread pool usage, and JIT compilation statistics.

## Configuring OpenTelemetry Metrics

Configure metrics collection in your Program.cs file. This setup includes automatic instrumentation and export endpoints:

```csharp
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure OpenTelemetry metrics
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(
            serviceName: "MetricsDemo",
            serviceVersion: "1.0.0",
            serviceInstanceId: Environment.MachineName))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddConsoleExporter()
        .AddPrometheusExporter());

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();

// Expose Prometheus metrics endpoint
app.MapPrometheusScrapingEndpoint();

app.MapControllers();

app.Run();
```

The Prometheus exporter exposes metrics at the /metrics endpoint by default, which can be scraped by Prometheus or any compatible monitoring system.

## Creating Custom Metrics with Meter

While automatic instrumentation provides useful infrastructure metrics, you need custom metrics to track business-specific measurements. Create a meter and define your instruments:

```csharp
using System.Diagnostics.Metrics;

namespace MetricsDemo.Services;

public class OrderMetrics
{
    private readonly Meter _meter;
    private readonly Counter<long> _ordersProcessedCounter;
    private readonly Counter<long> _ordersFailedCounter;
    private readonly Histogram<double> _orderProcessingDuration;
    private readonly Histogram<double> _orderValueHistogram;
    private readonly ObservableGauge<int> _pendingOrdersGauge;

    private int _pendingOrders = 0;

    public OrderMetrics(IMeterFactory meterFactory)
    {
        // Create a meter for this component
        _meter = meterFactory.Create("MetricsDemo.Orders", "1.0.0");

        // Counter for total orders processed
        _ordersProcessedCounter = _meter.CreateCounter<long>(
            name: "orders.processed",
            unit: "{orders}",
            description: "Total number of orders processed");

        // Counter for failed orders
        _ordersFailedCounter = _meter.CreateCounter<long>(
            name: "orders.failed",
            unit: "{orders}",
            description: "Total number of orders that failed processing");

        // Histogram for processing duration
        _orderProcessingDuration = _meter.CreateHistogram<double>(
            name: "orders.processing.duration",
            unit: "ms",
            description: "Duration of order processing in milliseconds");

        // Histogram for order values
        _orderValueHistogram = _meter.CreateHistogram<double>(
            name: "orders.value",
            unit: "USD",
            description: "Order value distribution in USD");

        // Observable gauge for pending orders
        _pendingOrdersGauge = _meter.CreateObservableGauge<int>(
            name: "orders.pending",
            observeValue: () => _pendingOrders,
            unit: "{orders}",
            description: "Number of orders currently pending");
    }

    public void RecordOrderProcessed(double durationMs, double orderValue, string paymentMethod)
    {
        // Increment counter with tags for additional context
        _ordersProcessedCounter.Add(1, new KeyValuePair<string, object?>("payment.method", paymentMethod));

        // Record duration
        _orderProcessingDuration.Record(durationMs,
            new KeyValuePair<string, object?>("payment.method", paymentMethod));

        // Record order value
        _orderValueHistogram.Record(orderValue);
    }

    public void RecordOrderFailed(string reason)
    {
        _ordersFailedCounter.Add(1, new KeyValuePair<string, object?>("failure.reason", reason));
    }

    public void IncrementPendingOrders()
    {
        Interlocked.Increment(ref _pendingOrders);
    }

    public void DecrementPendingOrders()
    {
        Interlocked.Decrement(ref _pendingOrders);
    }
}
```

Notice how each metric includes a descriptive name, unit, and description. This metadata helps monitoring tools display metrics correctly and makes dashboards more understandable.

## Implementing the Order Service

Create a service that uses these metrics to track business operations:

```csharp
using System.Diagnostics;

namespace MetricsDemo.Services;

public class OrderService
{
    private readonly OrderMetrics _metrics;
    private readonly ILogger<OrderService> _logger;
    private readonly Random _random = new();

    public OrderService(OrderMetrics metrics, ILogger<OrderService> logger)
    {
        _metrics = metrics;
        _logger = logger;
    }

    public async Task<OrderResult> ProcessOrderAsync(CreateOrderRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        _metrics.IncrementPendingOrders();

        try
        {
            // Simulate order validation
            await Task.Delay(_random.Next(10, 50));

            if (request.Amount <= 0)
            {
                throw new ArgumentException("Order amount must be positive");
            }

            // Simulate payment processing
            await Task.Delay(_random.Next(50, 200));

            // Simulate occasional failures (10% failure rate)
            if (_random.Next(100) < 10)
            {
                throw new InvalidOperationException("Payment gateway timeout");
            }

            // Simulate order fulfillment
            await Task.Delay(_random.Next(20, 100));

            stopwatch.Stop();

            // Record successful processing
            _metrics.RecordOrderProcessed(
                stopwatch.Elapsed.TotalMilliseconds,
                request.Amount,
                request.PaymentMethod);

            _logger.LogInformation(
                "Order processed successfully in {Duration}ms, Amount: {Amount}, Method: {PaymentMethod}",
                stopwatch.Elapsed.TotalMilliseconds,
                request.Amount,
                request.PaymentMethod);

            return new OrderResult
            {
                Success = true,
                OrderId = Guid.NewGuid().ToString(),
                ProcessingTimeMs = stopwatch.Elapsed.TotalMilliseconds
            };
        }
        catch (ArgumentException ex)
        {
            _metrics.RecordOrderFailed("validation_error");
            _logger.LogWarning(ex, "Order validation failed");
            throw;
        }
        catch (Exception ex)
        {
            _metrics.RecordOrderFailed("processing_error");
            _logger.LogError(ex, "Order processing failed");
            throw;
        }
        finally
        {
            _metrics.DecrementPendingOrders();
        }
    }
}

public class CreateOrderRequest
{
    public double Amount { get; set; }
    public string PaymentMethod { get; set; } = "credit_card";
}

public class OrderResult
{
    public bool Success { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public double ProcessingTimeMs { get; set; }
}
```

The service carefully tracks the lifecycle of each order, recording both successful completions and failures with appropriate tags.

## Building the API Controller

Create a controller that exposes the order processing functionality:

```csharp
using Microsoft.AspNetCore.Mvc;
using MetricsDemo.Services;

namespace MetricsDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(OrderService orderService, ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<OrderResult>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        try
        {
            var result = await _orderService.ProcessOrderAsync(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error processing order");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("health")]
    public ActionResult<object> GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow
        });
    }
}
```

Register both the metrics and service in your dependency injection container:

```csharp
// In Program.cs
builder.Services.AddSingleton<OrderMetrics>();
builder.Services.AddScoped<OrderService>();
```

## Registering Custom Meters

For OpenTelemetry to collect your custom metrics, register the meter name in your configuration:

```csharp
// In Program.cs, update the metrics configuration
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddMeter("MetricsDemo.Orders") // Register custom meter
        .AddConsoleExporter()
        .AddPrometheusExporter());
```

## Understanding Built-In ASP.NET Core Metrics

The ASP.NET Core instrumentation automatically collects several important metrics:

- http.server.request.duration: Histogram of HTTP request durations
- http.server.active_requests: Gauge of currently active requests
- http.server.request.body.size: Histogram of request body sizes
- http.server.response.body.size: Histogram of response body sizes

These metrics include tags for HTTP method, route, and status code, enabling detailed analysis of API performance.

## Advanced Metrics Patterns

For more complex scenarios, you can implement sophisticated metric patterns. Here's an example tracking API rate limiting:

```csharp
public class RateLimitMetrics
{
    private readonly Meter _meter;
    private readonly Counter<long> _requestsAllowed;
    private readonly Counter<long> _requestsRejected;
    private readonly Histogram<int> _clientRequestRate;

    public RateLimitMetrics(IMeterFactory meterFactory)
    {
        _meter = meterFactory.Create("MetricsDemo.RateLimit");

        _requestsAllowed = _meter.CreateCounter<long>(
            name: "ratelimit.requests.allowed",
            unit: "{requests}",
            description: "Number of requests allowed through rate limiting");

        _requestsRejected = _meter.CreateCounter<long>(
            name: "ratelimit.requests.rejected",
            unit: "{requests}",
            description: "Number of requests rejected by rate limiting");

        _clientRequestRate = _meter.CreateHistogram<int>(
            name: "ratelimit.client.rate",
            unit: "{requests}/s",
            description: "Distribution of per-client request rates");
    }

    public void RecordRequestAllowed(string clientId, int currentRate)
    {
        _requestsAllowed.Add(1,
            new KeyValuePair<string, object?>("client.id", clientId));
        _clientRequestRate.Record(currentRate);
    }

    public void RecordRequestRejected(string clientId, int currentRate)
    {
        _requestsRejected.Add(1,
            new KeyValuePair<string, object?>("client.id", clientId));
        _clientRequestRate.Record(currentRate);
    }
}
```

## Creating Custom Metric Views

Metric views allow you to customize how metrics are aggregated and exported. This is useful for controlling histogram buckets or dropping high-cardinality tags:

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddMeter("MetricsDemo.Orders")
        .AddView(
            instrumentName: "orders.processing.duration",
            new ExplicitBucketHistogramConfiguration
            {
                Boundaries = new double[] { 0, 50, 100, 200, 500, 1000, 2000, 5000 }
            })
        .AddView(
            instrumentName: "orders.value",
            new ExplicitBucketHistogramConfiguration
            {
                Boundaries = new double[] { 0, 10, 50, 100, 500, 1000, 5000 }
            })
        .AddPrometheusExporter());
```

Custom bucket boundaries help you analyze the distribution of values more effectively based on your specific use case.

## Monitoring Runtime Performance

The runtime instrumentation provides valuable insights into .NET performance:

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter());
```

This automatically collects metrics like:

- process.runtime.dotnet.gc.collections.count: Garbage collection frequency
- process.runtime.dotnet.gc.heap.size: Heap memory usage
- process.runtime.dotnet.thread_pool.thread.count: Thread pool utilization
- process.runtime.dotnet.jit.il_bytes.compiled: JIT compilation activity

These metrics help identify memory leaks, thread pool starvation, and other runtime performance issues.

## Implementing Application Metrics Dashboard Data

Create an endpoint that provides custom metrics data for health checks or custom dashboards:

```csharp
[ApiController]
[Route("api/[controller]")]
public class MetricsController : ControllerBase
{
    private static long _totalRequests = 0;
    private static long _successfulRequests = 0;
    private static long _failedRequests = 0;

    public static void RecordRequest(bool success)
    {
        Interlocked.Increment(ref _totalRequests);
        if (success)
            Interlocked.Increment(ref _successfulRequests);
        else
            Interlocked.Increment(ref _failedRequests);
    }

    [HttpGet("summary")]
    public ActionResult<object> GetMetricsSummary()
    {
        var total = Interlocked.Read(ref _totalRequests);
        var success = Interlocked.Read(ref _successfulRequests);
        var failed = Interlocked.Read(ref _failedRequests);

        return Ok(new
        {
            totalRequests = total,
            successfulRequests = success,
            failedRequests = failed,
            successRate = total > 0 ? (double)success / total * 100 : 0
        });
    }
}
```

## Best Practices for Metrics

Following these practices ensures your metrics remain useful and maintainable:

Keep cardinality low on metric tags. High-cardinality tags like user IDs or request IDs can explode your metric storage and make queries slow. Use tags for categorical data like payment method, region, or API endpoint.

Use consistent naming conventions. Follow OpenTelemetry semantic conventions where applicable, and establish patterns for your custom metrics. Use dots for namespacing (orders.processed) and underscores within name components if needed.

Choose appropriate metric types. Don't use a gauge when you need a counter, or vice versa. The metric type affects how the data is aggregated and queried.

Add meaningful descriptions and units. These show up in monitoring UIs and help other engineers understand what they're looking at months later.

## Testing Metrics Collection

Verify your metrics are working correctly by checking the Prometheus endpoint:

```bash
# Make some requests to generate metrics
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "paymentMethod": "credit_card"}'

# Check the Prometheus metrics endpoint
curl http://localhost:5000/metrics
```

You should see your custom metrics in the Prometheus exposition format along with the built-in ASP.NET Core and runtime metrics.

## Conclusion

OpenTelemetry metrics in ASP.NET Core provide a powerful, standardized way to measure application behavior. The System.Diagnostics.Metrics API integrates naturally with .NET, and automatic instrumentation gives you immediate visibility into HTTP performance and runtime behavior.

Start with the built-in instrumentation for ASP.NET Core, HttpClient, and the runtime. Then add custom metrics for business-specific measurements that matter to your application. Use counters for cumulative values, histograms for distributions, and gauges for point-in-time measurements. Keep tag cardinality low, use semantic naming conventions, and always include units and descriptions.

With comprehensive metrics in place, you can set up effective alerts, build informative dashboards, and gain deep insights into how your application behaves in production. Metrics complement logs and traces to give you complete observability across your entire system.
