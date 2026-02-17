# How to Track Custom Events and Metrics in Azure Application Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Custom Events, Custom Metrics, Telemetry, Application Monitoring, Observability

Description: A developer-focused guide to tracking custom events and metrics in Azure Application Insights for business and operational telemetry beyond the defaults.

---

The auto-collected telemetry in Application Insights - requests, dependencies, exceptions, page views - covers the operational basics. But what about your business logic? When a user completes a checkout, when a payment fails, when a background job finishes processing a batch, when a feature flag triggers a different code path - those are the signals that tell you whether your application is actually working the way it should. Custom events and metrics let you track exactly what matters to your specific application.

This guide covers how to implement custom event and metric tracking across different languages, best practices for naming and structuring your telemetry, and how to query and alert on custom data.

## Custom Events vs Custom Metrics

Before diving in, let us clarify the difference.

**Custom events** represent discrete occurrences - something happened. "User signed up", "Order placed", "Export completed". Events can carry properties (string key-value pairs) and measurements (numeric values). They are stored in the `customEvents` table.

**Custom metrics** represent numeric measurements - a value at a point in time. "Queue depth is 42", "Cart value is $85.50", "Processing time was 340ms". Metrics are stored in the `customMetrics` table and are optimized for aggregation.

Use events when you want to count occurrences and analyze properties. Use metrics when you want to track numeric values over time and compute aggregations like averages, percentiles, and sums.

## Tracking Custom Events in .NET

Here is how to track a custom event in an ASP.NET Core application.

```csharp
// Inject TelemetryClient via dependency injection
public class OrderController : ControllerBase
{
    private readonly TelemetryClient _telemetry;

    public OrderController(TelemetryClient telemetry)
    {
        _telemetry = telemetry;
    }

    [HttpPost]
    public async Task<IActionResult> PlaceOrder(OrderRequest request)
    {
        var order = await _orderService.CreateOrder(request);

        // Track a custom event with properties and measurements
        _telemetry.TrackEvent("OrderPlaced",
            properties: new Dictionary<string, string>
            {
                { "OrderId", order.Id.ToString() },
                { "PaymentMethod", request.PaymentMethod },
                { "Region", request.ShippingRegion }
            },
            metrics: new Dictionary<string, double>
            {
                { "ItemCount", order.Items.Count },
                { "OrderTotal", (double)order.Total }
            });

        return Ok(order);
    }
}
```

The `properties` dictionary carries string metadata about the event. The `metrics` dictionary carries numeric measurements associated with the event.

## Tracking Custom Metrics in .NET

For standalone numeric measurements, use `TrackMetric` or the `GetMetric` API. The `GetMetric` approach is preferred because it pre-aggregates values locally before sending, which reduces data volume and cost.

```csharp
// Track a custom metric using the pre-aggregation API
// This is more efficient than TrackMetric for high-frequency metrics
public class QueueMonitor
{
    private readonly TelemetryClient _telemetry;

    public QueueMonitor(TelemetryClient telemetry)
    {
        _telemetry = telemetry;
    }

    public void ReportQueueDepth(string queueName, int depth)
    {
        // GetMetric pre-aggregates values and sends them in batches
        _telemetry.GetMetric("QueueDepth", "QueueName")
            .TrackValue(depth, queueName);
    }

    public void ReportProcessingTime(double milliseconds)
    {
        _telemetry.GetMetric("BatchProcessingTimeMs")
            .TrackValue(milliseconds);
    }
}
```

## Tracking in Node.js

```javascript
// Track custom events and metrics in a Node.js application
const appInsights = require("applicationinsights");
appInsights.setup("<connection-string>").start();
const client = appInsights.defaultClient;

// Track a custom event with properties and measurements
function trackOrderPlaced(order) {
    client.trackEvent({
        name: "OrderPlaced",
        properties: {
            orderId: order.id,
            paymentMethod: order.paymentMethod,
            region: order.shippingRegion
        },
        measurements: {
            itemCount: order.items.length,
            orderTotal: order.total
        }
    });
}

// Track a custom metric
function trackQueueDepth(queueName, depth) {
    client.trackMetric({
        name: "QueueDepth",
        value: depth,
        properties: {
            queueName: queueName
        }
    });
}
```

## Tracking in Python

```python
# Track custom telemetry using the OpenCensus Azure exporter
from opencensus.ext.azure import metrics_exporter
from opencensus.stats import aggregation, measure, stats, view

# Create a custom metric for tracking queue depth
queue_depth_measure = measure.MeasureInt(
    "queue_depth",
    "Current depth of the processing queue",
    "items"
)

# Create a view to aggregate the metric
queue_depth_view = view.View(
    "queue_depth_view",
    "Queue depth over time",
    [],
    queue_depth_measure,
    aggregation.LastValueAggregation()
)

# Register the view
stats.stats.view_manager.register_view(queue_depth_view)

# Record a measurement
mmap = stats.stats.stats_recorder.new_measurement_map()
mmap.measure_int_put(queue_depth_measure, 42)
mmap.record()
```

