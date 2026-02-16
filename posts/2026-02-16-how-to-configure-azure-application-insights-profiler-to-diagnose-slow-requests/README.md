# How to Configure Azure Application Insights Profiler to Diagnose Slow Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Profiler, Performance Diagnostics, .NET, Slow Requests, APM, Azure Monitor

Description: A practical guide to enabling and using Azure Application Insights Profiler to identify the root cause of slow requests in production applications.

---

You have an application running in Azure and some requests are taking way too long. Your Application Insights dashboard shows P95 latency spikes, but the telemetry only tells you that the request was slow - not why. Was it a database call? A CPU-bound computation? A thread pool starvation issue? A garbage collection pause?

Application Insights Profiler answers these questions by capturing stack traces of your running application during slow requests. It shows you exactly which methods are consuming time, all the way down to the framework and your application code. Think of it as attaching a performance profiler to your production application without the overhead of a full debugging session.

## How the Profiler Works

The Profiler runs as a lightweight agent alongside your application. It periodically samples the call stack of your application's threads - by default, it profiles for 2 minutes every hour. During that sampling window, it captures stack traces at a high frequency (thousands of samples per second) and correlates them with incoming requests.

The result is a flame graph that shows you where your application is spending time. Hot paths light up immediately. You do not need to reproduce the issue locally or attach a debugger.

Supported platforms:

- ASP.NET and ASP.NET Core running on Azure App Service
- Azure Functions (.NET)
- Azure Cloud Services (web and worker roles)
- Azure Service Fabric
- Azure Virtual Machines and VM Scale Sets (with some additional setup)

## Step 1: Enable Profiler on Azure App Service

If your application runs on Azure App Service, enabling the Profiler is straightforward.

In the Azure Portal:

1. Navigate to your App Service
2. Go to Settings > Application Insights
3. Ensure Application Insights is enabled and connected to your resource
4. Click on "Enable Profiler"

Alternatively, enable it from the Application Insights resource:

1. Go to your Application Insights resource
2. Click on Performance in the left menu
3. Click "Configure Profiler" at the top
4. Toggle the Profiler to "On"
5. Click Apply

For programmatic setup, you can enable it through application settings:

```bash
# Enable Application Insights Profiler on an App Service
az webapp config appsettings set \
  --resource-group myRG \
  --name myWebApp \
  --settings APPINSIGHTS_PROFILERFEATURE_VERSION=1.0.0 \
             DiagnosticServices_EXTENSION_VERSION=~3
```

## Step 2: Enable Profiler for ASP.NET Core Applications

If you want more control over the Profiler configuration, you can add it directly to your application code.

First, install the NuGet package:

```bash
# Install the Application Insights Profiler package
dotnet add package Microsoft.ApplicationInsights.Profiler.AspNetCore
```

Then enable it in your application startup:

```csharp
// Program.cs - Enable Application Insights with Profiler
var builder = WebApplication.CreateBuilder(args);

// Add Application Insights telemetry
builder.Services.AddApplicationInsightsTelemetry();

// Enable the Profiler
builder.Services.AddServiceProfiler();

var app = builder.Build();
app.MapControllers();
app.Run();
```

You can customize the profiling behavior in appsettings.json:

```json
{
  "ServiceProfiler": {
    "IsDisabled": false,
    "Duration": "00:02:00",
    "InitialDelay": "00:00:30",
    "CpuTriggerConfiguration": {
      "CpuThreshold": 80,
      "ThresholdCheckDuration": "00:00:15"
    }
  }
}
```

The `CpuTriggerConfiguration` is useful - it tells the Profiler to start capturing when CPU usage exceeds a threshold, which helps catch performance issues that only happen under load.

## Step 3: Trigger Profiling on Demand

The default schedule (2 minutes every hour) might not capture your intermittent slow requests. You can trigger profiling on demand.

In the Application Insights portal:

1. Go to Performance > Profiler
2. Click "Profile Now"
3. Choose the duration (2 minutes is usually sufficient)
4. Click Start

The profiler will run immediately and capture data during the specified window. Time this with your load test or during peak traffic to catch the performance issues you care about.

