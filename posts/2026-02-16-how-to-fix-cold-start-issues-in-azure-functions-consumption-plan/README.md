# How to Fix Cold Start Issues in Azure Functions Consumption Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Cold Start, Serverless, Performance, Azure, Cloud Computing, Optimization

Description: Learn practical techniques to diagnose and fix cold start latency issues in Azure Functions running on the Consumption plan.

---

If you have ever deployed an Azure Function on the Consumption plan and noticed that the first request after a period of inactivity takes several seconds to complete, you have experienced a cold start. This is one of the most common complaints from teams adopting serverless on Azure, and it can be a real problem for latency-sensitive workloads. In this post, I will walk through what causes cold starts, how to measure them, and the concrete steps you can take to reduce or eliminate them.

## What Exactly Is a Cold Start?

When your Azure Function has not been invoked for a while (roughly 20 minutes on the Consumption plan), Azure deallocates the underlying worker instance. The next time a request comes in, the platform has to spin up a new instance, load the runtime, restore your function app, and initialize your code. That entire sequence is the cold start.

The cold start penalty varies depending on the language runtime. .NET functions tend to cold start faster than Java or Python functions because the .NET runtime is more tightly integrated with the Azure Functions host. Python and Java functions can see cold starts of 5 to 10 seconds or more, depending on the number of dependencies.

## Measuring Cold Start Latency

Before you start optimizing, you need to measure. Application Insights gives you the data you need. Here is a KQL query you can run in the Application Insights Logs blade to see cold start durations.

```kusto
// Query to identify cold start requests by looking at gaps between invocations
requests
| where timestamp > ago(7d)
| where cloud_RoleName == "your-function-app-name"
| order by timestamp asc
| extend timeSincePrevious = timestamp - prev(timestamp)
| where timeSincePrevious > 20m or isnull(timeSincePrevious)
| project timestamp, duration, name, timeSincePrevious
| order by duration desc
```

This query finds requests that came in after a gap of 20 minutes or more, which are likely cold starts. The `duration` column tells you how long each one took.

## Strategy 1: Reduce Your Package Size

The single biggest factor in cold start time (after runtime choice) is the size of your deployment package. Azure has to download and extract your function app before it can run. A 500 MB deployment package with hundreds of unused dependencies will cold start much slower than a lean 10 MB package.

For Python functions, audit your `requirements.txt` and remove anything you are not using. Consider using lightweight alternatives - for example, `httpx` instead of `requests` if you only need basic HTTP calls, or skip `pandas` entirely if you are only doing simple data transformations.

For .NET functions, make sure you are publishing in Release mode and consider using ReadyToRun compilation.

```xml
<!-- Add to your .csproj to enable ReadyToRun for faster startup -->
<PropertyGroup>
  <PublishReadyToRun>true</PublishReadyToRun>
  <RuntimeIdentifier>win-x64</RuntimeIdentifier>
</PropertyGroup>
```

For Node.js functions, use a bundler like webpack or esbuild to tree-shake unused code and produce a single output file.

```javascript
// esbuild.config.js - Bundle your function to reduce deployment size
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/functions/*.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist',
  // Exclude Azure Functions SDK as it is provided by the host
  external: ['@azure/functions'],
  minify: true,
}).catch(() => process.exit(1));
```

## Strategy 2: Use the Pre-Warmed Instance Pool

Azure introduced pre-warmed instances for the Consumption plan. When your function app scales down, Azure keeps one instance in a "warmed" state so it can respond to the next request without a full cold start. This is enabled by default on newer function apps, but you should verify it is working by checking the `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING` app setting exists and that your function app is using the latest runtime version.

You can also set the `FUNCTIONS_EXTENSION_VERSION` to `~4` to make sure you are on the latest host version, which has the best pre-warming behavior.

## Strategy 3: Keep Your Functions Warm with a Timer Trigger

The simplest workaround is to prevent your function from going cold in the first place. You can create a lightweight timer trigger that runs every 15 minutes to keep the instance alive.

