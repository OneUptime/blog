# How to Use Azure Application Insights Live Metrics Stream for Real-Time Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Live Metrics, Real-Time Monitoring, Debugging, Performance Monitoring, Cloud Observability

Description: Learn how to use the Live Metrics Stream in Azure Application Insights for real-time debugging of requests, failures, and performance issues in production.

---

When something goes wrong in production, you want to see what is happening right now - not what happened five minutes ago when the last batch of telemetry was processed. The Live Metrics Stream in Azure Application Insights gives you a real-time feed of requests, failures, dependency calls, and performance counters with about one second of latency. It is one of the most useful tools for diagnosing live issues, and it does not increase your data ingestion costs because the data is streamed directly to your browser without being stored.

This post covers how to enable Live Metrics, how to use it effectively during incidents, and some advanced features like custom filtering that most people do not know about.

## What Live Metrics Shows

When you open the Live Metrics Stream, you see several panels updating in real-time:

- **Request rate** - Incoming requests per second.
- **Request duration** - How long requests are taking.
- **Request failure rate** - Percentage of failed requests.
- **Dependency call rate** - Outgoing dependency calls per second.
- **Dependency duration** - How long dependency calls are taking.
- **Dependency failure rate** - Percentage of failed dependency calls.
- **Exception rate** - Exceptions per second.
- **Server performance counters** - CPU, memory, I/O for your application instances.
- **Sample telemetry** - A live feed of individual request and failure records.

Everything updates in real-time as your application processes traffic.

## Enabling Live Metrics

For most modern Application Insights SDKs, Live Metrics is enabled by default. Here is how to verify and enable it for different platforms.

### .NET (ASP.NET Core)

If you are using `AddApplicationInsightsTelemetry()`, Live Metrics is enabled automatically. To explicitly control it:

```csharp
// Live Metrics is included by default in the Application Insights NuGet package
// You can explicitly enable it like this if needed
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.EnableQuickPulseMetricStream = true; // This is the Live Metrics stream
});
```

The internal name for Live Metrics is "QuickPulse" - you will see this in logs and configuration options.

### Node.js

```javascript
// Enable Live Metrics in a Node.js application
const appInsights = require("applicationinsights");
appInsights.setup("<connection-string>")
    .setSendLiveMetrics(true) // Enable Live Metrics stream
    .start();
```

### Java

For the Java agent, Live Metrics is enabled by default. No additional configuration is needed. If you need to disable it (for security reasons in some environments), you can set it in `applicationinsights.json`:

```json
{
  "preview": {
    "liveMetrics": {
      "enabled": true
    }
  }
}
```

### Python

```python
# Enable Live Metrics with the Azure Monitor OpenTelemetry exporter
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    connection_string="<connection-string>",
    enable_live_metrics=True
)
```

## Opening the Live Metrics Stream

1. Navigate to your Application Insights resource in the Azure portal.
2. Click **Live Metrics** in the left menu under **Investigate**.
3. Wait a moment for the connection to establish.

You should see the real-time charts start updating immediately. If your application is idle, the charts will show flat lines at zero - that is normal.

## Using Live Metrics During an Incident

Here is a practical workflow for using Live Metrics during a production incident.

### Step 1: Open and Observe

Open Live Metrics and get a quick read on the situation. Look at the top-level metrics:

- Is the request rate normal or has it dropped to zero (possible outage)?
- Is the failure rate spiking (application errors)?
- Are dependency durations elevated (downstream service problem)?
- Is CPU or memory maxed out (resource exhaustion)?

These four questions usually tell you which category the problem falls into within seconds.

### Step 2: Check the Sample Telemetry

Scroll down to the sample telemetry feed. This shows individual requests and failures in real-time. Look for:

- Repeated exception types (like `SqlException` or `HttpRequestException`).
- Specific URLs that are failing.
- Common patterns in the error messages.

Click on any item to see its full details, including the distributed trace if available.

### Step 3: Filter the Stream

By default, Live Metrics shows all telemetry. If your application handles thousands of requests per second, the sample feed can be overwhelming. Use the filter button to narrow it down.

Click the **Add filter** button in the sample telemetry section and add conditions like:

- **Response code** equals 500 (show only server errors).
- **URL** contains "/api/orders" (focus on a specific endpoint).
- **Duration** greater than 5000 (show only slow requests).

