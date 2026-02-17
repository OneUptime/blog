# How to Enable Telemetry Sampling in Azure Application Insights to Reduce Data Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Telemetry Sampling, Cost Optimization, Data Ingestion, Cloud Monitoring, Observability

Description: Learn how to configure telemetry sampling in Azure Application Insights to significantly reduce data ingestion costs without losing critical visibility.

---

Application Insights is powerful, but it can get expensive quickly. A high-traffic web application can generate millions of telemetry records per day - requests, dependencies, traces, exceptions, custom events. At the pay-as-you-go rate for Log Analytics data ingestion, that adds up. Sampling is the primary mechanism for controlling this cost. It intelligently reduces the volume of telemetry sent to Azure while preserving statistically accurate representations of your data.

This post explains the different sampling types available in Application Insights, how to configure each one, and how to make sure you are not losing the data that matters most.

## What Is Telemetry Sampling?

Sampling means only sending a percentage of your telemetry to Application Insights. Instead of recording every single request and dependency call, you record a representative subset. The key insight is that for high-volume applications, you do not need every data point to understand your system's behavior - statistical sampling gives you the same trends, percentiles, and patterns at a fraction of the cost.

Application Insights preserves related telemetry together. If a request is sampled in, all of its associated dependencies, traces, and exceptions are also kept. If a request is sampled out, all of its related telemetry is also dropped. This means you always see complete transactions, never partial ones.

## Three Types of Sampling

Application Insights supports three types of sampling, and understanding the differences is important because they work at different stages of the telemetry pipeline.

### 1. Adaptive Sampling (Server-Side)

This is the default for ASP.NET and ASP.NET Core applications. It automatically adjusts the sampling rate to keep telemetry volume within a target range. When traffic is low, it sends everything. When traffic spikes, it increases the sampling rate (reduces the percentage sent).

### 2. Fixed-Rate Sampling (Server-Side)

You set a fixed percentage, and that percentage of telemetry is sent. Period. There is no automatic adjustment. This is useful when you want predictable data volumes and predictable costs.

### 3. Ingestion Sampling (Server-Side After Collection)

This happens at the Application Insights service endpoint, after the data leaves your application but before it is stored. It is a safety net - if your application sends too much data, you can configure ingestion sampling to drop a percentage before it counts toward your billing.

The recommended approach is to use adaptive or fixed-rate sampling at the application level. Ingestion sampling should be a last resort because you still pay for the network bandwidth to send the data, even though it gets dropped before storage.

## Configuring Adaptive Sampling in .NET

For ASP.NET Core applications, adaptive sampling is enabled by default when you add Application Insights. You can customize its behavior in `Program.cs`.

```csharp
// Configure adaptive sampling with custom limits
// This sets the max telemetry items per second to 5,
// which the algorithm uses to decide the sampling rate
builder.Services.AddApplicationInsightsTelemetry();
builder.Services.Configure<TelemetryConfiguration>(config =>
{
    var builder = config.DefaultTelemetrySink.TelemetryProcessorChainBuilder;

    // Configure adaptive sampling
    builder.UseAdaptiveSampling(maxTelemetryItemsPerSecond: 5);

    // Exclude certain telemetry types from sampling
    builder.UseAdaptiveSampling(
        maxTelemetryItemsPerSecond: 5,
        excludedTypes: "Event;Exception");

    builder.Build();
});
```

The `maxTelemetryItemsPerSecond` parameter controls the target rate. Lower values mean more aggressive sampling. The `excludedTypes` parameter lets you keep certain telemetry types at 100% - typically you want to exclude exceptions and custom events since those are usually low-volume but high-value.

## Configuring Fixed-Rate Sampling in .NET

If you prefer predictable sampling rates, use fixed-rate sampling instead.

```csharp
// Configure fixed-rate sampling at 25%
// This means roughly 1 in 4 telemetry items will be sent
builder.Services.AddApplicationInsightsTelemetry();
builder.Services.Configure<TelemetryConfiguration>(config =>
{
    var builder = config.DefaultTelemetrySink.TelemetryProcessorChainBuilder;

    builder.UseSampling(25); // 25% sampling rate

    builder.Build();
});
```

A 25% sampling rate means approximately one in four telemetry items is sent. The actual metric counts in Application Insights are automatically adjusted to compensate for sampling, so your charts and queries still show accurate totals.

## Configuring Sampling in Node.js

