# How to Troubleshoot High CPU and Memory Usage on Azure App Service Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Troubleshooting, CPU, Memory, Performance, Monitoring

Description: A practical guide to diagnosing and resolving high CPU and memory usage issues on Azure App Service Plans with real debugging techniques.

---

When your Azure App Service starts consuming excessive CPU or memory, you will typically see slow response times, request timeouts, and unhappy users. The tricky part is figuring out why the resource consumption spiked. Is it your application code? A memory leak? A misconfigured service plan? External dependency timeouts?

In this post, I will walk through a systematic approach to diagnosing and fixing high CPU and memory issues on Azure App Service Plans.

## Identifying the Problem

Before you start digging, you need to confirm the problem and understand its scope. Head to the Azure portal, navigate to your App Service, and open the **Metrics** blade. Select the CPU Percentage and Memory Percentage metrics, and look at the last few hours.

Pay attention to these patterns:

- **Sudden spike** - usually caused by a burst of traffic or a specific code path being triggered
- **Gradual increase that never drops** - classic sign of a memory leak
- **Consistently high (80%+)** - your app may simply be undersized for its workload
- **Sawtooth pattern** - the app periodically climbs in resource usage and then drops after a restart

Each pattern points to a different root cause, so identifying the shape of the problem helps narrow your investigation.

## Using App Service Diagnostics

Azure provides a built-in diagnostics tool that runs automated checks on your App Service. Go to your App Service in the portal and click **Diagnose and solve problems**. Then search for "High CPU" or "High Memory."

The diagnostics tool will show you:

- Historical CPU and memory usage per instance
- Which worker processes are consuming the most resources
- Whether the issue correlates with deployment events
- Recommendations specific to your situation

This is the fastest way to get initial insights without connecting any external tools.

## Profiling CPU Usage with App Service Diagnostics

For CPU issues specifically, you want to capture a CPU profile to see which methods in your application are consuming the most processing time.

In the **Diagnose and solve problems** blade, look for **Diagnostic Tools** and then **Collect .NET Profiler Trace** (for .NET apps) or **Auto-Heal** for other runtimes.

For .NET applications, here is how to enable Application Insights Profiler, which continuously samples your application:

```csharp
// In your Startup.cs or Program.cs
// Enable Application Insights with profiling
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    options.EnableAdaptiveSampling = true;
});

// Enable the profiler for CPU analysis
builder.Services.AddServiceProfiler();
```

Once enabled, go to Application Insights, select **Performance**, and click on any slow operation. You will see a flame chart showing exactly where CPU time is spent.

## Diagnosing Memory Issues

Memory problems are harder to debug because they are often gradual. A small memory leak might take days to become a problem. Here is how to investigate.

### Check Memory Working Set

The memory metric in the Azure portal shows the overall memory percentage for your App Service Plan. But you need to drill deeper. Use the **Process Explorer** in the portal (under Advanced Tools / Kudu) to see individual process memory consumption.

Navigate to `https://yourapp.scm.azurewebsites.net/ProcessExplorer` and check:

- **Private bytes** - memory allocated exclusively to your process
- **Working set** - physical memory currently in use
- **Handles** - if handle count keeps growing, you have a resource leak

### Capture a Memory Dump

For persistent memory issues, capture a memory dump and analyze it with a debugger. You can do this from Kudu:

```bash
# SSH into your App Service via Kudu console
# Find the process ID of your app
ps aux | grep dotnet

# Generate a memory dump using createdump
# The -f flag specifies the output file path
createdump -f /home/LogFiles/dump.dmp <PID>
```

Download the dump file and analyze it with Visual Studio, WinDbg, or dotnet-dump. Look for objects that are consuming the most memory and check if their count is growing unexpectedly.

## Common Causes and Fixes

Let me walk through the most frequent root causes I have encountered.

### 1. Synchronous Blocking Calls

This is the most common cause of high CPU on ASP.NET applications. When you call `.Result` or `.Wait()` on async operations, you block a thread pool thread. Under load, this causes thread pool starvation, which makes the CPU spike as the runtime tries to create more threads.

The fix is straightforward - make your code properly async:

```csharp
// Bad - blocks a thread and causes CPU spikes under load
public ActionResult GetData()
{
    var result = _httpClient.GetAsync("https://api.example.com/data").Result;
    return Ok(result);
}

// Good - properly async, releases the thread while waiting
public async Task<ActionResult> GetData()
{
    var result = await _httpClient.GetAsync("https://api.example.com/data");
    return Ok(result);
}
```

