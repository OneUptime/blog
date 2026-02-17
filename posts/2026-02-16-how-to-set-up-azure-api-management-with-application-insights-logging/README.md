# How to Set Up Azure API Management with Application Insights Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Application Insights, Monitoring, Logging, Observability

Description: A practical guide to integrating Azure API Management with Application Insights for request logging, diagnostics, and performance monitoring.

---

Running an API gateway without proper observability is like driving at night without headlights. You know you are moving, but you have no idea what is ahead. Azure API Management has built-in analytics, but for serious production monitoring, you need Application Insights. It gives you end-to-end request tracing, custom metrics, log analytics with KQL, and alerting - all in one place.

In this post, I will walk through the full setup: connecting APIM to Application Insights, configuring what gets logged, querying the data, and setting up alerts that actually help.

## Prerequisites

You need:
- An APIM instance (any tier)
- An Application Insights resource (or you can create one during setup)
- Appropriate Azure RBAC permissions on both resources

## Connecting APIM to Application Insights

Go to your APIM instance in the Azure Portal, navigate to "Application Insights" under the Monitoring section, and click "Add."

Select your existing Application Insights resource (or create a new one). APIM will use the instrumentation key to send telemetry.

After connecting, you need to enable logging for specific APIs. Go to the "APIs" blade, select an API, and click on the "Settings" tab. Under "Diagnostics Logs," you will see the Application Insights section. Enable it and configure:

- **Sampling**: What percentage of requests to log (100% for development, 10-25% for high-traffic production)
- **Verbosity**: Error, Information, or Verbose
- **Log client IP**: Whether to include the caller's IP
- **Request headers**: Which request headers to log
- **Response headers**: Which response headers to log
- **Request body bytes**: How many bytes of the request body to capture (0 to disable)
- **Response body bytes**: How many bytes of the response body to capture (0 to disable)

## Configuring Logging with Policies

For finer control, use the `diagnostic` policy or the `trace` policy to log specific data at specific points in the request pipeline:

```xml
<!-- Log custom data to Application Insights -->
<!-- Captures the subscription name and API version for each request -->
<inbound>
    <base />
    <trace source="api-gateway" severity="information">
        <message>@($"Request received: {context.Request.Method} {context.Request.Url.Path}")</message>
        <metadata name="subscriptionName" value="@(context.Subscription?.Name ?? "anonymous")" />
        <metadata name="apiVersion" value="@(context.Api.Version ?? "unversioned")" />
        <metadata name="clientIp" value="@(context.Request.IpAddress)" />
    </trace>
</inbound>
```

The `trace` policy sends custom trace messages to Application Insights where you can query them alongside the automatic telemetry.

## What Gets Logged Automatically

Once Application Insights is enabled, APIM automatically logs:

- **Request telemetry**: Every API call with method, URL, status code, duration, and headers
- **Dependency telemetry**: Backend calls made by APIM, with target URL, duration, and success/failure
- **Exception telemetry**: Policy errors, backend connection failures, and timeouts
- **Metric telemetry**: Request count, failed requests, and response time aggregations

This data flows into Application Insights within a few minutes (sometimes faster) and is queryable with KQL (Kusto Query Language).

## Querying API Telemetry with KQL

Open your Application Insights resource and go to "Logs." Here are some useful queries.

Find the slowest API operations in the last hour:

```
// Find the top 10 slowest API operations in the last hour
// Groups by operation name and shows average, 95th percentile, and max duration
requests
| where timestamp > ago(1h)
| where cloud_RoleName contains "apim"
| summarize
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    max_duration = max(duration),
    request_count = count()
    by operation_Name
| order by p95_duration desc
| take 10
```

Find failed requests and their error details:

```
// Show all failed API requests with error details
// Includes the status code and any exception messages
requests
| where timestamp > ago(24h)
| where success == false
| project timestamp, operation_Name, resultCode, duration,
    client_IP, customDimensions
| order by timestamp desc
| take 100
```

Analyze request patterns by subscription:

```
// Request counts and error rates per API subscription
// Helps identify which consumers are having issues
requests
| where timestamp > ago(24h)
| extend subscriptionId = tostring(customDimensions["Subscription Name"])
| summarize
    total = count(),
    failures = countif(success == false),
    error_rate = round(100.0 * countif(success == false) / count(), 2),
    avg_duration = round(avg(duration), 2)
    by subscriptionId
| order by total desc
```

Track backend dependency health:

