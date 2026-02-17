# How to Troubleshoot Azure Application Insights Missing Telemetry Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Application Insights, Telemetry, Monitoring, Troubleshooting, Observability

Description: Diagnose and fix missing telemetry data in Azure Application Insights including SDK configuration issues, sampling, and ingestion failures.

---

You set up Application Insights, deployed your application, and then... nothing. No requests, no exceptions, no traces. Or maybe some data shows up but it is incomplete - you see requests but no dependencies, or traces appear intermittently. Missing telemetry in Application Insights is a common problem with several possible causes.

This post covers a systematic approach to figuring out why your data is not showing up and how to fix it.

## Check the Basics First

Before diving into complex debugging, verify the fundamentals.

### Is the Instrumentation Key or Connection String Correct?

Application Insights identifies your resource using either an instrumentation key (legacy) or a connection string (recommended). If this value is wrong, your telemetry goes nowhere or to someone else's resource.

```bash
# Get the connection string for your Application Insights resource
az monitor app-insights component show \
  --app my-app-insights \
  --resource-group my-rg \
  --query "connectionString" \
  --output tsv
```

In your application, verify the connection string matches. For a .NET application, check `appsettings.json`:

```json
{
  "ApplicationInsights": {
    "ConnectionString": "InstrumentationKey=xxxx;IngestionEndpoint=https://eastus-1.in.applicationinsights.azure.com/;..."
  }
}
```

For a Node.js application, check the initialization code:

```javascript
// Verify the connection string is being set correctly
const appInsights = require('applicationinsights');

// Check that this value is not empty or undefined
console.log('AI Connection String:', process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .start();
```

### Is the SDK Actually Initialized?

A surprisingly common issue is that the SDK is installed but never initialized, or it is initialized after the application starts handling requests (so early requests are missed).

For .NET applications, make sure `AddApplicationInsightsTelemetry()` is called in your service configuration:

```csharp
// Program.cs - ensure this is called before building the app
var builder = WebApplication.CreateBuilder(args);

// This line must be present to enable Application Insights
builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();
```

For Java applications, verify the Application Insights agent JAR is attached:

```bash
# Check that the Java agent is configured
# The JVM should have this argument
java -javaagent:/path/to/applicationinsights-agent-3.x.x.jar -jar myapp.jar
```

## Telemetry Is Being Sampled

Application Insights uses adaptive sampling by default to reduce telemetry volume and cost. This means not every request, trace, or dependency is sent. If you are looking for a specific request and it is not there, sampling might have dropped it.

### Check If Sampling Is Active

In the Application Insights portal, go to Usage and estimated costs, then click on Data sampling. You can see the current sampling rate.

In your application configuration, check the sampling settings:

```csharp
// .NET - Check and adjust sampling configuration
builder.Services.Configure<TelemetryConfiguration>(config =>
{
    // Check if adaptive sampling is modifying your data
    var samplingProcessor = config.DefaultTelemetrySink.TelemetryProcessors
        .OfType<AdaptiveSamplingTelemetryProcessor>()
        .FirstOrDefault();

    if (samplingProcessor != null)
    {
        // Log the current sampling percentage
        Console.WriteLine($"Sampling at: {samplingProcessor.SamplingPercentageEstimatorSettings}");
    }
});
```

### Disable or Adjust Sampling for Debugging

```csharp
// Temporarily disable sampling to see all telemetry
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    // Set to false to disable adaptive sampling
    options.EnableAdaptiveSampling = false;
});
```

For production, instead of disabling sampling entirely, you can exclude specific telemetry types from sampling:

```csharp
// Keep all exceptions and traces, but sample requests and dependencies
builder.Services.Configure<TelemetryConfiguration>(config =>
{
    var builder = config.DefaultTelemetrySink.TelemetryProcessorChainBuilder;
    builder.UseAdaptiveSampling(excludedTypes: "Exception;Trace");
    builder.Build();
});
```

## Ingestion Issues

Even if your application sends telemetry correctly, it might not make it to Application Insights.

### Check for Ingestion Errors

```bash
# Check if there are any ingestion issues
az monitor app-insights metrics show \
  --app my-app-insights \
  --resource-group my-rg \
  --metrics "exceptions/count" \
  --output table
```

### Network Connectivity

If your application runs in a restricted network (VNet with NSGs, behind a firewall, or in a container with limited egress), it might not be able to reach the Application Insights ingestion endpoint.

The endpoints your application needs to reach:

- `dc.applicationinsights.azure.com` (or regional endpoints like `eastus-1.in.applicationinsights.azure.com`)
- `live.applicationinsights.azure.com` (for Live Metrics)
- `rt.applicationinsights.azure.com` (for profiler and snapshot debugger)

