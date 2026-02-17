# How to Configure Health Check Endpoints for Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Health Check, Monitoring, Reliability, Load Balancing, Cloud Computing

Description: How to configure and implement health check endpoints for Azure App Service to automatically detect and replace unhealthy instances.

---

When you are running multiple instances of your Azure App Service, one of them might become unhealthy while the others are fine. Maybe it has a stuck process, a memory leak, or a lost connection to the database. Without health checks, Azure keeps sending traffic to that sick instance, and a percentage of your users get errors.

Azure App Service has a built-in health check feature that pings a URL you specify, detects unhealthy instances, and removes them from the load balancer rotation. This post covers how to set it up, what to check in your health endpoint, and how to avoid common mistakes.

## How the Health Check Feature Works

When you enable health checks, Azure pings the specified path on each instance every minute. Here is the logic:

1. Azure sends an HTTP GET request to the health check path on each instance
2. If an instance returns a status code between 200 and 299, it is considered healthy
3. If an instance fails to respond (or returns a non-2xx code) for 10 consecutive checks, it is marked as unhealthy
4. Unhealthy instances are removed from the load balancer rotation (traffic stops being sent to them)
5. Azure continues pinging the unhealthy instance. If it starts returning 200 again, it goes back into rotation
6. If an instance stays unhealthy for one hour, it is replaced with a new instance

This is fundamentally different from a simple uptime check. It works at the instance level and automatically takes corrective action.

## Enabling Health Checks

### Through the Azure Portal

1. Go to your App Service
2. Navigate to "Health check" under Monitoring
3. Enable the feature
4. Enter the path (e.g., `/health`)
5. Click Save

### Through Azure CLI

```bash
# Enable health check with a specific path
az webapp config set \
    --name my-app-service \
    --resource-group my-resource-group \
    --generic-configurations '{"healthCheckPath": "/health"}'
```

### Through ARM Template

```json
{
    "type": "Microsoft.Web/sites",
    "apiVersion": "2022-03-01",
    "name": "[parameters('siteName')]",
    "location": "[resourceGroup().location]",
    "properties": {
        "siteConfig": {
            "healthCheckPath": "/health"
        }
    }
}
```

## Building a Good Health Check Endpoint

The health check endpoint is where you decide what "healthy" means for your application. A basic endpoint that just returns 200 only confirms the process is running. A good endpoint checks that the application can actually serve requests.

### Basic Health Check (Liveness)

This confirms the application process is alive and can handle HTTP requests:

```csharp
// HealthController.cs - Basic liveness check in ASP.NET Core
[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        // If this code runs, the app is alive
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}
```

### Comprehensive Health Check (Readiness)

This checks that the application can actually do its job by testing critical dependencies:

```csharp
// HealthController.cs - Comprehensive health check that tests dependencies
[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    private readonly IDbConnection _database;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;

    public HealthController(
        IDbConnection database,
        IHttpClientFactory httpClientFactory,
        IConfiguration config)
    {
        _database = database;
        _httpClientFactory = httpClientFactory;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var checks = new Dictionary<string, string>();
        var isHealthy = true;

        // Check database connectivity
        try
        {
            using var cmd = _database.CreateCommand();
            cmd.CommandText = "SELECT 1";
            await cmd.ExecuteScalarAsync();
            checks["database"] = "ok";
        }
        catch (Exception ex)
        {
            checks["database"] = $"failed: {ex.Message}";
            isHealthy = false;
        }

        // Check cache connectivity
        try
        {
            var cacheHost = _config["REDIS_HOST"];
            // Quick connectivity test
            checks["cache"] = "ok";
        }
        catch (Exception ex)
        {
            checks["cache"] = $"failed: {ex.Message}";
            isHealthy = false;
        }

        // Return appropriate status code
        if (isHealthy)
        {
            return Ok(new { status = "healthy", checks });
        }
        else
        {
            // Return 503 to signal unhealthy
            return StatusCode(503, new { status = "unhealthy", checks });
        }
    }
}
```

### Node.js Example

