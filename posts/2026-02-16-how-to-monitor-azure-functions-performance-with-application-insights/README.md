# How to Monitor Azure Functions Performance with Application Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Function, Application Insights, Monitoring, Performance, Observability, Azure, Telemetry

Description: Set up comprehensive monitoring for Azure Functions using Application Insights with custom metrics, dependency tracking, and performance dashboards.

---

You cannot improve what you cannot measure. Azure Functions are easy to deploy but surprisingly hard to monitor if you do not set up proper observability from the start. Application Insights is the default monitoring solution for Azure Functions, and when configured correctly, it gives you deep visibility into execution times, failure rates, dependency calls, custom metrics, and end-to-end transaction tracing.

In this post, I will show you how to set up Application Insights properly, add custom telemetry to your functions, build useful queries, and set up alerts that actually catch problems before your users do.

## Enabling Application Insights

Most Azure Function apps created through the portal or CLI already have Application Insights enabled. But it is worth verifying and making sure it is configured correctly.

```bash
# Check if Application Insights is connected to your function app

az functionapp config appsettings list \
  --name my-function-app \
  --resource-group my-resource-group \
  --query "[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING'].value" -o tsv

# If not set, create an Application Insights resource and connect it
az monitor app-insights component create \
  --app func-insights \
  --location eastus2 \
  --resource-group my-resource-group \
  --kind web

# Get the connection string
CONNECTION_STRING=$(az monitor app-insights component show \
  --app func-insights \
  --resource-group my-resource-group \
  --query connectionString -o tsv)

# Set it on the function app
az functionapp config appsettings set \
  --name my-function-app \
  --resource-group my-resource-group \
  --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=$CONNECTION_STRING"
```

## Configuring the SDK in Your Function App

For the isolated worker model, install the `Microsoft.ApplicationInsights.WorkerService` and `Microsoft.Azure.Functions.Worker.ApplicationInsights` packages, then explicitly register the Application Insights services.

```csharp
// Program.cs - Register Application Insights with proper configuration
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.ApplicationInsights;
using Microsoft.ApplicationInsights.WorkerService;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.ApplicationInsights;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(services =>
    {
        // Register Application Insights telemetry
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .ConfigureLogging(logging =>
    {
        // The Application Insights worker SDK adds a default Warning+ filter.
        // Override it if you want Information logs in Application Insights.
        logging.Services.Configure<LoggerFilterOptions>(options =>
        {
            var aiRule = options.Rules.FirstOrDefault(rule =>
                rule.ProviderName == typeof(ApplicationInsightsLoggerProvider).FullName);

            if (aiRule is not null)
            {
                options.Rules.Remove(aiRule);
            }
        });

        // Set default log level - Information is a good balance
        logging.SetMinimumLevel(LogLevel.Information);

        // Reduce noise from the Azure Functions host
        logging.AddFilter("Microsoft.Azure.Functions", LogLevel.Warning);
        logging.AddFilter("Azure.Core", LogLevel.Warning);

        // Keep your application logs at Information level
        logging.AddFilter("MyFunctionApp", LogLevel.Information);
    })
    .Build();

host.Run();
```

Also configure sampling in `host.json` to control costs. Without sampling, high-traffic functions can generate a massive amount of telemetry data.

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "excludedTypes": "Request;Exception"
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
      "Host.Results": "Error",
      "Host.Aggregator": "Trace",
      "Function": "Information"
    }
  }
}
```

Notice that I excluded `Request` and `Exception` types from sampling. You always want 100% of your requests and exceptions captured - sampling those can cause you to miss important failures.

## Adding Custom Telemetry

The built-in telemetry captures request counts, durations, and failures automatically. For deeper insight, add custom telemetry.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.Extensions.Logging;

public class OrderProcessor
{
    private readonly ILogger<OrderProcessor> _logger;
    private readonly TelemetryClient _telemetry;
    private readonly IPaymentClient _paymentClient;

    public OrderProcessor(
        ILogger<OrderProcessor> logger,
        TelemetryClient telemetry,
        IPaymentClient paymentClient)
    {
        _logger = logger;
        _telemetry = telemetry;
        _paymentClient = paymentClient;
    }

    [Function("ProcessOrder")]
    public async Task Run([QueueTrigger("orders")] Order order)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Track a custom event with properties
            _telemetry.TrackEvent("OrderProcessingStarted", new Dictionary<string, string>
            {
                ["OrderId"] = order.Id,
                ["CustomerId"] = order.CustomerId,
                ["ItemCount"] = order.Items.Count.ToString()
            });

            // Process the order
            await ValidateOrder(order);
            await ChargePayment(order);
            await FulfillOrder(order);

            stopwatch.Stop();

            // Track custom metrics for business KPIs
            _telemetry.TrackMetric("OrderProcessingDuration",
                stopwatch.Elapsed.TotalMilliseconds);
            _telemetry.TrackMetric("OrderValue", (double)order.TotalAmount);
            _telemetry.TrackMetric("OrderItemCount", order.Items.Count);

            _telemetry.TrackEvent("OrderProcessingCompleted", new Dictionary<string, string>
            {
                ["OrderId"] = order.Id,
                ["DurationMs"] = stopwatch.ElapsedMilliseconds.ToString()
            });
        }
        catch (PaymentException ex)
        {
            // Track the failure with context
            _telemetry.TrackException(ex, new Dictionary<string, string>
            {
                ["OrderId"] = order.Id,
                ["PaymentMethod"] = order.PaymentMethod,
                ["Amount"] = order.TotalAmount.ToString()
            });
            throw;
        }
    }

    private async Task ChargePayment(Order order)
    {
        // Track dependency calls manually for services that are not auto-tracked
        using var operation = _telemetry.StartOperation<DependencyTelemetry>("PaymentGateway");
        operation.Telemetry.Type = "HTTP";
        operation.Telemetry.Target = "payments.example.com";

        try
        {
            // Call the payment gateway
            await _paymentClient.ChargeAsync(order);
            operation.Telemetry.Success = true;
        }
        catch
        {
            operation.Telemetry.Success = false;
            throw;
        }
    }

    private Task ValidateOrder(Order order) => Task.CompletedTask;

    private Task FulfillOrder(Order order) => Task.CompletedTask;
}
```