```bash
# Test connectivity from your application's environment
# For a VM or container in Azure
curl -v https://eastus-1.in.applicationinsights.azure.com/

# For AKS pods
kubectl exec <pod-name> -- curl -v https://dc.applicationinsights.azure.com/
```

If your network restricts outbound traffic, add these endpoints to your firewall allow list or use Azure Private Link for Application Insights.

### Daily Cap Hit

Application Insights has a daily data volume cap. Once hit, ingestion stops until the next day. Check your current usage:

In the portal, go to Application Insights, then Usage and estimated costs. Look at the daily cap setting and current daily volume.

```bash
# Check the billing features including daily cap
az monitor app-insights component billing show \
  --app my-app-insights \
  --resource-group my-rg
```

If the daily cap is hit regularly, either increase it or tune your telemetry to reduce volume.

## SDK Version Compatibility

Outdated SDKs can have bugs that cause telemetry loss. Make sure you are running a recent version.

```bash
# For .NET - check the installed SDK version
dotnet list package | grep -i "applicationinsights"

# For Node.js
npm list applicationinsights

# For Python
pip show opencensus-ext-azure
```

Update to the latest stable version:

```bash
# .NET
dotnet add package Microsoft.ApplicationInsights.AspNetCore

# Node.js
npm install applicationinsights@latest

# Python
pip install opencensus-ext-azure --upgrade
```

## Missing Specific Telemetry Types

Sometimes you see requests but not dependencies, or exceptions but not traces. This usually means auto-collection is not configured for that telemetry type.

### Missing Dependency Tracking

Dependency tracking (SQL queries, HTTP calls, Redis calls) requires the appropriate auto-collection modules.

For .NET, dependency tracking is included by default when you call `AddApplicationInsightsTelemetry()`. But some dependency types require additional NuGet packages:

```bash
# For SQL dependency tracking with Entity Framework Core
dotnet add package Microsoft.ApplicationInsights.DependencyCollector
```

For Node.js, make sure auto-collection is enabled:

```javascript
// Enable dependency collection explicitly
appInsights.setup(connectionString)
  .setAutoCollectDependencies(true)  // Must be true
  .start();
```

### Missing Custom Events or Traces

If you are using `TelemetryClient.TrackEvent()` or `TelemetryClient.TrackTrace()` but not seeing the data, make sure you are flushing the telemetry buffer:

```csharp
// TelemetryClient buffers data for batch sending
// In short-lived processes (console apps, Azure Functions),
// you need to flush before the process exits
var telemetryClient = new TelemetryClient(configuration);
telemetryClient.TrackEvent("MyEvent");
telemetryClient.Flush();

// Give the SDK time to transmit
Task.Delay(5000).Wait();
```

## Application Insights for Azure Functions

Azure Functions have their own telemetry pipeline that can conflict with Application Insights SDK. In Azure Functions, Application Insights integration is built in - you should not add the SDK manually.

Set the connection string in the function app settings:

```bash
# Set the Application Insights connection string for a Function App
az functionapp config appsettings set \
  --resource-group my-rg \
  --name my-function-app \
  --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxxx;..."
```

If you install the Application Insights SDK alongside the built-in integration, you can get duplicate telemetry or, worse, interference that causes missing data.

## Workspace-Based vs Classic Resources

Classic Application Insights resources (not backed by a Log Analytics workspace) are being deprecated. If you are using a classic resource, telemetry ingestion might be affected.

```bash
# Check if your resource is workspace-based
az monitor app-insights component show \
  --app my-app-insights \
  --resource-group my-rg \
  --query "workspaceResourceId"
```

If the workspace resource ID is null, you are on a classic resource. Migrate to a workspace-based resource:

```bash
# Migrate to workspace-based Application Insights
az monitor app-insights component update \
  --app my-app-insights \
  --resource-group my-rg \
  --workspace "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace"
```

## Using the Diagnostic Tools

Application Insights has built-in diagnostic tools that can help identify issues:

- **Live Metrics Stream**: Shows real-time telemetry. If you see data here but not in the portal queries, the issue is with ingestion or retention, not the SDK.
- **Search**: Use the Transaction Search to find specific telemetry items.
- **Failures**: The Failures blade aggregates exceptions and failed requests.

Also check the SDK's internal diagnostic logs. For .NET, enable self-diagnostics:

```xml
<!-- Add to your applicationinsights.config or enable in code -->
<TelemetryModules>
  <Add Type="Microsoft.ApplicationInsights.Extensibility.Implementation.Tracing.DiagnosticsTelemetryModule, Microsoft.ApplicationInsights"/>
</TelemetryModules>
```

Missing telemetry is rarely a mystery once you follow a systematic approach. Check the connection string, verify SDK initialization, look at sampling, test network connectivity, and review the SDK version. Most issues fall into one of these categories, and the fix is usually a configuration change rather than a code rewrite.