For Node.js applications using the Application Insights SDK.

```javascript
// Configure sampling for a Node.js application
// Setting percentage to 33 means roughly 1 in 3 items are sent
const appInsights = require("applicationinsights");
appInsights.setup("<connection-string>")
    .setSendLiveMetrics(true)
    .start();

// Set the sampling percentage (33% means send 1 in 3)
appInsights.defaultClient.config.samplingPercentage = 33;
```

## Configuring Sampling for the Java Agent

For Java applications using the Application Insights Java agent, configure sampling in `applicationinsights.json`.

```json
{
  "sampling": {
    "percentage": 25,
    "overrides": [
      {
        "telemetryType": "exception",
        "percentage": 100
      },
      {
        "telemetryType": "request",
        "attributes": [
          {
            "key": "http.url",
            "value": "/health",
            "matchType": "contains"
          }
        ],
        "percentage": 0
      }
    ]
  }
}
```

This configuration sets a baseline 25% sampling rate, keeps all exceptions at 100%, and completely drops health check requests (0%). Health check endpoints generate a lot of noise and are usually not worth monitoring through Application Insights since you have availability tests for that.

## Configuring Ingestion Sampling

If you cannot change the application code, ingestion sampling is your fallback. Configure it in the Azure portal:

1. Go to your Application Insights resource.
2. Click **Usage and estimated costs** in the left menu.
3. Click **Data Sampling**.
4. Set the percentage (e.g., 50% keeps half the data).
5. Click **Apply**.

Remember, ingestion sampling still incurs network costs for the data that gets sent and then dropped. It is better to sample at the source when possible.

## How Sampling Affects Queries

When you query sampled data in Log Analytics, each record has a `itemCount` field that tells you how many original items that record represents. If the sampling rate is 25%, each retained record has an `itemCount` of 4.

When you write KQL queries, use `sum(itemCount)` instead of `count()` to get accurate totals.

```
// Correct way to count requests with sampled data
requests
| where timestamp > ago(1h)
| summarize TotalRequests = sum(itemCount) by bin(timestamp, 5m)
| render timechart
```

Using `count()` would give you the number of sampled records, not the estimated total. For most built-in charts in Application Insights, this adjustment is handled automatically. But for custom KQL queries, you need to account for it yourself.

## What Should Not Be Sampled

Some telemetry types are too important to sample. I recommend excluding:

- **Exceptions** - These are usually low-volume and high-value. You want to see every error.
- **Custom events** - If you are tracking specific business events (like "order placed" or "user signed up"), keep those at 100%.
- **Availability results** - These are already low-volume and critical for uptime monitoring.

In contrast, these are good candidates for aggressive sampling:

- **Requests** - Especially for high-traffic endpoints.
- **Dependencies** - HTTP calls, SQL queries, etc.
- **Traces** - Log messages forwarded to Application Insights.

## Estimating Cost Savings

Before configuring sampling, estimate how much data you are currently ingesting and what your target is.

```
// Check current daily ingestion volume per telemetry type
union requests, dependencies, traces, exceptions, customEvents, pageViews
| where timestamp > ago(1d)
| summarize RecordCount = count(), EstimatedGB = sum(itemCount) * 0.0005 / 1024 by itemType
| order by EstimatedGB desc
```

The `0.0005` is a rough estimate of the average record size in MB. Your actual sizes will vary.

If dependencies account for 80% of your data volume and you apply 25% sampling to them, you cut your total ingestion by roughly 60%. That is a significant cost reduction.

## Verifying Sampling Is Working

After enabling sampling, verify it is active by checking the `itemCount` values in your telemetry.

```
// Verify sampling is active by checking itemCount values
requests
| where timestamp > ago(1h)
| summarize avg(itemCount), min(itemCount), max(itemCount)
```

If `avg(itemCount)` is greater than 1, sampling is active. If it is exactly 1, either sampling is not configured or the data volume is low enough that adaptive sampling has not kicked in yet.

## Wrapping Up

Sampling is the single most effective way to control Application Insights costs. Start with adaptive sampling if you want a hands-off approach that adjusts to your traffic patterns. Switch to fixed-rate sampling if you need predictable data volumes. Exclude exceptions and custom events from sampling since those are your highest-value, lowest-volume telemetry. And always verify that sampling is working by checking the `itemCount` field in your queries. A well-configured sampling strategy can reduce your monitoring costs by 75% or more without any meaningful loss in observability.