## Useful KQL Queries

Application Insights uses Kusto Query Language (KQL) for querying telemetry data. Here are the queries I find most useful for monitoring Azure Functions.

### Function Execution Summary

```kusto
// Overview of all functions: execution count, failure rate, average duration
requests
| where timestamp > ago(24h)
| summarize
    TotalExecutions = count(),
    FailedExecutions = countif(success == false),
    AvgDurationMs = avg(duration),
    P95DurationMs = percentile(duration, 95),
    P99DurationMs = percentile(duration, 99)
    by name
| extend FailureRate = round(100.0 * FailedExecutions / TotalExecutions, 2)
| order by TotalExecutions desc
```

### Slow Executions Investigation

```kusto
// Find the slowest function executions in the last hour
requests
| where timestamp > ago(1h)
| where duration > 5000  // Longer than 5 seconds
| project timestamp, name, duration, success, resultCode,
    operation_Id, customDimensions
| order by duration desc
| take 50
```

### Dependency Performance

```kusto
// Track performance of external dependencies (databases, APIs, etc.)
dependencies
| where timestamp > ago(1h)
| summarize
    CallCount = count(),
    AvgDuration = avg(duration),
    FailureCount = countif(success == false),
    P95Duration = percentile(duration, 95)
    by target, type, name
| order by AvgDuration desc
```

### Error Analysis

```kusto
// Group exceptions by type and message to find patterns
exceptions
| where timestamp > ago(24h)
| summarize Count = count() by type, outerMessage
| order by Count desc
| take 20
```

### End-to-End Transaction Tracing

```kusto
// Trace a specific request through all its dependencies
let operationId = "abc123";  // Replace with actual operation ID
union requests, dependencies, traces, exceptions
| where operation_Id == operationId
| project timestamp, itemType, name, duration, success, message,
    type, outerMessage
| order by timestamp asc
```

## Setting Up Alerts

Alerts notify you when something goes wrong before users start complaining. Here are the most important alerts to configure.

```bash
# Alert when failed requests exceed 5 in a 15-minute window
az monitor metrics alert create \
  --name "High-Failed-Request-Count" \
  --resource-group my-resource-group \
  --scopes "/subscriptions/<SUB>/resourceGroups/<RG>/providers/microsoft.insights/components/func-insights" \
  --condition "count requests/failed > 5" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 2 \
  --action-group my-team-alerts \
  --description "Function failed request count exceeded 5 in 15 minutes"

# Alert when average response time exceeds 3 seconds
az monitor metrics alert create \
  --name "Slow-Response-Time" \
  --resource-group my-resource-group \
  --scopes "/subscriptions/<SUB>/resourceGroups/<RG>/providers/microsoft.insights/components/func-insights" \
  --condition "avg requests/duration > 3000" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 3 \
  --action-group my-team-alerts \
  --description "Average function duration exceeded 3 seconds"
```

## Live Metrics

Application Insights Live Metrics gives you a real-time view of your function app's health. It shows incoming requests, failures, and dependency calls as they happen. This is extremely useful during deployments or when investigating live incidents.

Enable it in your `host.json` with `"enableLiveMetrics": true` (shown in the configuration section above), then navigate to your Application Insights resource in the Azure portal and click "Live Metrics."

## Cost Management

Application Insights charges based on data ingestion volume. A high-traffic function app can generate gigabytes of telemetry per day. Here are tips to manage costs:

- Enable sampling to reduce volume while maintaining statistical accuracy
- Set appropriate log levels (avoid Debug or Trace in production)
- Exclude verbose telemetry types from full capture
- Set a daily cap on data ingestion in the Application Insights settings
- Use workspace-based Application Insights with a Log Analytics workspace for better cost controls

## Summary

Application Insights is essential for operating Azure Functions in production. Configure it properly from day one with appropriate sampling, add custom telemetry for business-specific metrics, build dashboards with KQL queries for the metrics that matter to your team, and set up alerts for failure rates and performance degradation. The investment in observability pays for itself the first time you diagnose a production issue in minutes instead of hours.