```csharp
// A simple keep-alive function that runs every 15 minutes
// This prevents the Consumption plan from deallocating your instance
[Function("KeepAlive")]
public void Run([TimerTrigger("0 */15 * * * *")] TimerInfo timerInfo, FunctionContext context)
{
    var logger = context.GetLogger("KeepAlive");
    logger.LogInformation("Keep-alive ping at {time}", DateTime.UtcNow);
}
```

This is not a perfect solution because it adds a small cost (timer triggers are nearly free, but they do count toward your execution quota) and it only keeps one instance warm. If your function needs to scale to multiple instances, the additional instances will still cold start.

## Strategy 4: Optimize Your Initialization Code

Many developers load configuration, establish database connections, or initialize HTTP clients inside each function invocation. This is wasteful. Move expensive initialization to the static constructor or the startup class so it only runs once per instance.

```csharp
// Bad: Creating a new HttpClient on every invocation
[Function("GetData")]
public async Task<HttpResponseData> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequestData req)
{
    // This creates a new client every time - slow and causes socket exhaustion
    var client = new HttpClient();
    var response = await client.GetAsync("https://api.example.com/data");
    // ...
}

// Good: Use dependency injection with a singleton HttpClient
public class GetData
{
    private readonly HttpClient _client;

    // Constructor injection - the client is created once and reused
    public GetData(IHttpClientFactory httpClientFactory)
    {
        _client = httpClientFactory.CreateClient();
    }

    [Function("GetData")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequestData req)
    {
        var response = await _client.GetAsync("https://api.example.com/data");
        // ...
    }
}
```

In Python, you can use module-level variables to cache expensive objects.

```python
import azure.functions as func
import logging
import pyodbc

# Initialize the connection at module level so it persists across invocations
# This avoids re-establishing the connection on every function call
_connection = None

def get_connection():
    global _connection
    if _connection is None:
        _connection = pyodbc.connect(os.environ["SQL_CONNECTION_STRING"])
    return _connection

def main(req: func.HttpRequest) -> func.HttpResponse:
    conn = get_connection()
    # Use the cached connection
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users")
    # ...
```

## Strategy 5: Consider the Premium Plan or Dedicated Plan

If cold starts are genuinely unacceptable for your workload - for example, you are serving user-facing API requests where a 5-second delay on the first call is a dealbreaker - the Consumption plan might not be the right fit. The Premium plan (Elastic Premium) keeps at least one instance always warm and supports VNET integration. You pay more, but cold starts are essentially eliminated.

The Premium plan also supports a minimum instance count, so you can guarantee that a certain number of instances are always ready to handle traffic.

```json
{
  "properties": {
    "minimumElasticInstanceCount": 2,
    "maximumElasticWorkerCount": 10
  }
}
```

## Strategy 6: Use Lazy Loading for Heavy Dependencies

If your function has optional code paths that require heavy libraries, load those libraries only when they are actually needed.

```python
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    action = req.params.get('action')

    if action == 'generate-report':
        # Only import pandas when we actually need it
        # This avoids loading the heavy library on every cold start
        import pandas as pd
        df = pd.read_sql("SELECT * FROM sales", get_connection())
        return func.HttpResponse(df.to_json(), mimetype="application/json")

    # For simple actions, we skip the heavy import entirely
    return func.HttpResponse("OK")
```

## Putting It All Together

Cold starts are an inherent tradeoff of the Consumption plan. You get automatic scaling and pay-per-execution pricing, but you give up guaranteed instant response times. The strategies above - reducing package size, optimizing initialization, keeping instances warm, and lazy loading - can dramatically reduce cold start impact without leaving the Consumption plan. If none of those are sufficient, the Premium plan is the next logical step.

Start by measuring your actual cold start latency with Application Insights. You might find that the numbers are acceptable for your use case. If they are not, apply these techniques in order from simplest to most involved, and re-measure after each change. In my experience, trimming dependencies and fixing initialization patterns alone can cut cold start times by 50% or more.