### 2. Missing HttpClient Disposal or Socket Exhaustion

Creating a new `HttpClient` for every request leads to socket exhaustion, which indirectly causes high CPU due to connection management overhead.

```csharp
// Bad - creates a new HttpClient per request
public async Task<string> FetchData()
{
    using var client = new HttpClient();
    return await client.GetStringAsync("https://api.example.com/data");
}

// Good - use IHttpClientFactory for proper connection pooling
// Register in DI container
builder.Services.AddHttpClient("ExternalApi", client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
    client.Timeout = TimeSpan.FromSeconds(30);
});
```

### 3. Unbounded In-Memory Caching

Applications that cache data in memory without size limits will eventually consume all available memory. Use bounded caching instead:

```csharp
// Configure bounded memory cache
// SizeLimit prevents unbounded growth
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 1024; // maximum number of cache entries
});

// When adding items, specify their size
_cache.Set("key", data, new MemoryCacheEntryOptions
{
    Size = 1,                                    // size relative to limit
    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
    SlidingExpiration = TimeSpan.FromMinutes(10)  // evict if not accessed
});
```

### 4. Unoptimized Database Queries

Queries that return large result sets or perform table scans consume both CPU and memory. Check your Application Insights dependency tracking to find slow database queries.

```sql
-- Check for missing indexes on your Azure SQL database
-- This query finds the top missing indexes by estimated improvement
SELECT TOP 10
    CONVERT(DECIMAL(18,2), migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans)) AS improvement_measure,
    mid.statement AS table_name,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns
FROM sys.dm_db_missing_index_groups mig
JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
ORDER BY improvement_measure DESC;
```

### 5. Wrong App Service Plan Tier

Sometimes the application is simply running on a tier that does not provide enough resources. Check your current plan and compare it to your workload:

```bash
# Check the current App Service Plan details
az appservice plan show \
  --name myAppServicePlan \
  --resource-group myResourceGroup \
  --query "{sku: sku.name, workers: sku.capacity, tier: sku.tier}"
```

If you are on a Basic (B1) plan running a production workload, that is likely part of the problem. Consider scaling up to Standard (S2/S3) or Premium (P1v3/P2v3) plans for production.

## Auto-Healing Configuration

Azure App Service supports auto-healing rules that can automatically restart your app when it hits certain thresholds. This is not a fix, but it prevents extended downtime while you work on the root cause.

```json
{
  "triggers": {
    "privateBytesInKB": 1048576,
    "requests": {
      "count": 100,
      "timeInterval": "00:05:00"
    },
    "slowRequests": {
      "count": 20,
      "timeInterval": "00:05:00",
      "timeTaken": "00:00:30"
    }
  },
  "actions": {
    "actionType": "Recycle",
    "minProcessExecutionTime": "00:10:00"
  }
}
```

This configuration restarts the process if private bytes exceed 1 GB, if there are more than 100 requests in 5 minutes, or if 20 requests take longer than 30 seconds within a 5-minute window.

## Scaling Strategies

If your application genuinely needs more resources, you have two options:

**Scale Up** - move to a larger App Service Plan tier. This gives you more CPU cores and RAM per instance. Best for applications that are single-threaded or cannot easily be distributed.

**Scale Out** - add more instances to your existing plan. This distributes load across multiple servers. Best for stateless web applications that can run behind a load balancer.

```bash
# Scale out to 3 instances with autoscale
az monitor autoscale create \
  --resource-group myResourceGroup \
  --resource myAppServicePlan \
  --resource-type Microsoft.Web/serverfarms \
  --min-count 2 \
  --max-count 10 \
  --count 3

# Add a CPU-based scale rule
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name myAutoscaleRule \
  --scale out 1 \
  --condition "CpuPercentage > 70 avg 5m"
```

## Summary

Troubleshooting high CPU and memory on Azure App Service requires a systematic approach. Start with the built-in diagnostics to identify the pattern, use profiling tools to pinpoint the exact cause, and then apply the appropriate fix. Whether it is making your code properly async, bounding your cache, optimizing queries, or simply scaling to the right tier, the key is to diagnose before you act. Throwing more hardware at the problem without understanding the root cause just delays the inevitable.