```
// Monitor backend service health
// Shows success rate and latency for each backend
dependencies
| where timestamp > ago(1h)
| summarize
    total = count(),
    success_rate = round(100.0 * countif(success == true) / count(), 2),
    avg_duration = round(avg(duration), 2),
    p95_duration = round(percentile(duration, 95), 2)
    by target
| order by success_rate asc
```

## Setting Up Alerts

Alerts turn your monitoring data into action. Here are the essential alerts for an API gateway.

**High error rate alert**: Triggers when more than 5% of requests fail:

Go to Application Insights, click "Alerts," and create a new alert rule:
- Signal: Custom log search
- Query: `requests | where cloud_RoleName contains "apim" | summarize error_rate = 100.0 * countif(success == false) / count() | where error_rate > 5`
- Frequency: Every 5 minutes
- Window: 15 minutes

**Slow response time alert**: Triggers when the P95 response time exceeds your SLA:

```
// Alert query for slow responses
requests
| where cloud_RoleName contains "apim"
| summarize p95 = percentile(duration, 95)
| where p95 > 2000
```

**Backend failure alert**: Triggers when a specific backend starts failing:

```
// Alert when backend dependency failure rate spikes
dependencies
| where target contains "orders"
| summarize failure_rate = 100.0 * countif(success == false) / count()
| where failure_rate > 10
```

## Sampling Strategies

At high traffic volumes, logging every request to Application Insights gets expensive. Sampling reduces the volume while still giving you statistically valid data.

APIM supports two sampling approaches:

**Fixed-rate sampling**: Log a fixed percentage of requests (e.g., 25%). Configure this in the API's diagnostic settings.

**Adaptive sampling**: Application Insights automatically adjusts the sampling rate based on traffic volume. This is configured in the Application Insights resource itself.

For most APIs, 10-25% sampling gives you enough data for monitoring and troubleshooting while keeping costs manageable. For critical APIs or during incident investigation, temporarily increase to 100%.

## Logging Request and Response Bodies

Be cautious with body logging. It is incredibly useful for debugging but has implications:

1. **Privacy**: Request and response bodies may contain PII or sensitive data. Make sure body logging complies with your data handling policies.
2. **Cost**: Bodies increase the telemetry volume significantly, especially for large payloads.
3. **Performance**: Reading the body for logging buffers it in memory.

A common pattern is to log bodies only for failed requests:

```xml
<!-- Log request and response bodies only for failed requests -->
<!-- This reduces volume while capturing the data you need for debugging -->
<on-error>
    <base />
    <trace source="error-diagnostics" severity="error">
        <message>@($"Error: {context.Response.StatusCode} on {context.Request.Method} {context.Request.Url.Path}")</message>
        <metadata name="requestBody" value="@(context.Request.Body?.As<string>(preserveContent: true) ?? "empty")" />
        <metadata name="responseBody" value="@(context.Response.Body?.As<string>(preserveContent: true) ?? "empty")" />
    </trace>
</on-error>
```

## Correlating Requests End-to-End

APIM automatically generates correlation IDs and passes them to your backend using the W3C Trace Context headers (`traceparent` and `tracestate`). If your backend also reports to Application Insights, you get end-to-end distributed tracing.

The Application Insights "Transaction search" and "Application Map" views show you the complete request flow from client to gateway to backend, with timing for each hop.

Make sure your backend services are configured to:
1. Read the `traceparent` header from incoming requests
2. Use the same Application Insights resource (or use cross-workspace queries)
3. Report dependency calls with the correct correlation context

## Custom Metrics

Beyond the built-in telemetry, you can emit custom metrics from policies:

```xml
<!-- Emit a custom metric tracking payload size -->
<outbound>
    <base />
    <emit-metric name="response-size" namespace="apim-custom">
        <dimension name="api" value="@(context.Api.Name)" />
        <dimension name="operation" value="@(context.Operation.Name)" />
        <value>@(context.Response.Headers.GetValueOrDefault("Content-Length", "0"))</value>
    </emit-metric>
</outbound>
```

Custom metrics can be visualized in Azure Metrics Explorer and used in alert rules, giving you domain-specific monitoring that goes beyond standard HTTP telemetry.

## Summary

Application Insights integration turns APIM from a simple proxy into a fully observable API platform. Connect the two services, configure appropriate logging levels and sampling, write KQL queries for your key metrics, and set up alerts for error rates and latency. The combination of automatic telemetry, custom trace messages, and end-to-end correlation gives you everything you need to operate an API gateway in production with confidence.