```javascript
// routes/health.js - Health check endpoint for Express
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
    const checks = {};
    let isHealthy = true;

    // Check database connection
    try {
        await db.query('SELECT 1');
        checks.database = 'ok';
    } catch (err) {
        checks.database = `failed: ${err.message}`;
        isHealthy = false;
    }

    // Check external API reachability
    try {
        const response = await fetch('https://api.dependency.com/status', {
            // Set a short timeout so the health check does not hang
            signal: AbortSignal.timeout(5000)
        });
        checks.externalApi = response.ok ? 'ok' : 'degraded';
    } catch (err) {
        checks.externalApi = `failed: ${err.message}`;
        isHealthy = false;
    }

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks
    });
});

module.exports = router;
```

## Using ASP.NET Core Health Checks Framework

ASP.NET Core has a built-in health checks framework that integrates nicely with Azure App Service:

```csharp
// Program.cs - Configure health checks using the built-in framework
var builder = WebApplication.CreateBuilder(args);

// Register health checks for your dependencies
builder.Services.AddHealthChecks()
    .AddSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        name: "database",
        timeout: TimeSpan.FromSeconds(5))
    .AddRedis(
        builder.Configuration["RedisConnectionString"],
        name: "cache",
        timeout: TimeSpan.FromSeconds(3))
    .AddUrlGroup(
        new Uri("https://api.dependency.com/health"),
        name: "external-api",
        timeout: TimeSpan.FromSeconds(5));

var app = builder.Build();

// Map the health check endpoint
app.MapHealthChecks("/health", new HealthCheckOptions
{
    // Include details in the response
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                duration = e.Value.Duration.TotalMilliseconds
            })
        };
        await context.Response.WriteAsJsonAsync(result);
    }
});
```

## Health Check Best Practices

### Keep It Fast

The health check should complete quickly. Azure times out health check requests after a few seconds. If your health check calls a slow external API, the entire check might time out, and Azure will mark the instance as unhealthy even though the app itself is fine.

Set timeouts on all dependency checks:

```csharp
// Set a 3-second timeout on the database check
.AddSqlServer(
    connectionString,
    name: "database",
    timeout: TimeSpan.FromSeconds(3)
)
```

### Do Not Check Optional Dependencies

Only check dependencies that are truly critical. If your app can function without the cache (just slower), do not mark the instance as unhealthy when the cache is down. Otherwise, all your instances get pulled from rotation when the cache has a blip.

### Avoid Authentication on the Health Endpoint

The Azure health check feature sends a plain GET request without authentication headers. Make sure your health endpoint does not require authentication:

```csharp
// Make sure the health endpoint allows anonymous access
app.MapHealthChecks("/health").AllowAnonymous();
```

### Use a Unique Path

Do not use `/` as your health check path. It might return a heavy HTML page that takes time to generate. Use a dedicated path like `/health` or `/api/health`.

## Monitoring Health Check Results

You can see health check results in the Azure Portal:

1. Go to your App Service
2. Navigate to "Health check" under Monitoring
3. You will see a timeline showing the health status of each instance

For alerting, set up an Azure Monitor alert rule:

```bash
# Create an alert when health check fails
az monitor metrics alert create \
    --resource-group my-resource-group \
    --name "Health Check Failed" \
    --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{name}" \
    --condition "avg HealthCheckStatus < 100" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/{action-group}"
```

## What Happens When Instances Are Unhealthy

When an instance is marked unhealthy:

1. The load balancer stops sending new requests to it
2. Existing connections are allowed to complete
3. Azure continues pinging the health endpoint
4. If the instance recovers, it goes back into rotation
5. If it stays unhealthy for 1 hour, Azure replaces it

If all instances are unhealthy, Azure does NOT remove them all. It keeps routing traffic to all instances to avoid a complete outage. This prevents a scenario where a shared dependency failure (like a database outage) takes down all instances.

## Summary

Health checks are a simple feature that significantly improves the reliability of your Azure App Service. They catch issues that monitoring alone would miss - a single bad instance in a pool of healthy ones. The setup takes minutes, but the payoff is automatic detection and recovery from instance-level failures. Build your health endpoint to check what actually matters, keep it fast, and let Azure handle the rest.