These filters only affect the sample telemetry view - the aggregate charts at the top still show all traffic.

### Step 4: Compare Across Instances

If you have multiple instances (scaled-out App Service, multiple VMs), the **Servers** panel on the right shows each instance's health. Look for:

- One instance that is unhealthy while others are fine (might be a bad deployment on that instance).
- All instances showing the same problem (system-wide issue, likely a downstream dependency).
- Uneven load distribution (possible load balancer misconfiguration).

## Custom Filters and Projections

Live Metrics supports custom telemetry processors that filter and project data before it reaches the stream. This is useful when you want to focus on specific operations without cluttering the view.

In .NET, you can create a custom telemetry processor.

```csharp
// Custom processor that adds extra properties to Live Metrics telemetry
public class LiveMetricsFilter : ITelemetryProcessor
{
    private ITelemetryProcessor _next;

    public LiveMetricsFilter(ITelemetryProcessor next)
    {
        _next = next;
    }

    public void Process(ITelemetry item)
    {
        // You can modify or filter telemetry here
        // This affects what shows up in the Live Metrics sample feed
        if (item is RequestTelemetry request)
        {
            // Add custom property for filtering in the portal
            request.Properties["Priority"] =
                request.Url.AbsolutePath.Contains("/api/critical") ? "high" : "normal";
        }

        _next.Process(item);
    }
}
```

Register it in your startup configuration.

```csharp
// Register the custom processor in the telemetry pipeline
builder.Services.AddApplicationInsightsTelemetry();
builder.Services.AddApplicationInsightsTelemetryProcessor<LiveMetricsFilter>();
```

## Performance Counters in Live Metrics

The bottom section of Live Metrics shows performance counters. By default, you see:

- **Processor Time** - CPU usage of your application process.
- **Committed Memory** - Memory usage.
- **Request Rate and Duration** - Visualized as real-time charts.
- **Exception Rate** - Errors per second.

You can customize which counters appear by clicking the gear icon and selecting from the available counters. For a web application, I find these particularly useful:

- Thread count (to detect thread pool starvation).
- GC heap size (for .NET applications, to detect memory leaks in real-time).
- Active requests (to see if requests are piling up).

## Live Metrics vs Stored Telemetry

An important distinction: Live Metrics data is not stored. It is streamed in real-time to your browser session and then gone. If you need to go back and analyze what happened during an incident, you will need the stored telemetry in Log Analytics (which has a few minutes of latency).

Think of Live Metrics as your "is the building on fire right now?" tool and Log Analytics as your "what exactly happened and why?" tool. Use them together.

## Security Considerations

Live Metrics uses a secure WebSocket connection between your application and the Azure portal. The connection is authenticated using your Application Insights connection string. However, be aware that:

- Anyone with Reader access to the Application Insights resource can view Live Metrics.
- The sample telemetry may contain sensitive data (URLs with query parameters, exception messages with stack traces).
- In highly regulated environments, you may want to restrict access to the Application Insights resource using Azure RBAC.

If your application runs in an environment that restricts outbound connections, Live Metrics needs access to the following endpoint: `live.applicationinsights.azure.com` on port 443.

## Troubleshooting

**Live Metrics not showing data**: Check that your application is running and processing traffic. Verify the SDK version supports Live Metrics (it has been available since SDK version 2.2 for .NET). Check network connectivity to the Live Metrics endpoint.

**Metrics appear but sample telemetry is empty**: This can happen if sampling is too aggressive. Live Metrics uses its own separate sampling mechanism, but in some edge cases, the SDK-level sampling can interfere. Try reducing your sampling rate temporarily to verify.

**High CPU from Live Metrics**: In rare cases with extremely high-throughput applications, the Live Metrics data collection can add measurable CPU overhead. If this is a concern, you can disable Live Metrics in production and only enable it during debugging sessions.

**Only one server shows data**: Each connected instance appears in the Servers panel. If you have multiple instances but only see one, check that all instances have the same Application Insights configuration.

## Wrapping Up

Live Metrics Stream is the fastest way to understand what your application is doing right now. It has zero storage cost, sub-second latency, and requires minimal setup. Make it the first thing you open when someone reports a production issue. Use the filters to cut through the noise, watch the server panel to identify instance-level problems, and then switch to Log Analytics for deeper investigation once you know what you are looking at. It is one of those features that, once you start using it, you wonder how you ever debugged production issues without it.
