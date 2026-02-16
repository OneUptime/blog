# How to Use Azure Application Insights to Monitor Azure Functions Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Azure Functions, Serverless, Performance Monitoring, Azure Monitor, APM, Observability

Description: Practical guide to monitoring Azure Functions with Application Insights, covering performance tracking, dependency monitoring, and custom telemetry for serverless workloads.

---

Azure Functions are great for event-driven workloads, but monitoring them comes with unique challenges. Functions are ephemeral - they spin up, process an event, and disappear. There is no long-running server to SSH into. Cold start latency varies. Execution counts can spike from zero to thousands in seconds. You need monitoring that understands this serverless execution model.

Application Insights integrates natively with Azure Functions and provides exactly the kind of monitoring you need: execution tracking, dependency monitoring, failure detection, and performance analytics - all designed to work with the function invocation model rather than the traditional server model.

## How Application Insights Works with Azure Functions

When you connect Application Insights to a Function App, the Functions runtime automatically sends telemetry for every invocation. Each function execution generates a request telemetry item that includes:

- Function name
- Trigger type (HTTP, timer, queue, etc.)
- Execution duration
- Success or failure status
- Any dependencies called during execution

This happens without adding any code to your functions. The runtime handles it through built-in integration.

## Step 1: Connect Application Insights to Your Function App

If you created your Function App through the Azure Portal, Application Insights was likely configured during creation. If not, connect it now.

```bash
# Create an Application Insights resource and connect it to a Function App
az monitor app-insights component create \
  --app my-functions-insights \
  --location eastus \
  --resource-group myRG \
  --workspace /subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace

# Get the connection string
CONNECTION_STRING=$(az monitor app-insights component show \
  --app my-functions-insights \
  --resource-group myRG \
  --query connectionString -o tsv)

# Set it on the Function App
az functionapp config appsettings set \
  --name myFunctionApp \
  --resource-group myRG \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING=$CONNECTION_STRING
```

The `APPLICATIONINSIGHTS_CONNECTION_STRING` setting is the key. The Functions runtime checks for this setting at startup and configures telemetry collection automatically.

## Step 2: Monitor Function Execution Performance

Once connected, go to Application Insights > Performance to see your function execution metrics.

The Performance blade shows:

- **Average duration** per function
- **Request count** per function
- **Failed request percentage**
- **Duration distribution** (P50, P95, P99)

For HTTP-triggered functions, you see the data broken down by operation name (the function name plus the HTTP method). For other trigger types, the operation name is the function name.

You can write KQL queries for more detailed analysis:

```kql
// Analyze function execution performance by trigger type
requests
| where timestamp > ago(24h)
| where cloud_RoleName == "myFunctionApp"
| extend TriggerType = case(
    name contains "Http", "HTTP",
    name contains "Timer", "Timer",
    name contains "Queue", "Queue",
    name contains "Blob", "Blob",
    "Other"
)
| summarize
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95),
    Executions = count(),
    FailureRate = round(100.0 * countif(success == false) / count(), 2)
    by TriggerType, bin(timestamp, 1h)
| order by timestamp desc
```

## Step 3: Track Cold Start Latency

Cold starts are one of the biggest performance concerns with Azure Functions. A cold start happens when Azure needs to allocate a new instance for your function - loading the runtime, your code, and dependencies.

You can measure cold starts by looking at the gap between function invocations:

```kql
// Identify potential cold starts by looking at execution patterns
requests
| where timestamp > ago(6h)
| where cloud_RoleName == "myFunctionApp"
| order by timestamp asc
| extend PreviousTimestamp = prev(timestamp)
| extend GapSeconds = datetime_diff('second', timestamp, PreviousTimestamp)
| where GapSeconds > 300  // More than 5 minutes since last execution
| project timestamp, name, duration, GapSeconds
| where duration > 2000  // Slow executions after a gap are likely cold starts
| order by duration desc
```

To reduce cold starts:

- Use the Premium plan or Dedicated plan instead of the Consumption plan
- Keep functions warm with a timer-triggered ping function
- Minimize dependencies and startup initialization
- Use the `WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT` setting to control instance count

## Step 4: Monitor Dependencies

Functions often call external services - databases, APIs, storage accounts, message queues. Application Insights tracks these automatically.

Check the Application Map (Application Insights > Application Map) to see your Function App and all its dependencies. The map shows average latency and failure rates for each dependency.

For deeper analysis:

```kql
// Find the slowest dependencies called by your functions
dependencies
| where timestamp > ago(1h)
| where cloud_RoleName == "myFunctionApp"
| summarize
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95),
    CallCount = count(),
    FailureCount = countif(success == false)
    by target, type, name
| where CallCount > 5
| order by P95Duration desc
```

## Step 5: Add Custom Telemetry

For business-specific monitoring, add custom telemetry to your functions.

For C# functions:

```csharp
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class OrderProcessor
{
    private readonly TelemetryClient _telemetryClient;
    private readonly ILogger<OrderProcessor> _logger;

    // Inject TelemetryClient through dependency injection
    public OrderProcessor(TelemetryClient telemetryClient, ILogger<OrderProcessor> logger)
    {
        _telemetryClient = telemetryClient;
        _logger = logger;
    }

    [Function("ProcessOrder")]
    public async Task Run(
        [QueueTrigger("orders")] OrderMessage message)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        _logger.LogInformation("Processing order {OrderId}", message.OrderId);

        // Process the order
        var result = await ProcessOrderAsync(message);

        stopwatch.Stop();

        // Track custom event with business metrics
        _telemetryClient.TrackEvent("OrderProcessed", new Dictionary<string, string>
        {
            { "orderId", message.OrderId },
            { "status", result.Status }
        }, new Dictionary<string, double>
        {
            { "processingTimeMs", stopwatch.ElapsedMilliseconds },
            { "orderTotal", message.Total }
        });

        // Track custom metric for monitoring dashboards
        _telemetryClient.TrackMetric("OrderProcessingTime", stopwatch.ElapsedMilliseconds);
    }
}
```

For JavaScript/Node.js functions:

```javascript
const appInsights = require('applicationinsights');

// The Functions runtime initializes Application Insights automatically
// Access the default client for custom telemetry
module.exports = async function (context, queueMessage) {
    const client = appInsights.defaultClient;
    const startTime = Date.now();

    context.log('Processing order:', queueMessage.orderId);

    try {
        const result = await processOrder(queueMessage);

        // Track custom event
        client.trackEvent({
            name: 'OrderProcessed',
            properties: {
                orderId: queueMessage.orderId,
                status: 'success'
            },
            measurements: {
                processingTimeMs: Date.now() - startTime,
                orderTotal: queueMessage.total
            }
        });

        return result;
    } catch (error) {
        // Track the failure with context
        client.trackException({
            exception: error,
            properties: {
                orderId: queueMessage.orderId,
                functionName: 'ProcessOrder'
            }
        });
        throw error;
    }
};
```

## Step 6: Configure Sampling

High-throughput functions can generate a lot of telemetry. Configure sampling in your host.json:

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "excludedTypes": "Exception"
      },
      "enableLiveMetrics": true,
      "httpAutoCollectionOptions": {
        "enableHttpTriggerExtendedInfoCollection": true,
        "enableW3CDistributedTracing": true,
        "enableResponseHeaderInjection": true
      }
    },
    "logLevel": {
      "default": "Information",
      "Host.Results": "Information",
      "Function": "Information",
      "Host.Aggregator": "Information"
    }
  }
}
```

The `maxTelemetryItemsPerSecond` setting caps the telemetry rate using adaptive sampling. When traffic exceeds this rate, the runtime starts sampling. Setting `excludedTypes` to "Exception" ensures all exceptions are always captured regardless of sampling.

## Step 7: Set Up Alerts for Function Failures

Create alerts that notify you when functions start failing:

```kql
// Alert query: detect functions with high failure rates
requests
| where timestamp > ago(15m)
| where cloud_RoleName == "myFunctionApp"
| summarize
    TotalExecutions = count(),
    Failures = countif(success == false),
    FailureRate = round(100.0 * countif(success == false) / count(), 2)
    by name
| where FailureRate > 10 and TotalExecutions > 5
```

Also set up alerts for execution duration spikes:

```kql
// Alert when function execution time exceeds normal levels
requests
| where timestamp > ago(15m)
| where cloud_RoleName == "myFunctionApp"
| summarize P95Duration = percentile(duration, 95) by name
| where P95Duration > 30000  // P95 above 30 seconds
```

## Step 8: Use Live Metrics During Debugging

Live Metrics (Application Insights > Live Metrics) shows real-time telemetry from your Function App. This is invaluable when:

- Deploying a new version and watching for immediate failures
- Debugging a function that fails intermittently
- Load testing and watching performance in real-time

Live Metrics shows incoming request rates, failure rates, dependency call rates, and resource utilization - all updating in real-time with no delay.

## Monitoring Durable Functions

If you use Durable Functions for orchestrations, Application Insights tracks the orchestration lifecycle:

- Orchestrator start and completion
- Activity function invocations
- Sub-orchestration calls
- Timer events

Query the orchestration history:

```kql
// Track Durable Functions orchestration performance
requests
| where timestamp > ago(24h)
| where name startswith "Orchestrator_"
| summarize
    AvgDuration = avg(duration),
    Completions = countif(success == true),
    Failures = countif(success == false)
    by name
| order by AvgDuration desc
```

## Common Issues

**High log volume**: Functions log every invocation by default. For high-throughput functions, this generates a lot of data. Use the sampling settings in host.json to control volume.

**Missing dependencies**: Some SDK-based dependencies might not be auto-tracked. Use the TelemetryClient to manually track important calls.

**Execution context missing**: If you see telemetry without the function name, ensure the Functions runtime version matches the Application Insights SDK version.

## Summary

Application Insights gives you comprehensive monitoring for Azure Functions without significant code changes. The built-in integration captures execution metrics, dependencies, and failures automatically. Add custom telemetry for business-specific monitoring, configure sampling for cost control, and set up alerts for failure detection. For serverless workloads where you cannot look at server logs, Application Insights becomes your primary window into what your code is doing.