For custom events in Python, use the Application Insights SDK directly.

```python
# Track custom events with the Application Insights SDK
from applicationinsights import TelemetryClient

tc = TelemetryClient("<instrumentation-key>")

# Track a custom event
tc.track_event(
    "OrderPlaced",
    properties={"orderId": "12345", "region": "US-East"},
    measurements={"itemCount": 3, "orderTotal": 85.50}
)

# Make sure to flush before the process exits
tc.flush()
```

## Tracking in Java

For Java applications using the Application Insights SDK.

```java
// Track custom events and metrics in a Java application
import com.microsoft.applicationinsights.TelemetryClient;
import java.util.HashMap;

public class OrderService {
    private final TelemetryClient telemetry = new TelemetryClient();

    public void trackOrderPlaced(Order order) {
        // Build properties map
        HashMap<String, String> properties = new HashMap<>();
        properties.put("orderId", order.getId());
        properties.put("paymentMethod", order.getPaymentMethod());

        // Build measurements map
        HashMap<String, Double> measurements = new HashMap<>();
        measurements.put("itemCount", (double) order.getItems().size());
        measurements.put("orderTotal", order.getTotal());

        // Track the event
        telemetry.trackEvent("OrderPlaced", properties, measurements);
    }
}
```

## Naming Conventions

Consistent naming makes your telemetry queryable and maintainable. Here are some guidelines:

- **Events**: Use PascalCase verb phrases. "OrderPlaced", "UserSignedUp", "PaymentFailed", "ExportCompleted".
- **Metrics**: Use PascalCase with units when helpful. "QueueDepth", "ProcessingTimeMs", "CacheHitRate", "ActiveConnections".
- **Properties**: Use camelCase or PascalCase consistently. "orderId", "paymentMethod", "region".
- **Avoid high-cardinality property values**: Do not use user IDs, session IDs, or timestamps as property values. These blow up your data volume and make aggregation difficult. Use them sparingly and only when you need to drill into specific instances.

## Querying Custom Events

Once events are flowing, query them in Log Analytics.

```
// Count of OrderPlaced events per region over the last 24 hours
customEvents
| where timestamp > ago(24h)
| where name == "OrderPlaced"
| extend region = tostring(customDimensions.Region)
| summarize OrderCount = count(), AvgTotal = avg(todouble(customMeasurements.OrderTotal)) by region
| order by OrderCount desc
```

Properties end up in `customDimensions` and measurements end up in `customMeasurements`. Both are dynamic columns, so you need to use `tostring()` or `todouble()` to extract typed values.

## Querying Custom Metrics

```
// Average queue depth over time in 5-minute buckets
customMetrics
| where timestamp > ago(6h)
| where name == "QueueDepth"
| summarize AvgDepth = avg(value) by bin(timestamp, 5m)
| render timechart
```

## Creating Alerts on Custom Telemetry

You can create alert rules based on custom events and metrics. For example, alert when the error rate for a specific business operation exceeds a threshold.

```
// Alert query: more than 10 payment failures in the last 15 minutes
customEvents
| where timestamp > ago(15m)
| where name == "PaymentFailed"
| summarize FailureCount = count()
| where FailureCount > 10
```

Use this as a custom log search alert in Azure Monitor. Set the evaluation frequency to 5 minutes and the window to 15 minutes.

## Building Dashboards

Custom events and metrics are the foundation for business dashboards. In the Azure portal, create a workbook that shows:

- Orders placed per hour (from `customEvents` where name == "OrderPlaced").
- Average order value trend (from the `OrderTotal` measurement).
- Payment failure rate (from `customEvents` where name == "PaymentFailed" as a percentage of "PaymentAttempted").
- Queue depth over time (from `customMetrics`).

This gives you a view that bridges the gap between operational health and business health.

## Performance Considerations

Custom telemetry is lightweight, but there are a few things to keep in mind:

- **Batch your sends**: The SDK batches telemetry automatically, but if you are in a tight loop tracking thousands of events per second, make sure you are using `GetMetric` for numeric values.
- **Watch your property cardinality**: If a property has millions of unique values, it can slow down queries and increase storage costs. Keep properties to dimensions you actually want to aggregate by.
- **Sampling still applies**: Custom events and metrics are subject to sampling unless you explicitly exclude them. Exclude critical business events from sampling.
- **Flush on exit**: If your application is short-lived (like a batch job or Azure Function), call `Flush()` before the process exits to make sure buffered telemetry gets sent.

## Wrapping Up

The built-in telemetry in Application Insights tells you how your infrastructure is performing. Custom events and metrics tell you how your business is performing. Add event tracking at every important business boundary - user actions, payment flows, background job completions, error conditions. Add metric tracking for any numeric value you want to trend over time. Name things consistently, keep property cardinality in check, and exclude critical events from sampling. The investment in custom telemetry pays for itself the first time you can answer "how many orders did we process today and what was the average value?" without leaving your monitoring dashboard.