## Step 4: Read the Profiler Traces

Once the Profiler has captured data, you will find traces in the Performance blade.

1. Go to Application Insights > Performance
2. Select an operation that shows high latency
3. Click on the "Profiler traces" button (it appears when traces are available)
4. Select a trace from the list

The trace viewer shows a flame graph with two views:

- **Hot path**: Highlights the call path that consumed the most time, making it easy to spot the bottleneck
- **Flame graph**: Shows the full call stack hierarchy, with wider bars indicating more time spent

Here is how to interpret what you see:

- **Your application code**: Methods from your namespaces show you where your code is slow
- **Framework code**: Time spent in ASP.NET Core middleware, serialization, etc.
- **I/O waits**: Time spent waiting for external calls (database, HTTP, file I/O)
- **Thread pool waits**: Indicates thread pool starvation - common in async applications that accidentally block threads

## Common Patterns and What They Mean

**Long database calls**: You will see a hot path going through your data access layer into `SqlCommand.ExecuteReader` or similar. The fix is usually query optimization, adding an index, or implementing caching.

**Synchronous over async**: If you see `Task.Wait()` or `.Result` in the hot path, your code is blocking an async call. This leads to thread pool exhaustion under load. The fix is to use `await` consistently.

**JSON serialization overhead**: Large response payloads can cause significant time in `JsonSerializer.Serialize`. Consider pagination, compression, or switching to a faster serializer.

**GC pauses**: If the profiler shows time in garbage collection methods, your application is allocating too many objects. Look at reducing allocations in hot paths - use `Span<T>`, object pooling, or struct-based approaches.

**External HTTP calls**: Time spent in `HttpClient.SendAsync` indicates slow downstream services. Check if you can add caching, increase parallelism, or set appropriate timeouts.

## Step 5: Configure Profiler for VMs and VMSS

For applications running on VMs (not App Service), you need to install the Profiler site extension manually or use the standalone Profiler agent.

For Windows VMs, install the Diagnostics extension with the Profiler sink:

```json
{
  "sink": [
    {
      "name": "ApplicationInsightsProfilerSink",
      "ApplicationInsightsProfiler": {
        "InstrumentationKey": "<your-ikey>",
        "ConnectionString": "<your-connection-string>"
      }
    }
  ]
}
```

For Linux VMs running .NET applications, the NuGet package approach (Step 2) works. Add the `Microsoft.ApplicationInsights.Profiler.AspNetCore` package to your project and deploy normally.

## Step 6: Correlate Profiler Traces with Requests

The real power of the Profiler is correlation. Each profiler trace is linked to specific requests that were processed during the profiling window.

In the Application Insights Transaction Search:

1. Find a slow request
2. Check if a profiler trace exists for that time window
3. Click through to see exactly what your application was doing during that request

This end-to-end correlation means you do not have to guess which slow request the profiler trace corresponds to.

## Reducing Overhead

The Profiler is designed for production use, but it does add some overhead:

- CPU overhead: roughly 2-5% during the profiling window
- Memory overhead: minimal (a few MB for the trace buffer)
- No overhead when profiling is not active

To minimize impact:

- Keep the default schedule (2 minutes per hour) for continuous monitoring
- Use the CPU trigger to profile only during performance issues
- Avoid profiling during critical low-latency operations if the 2-5% overhead matters

## Troubleshooting Profiler Issues

**No traces appearing**: Check that the Profiler is enabled and that your application is receiving traffic during the profiling window. The Profiler needs active requests to capture useful data.

**"Profiler is running but no traces collected"**: This usually means the profiling window completed but no requests were slow enough to be interesting. Lower the threshold or increase traffic during profiling.

**Agent version conflicts**: If you have both the Application Insights SDK and the site extension trying to enable the Profiler, you can get conflicts. Use one approach or the other, not both.

## Summary

Application Insights Profiler removes the guesswork from performance troubleshooting. Instead of adding logging statements and redeploying to narrow down a slow code path, you get production flame graphs that show exactly where time is being spent. Enable it on your most critical services, review the traces when latency spikes occur, and use the patterns described above to guide your optimization efforts.
