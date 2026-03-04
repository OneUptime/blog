# How to Implement Health Endpoint Monitoring for Azure Web Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Health Checks, Monitoring, Web Applications, ASP.NET, Load Balancing, Observability

Description: Build comprehensive health endpoint monitoring for Azure web applications with dependency checks, degraded states, and integration with load balancers.

---

A health endpoint is one of those things that seems simple but makes a huge difference in how reliably your application runs in production. It is a dedicated URL that returns the current health status of your application, including whether its dependencies (databases, caches, external APIs) are reachable and functioning.

Azure load balancers, Application Gateway, Traffic Manager, and Front Door all use health probes to decide whether to send traffic to an instance. If your health endpoint is poorly designed, you either get false positives (healthy response when the app is broken) or false negatives (unhealthy response when the app is fine), both of which cause problems.

## The Basics of ASP.NET Health Checks

ASP.NET Core has a built-in health check framework that makes it straightforward to implement health endpoints. Let us start with the fundamentals:

```csharp
// Program.cs - Register health checks
var builder = WebApplication.CreateBuilder(args);

// Add health checks for each dependency
builder.Services.AddHealthChecks()
    // SQL Server database check
    .AddSqlServer(
        connectionString: builder.Configuration.GetConnectionString("OrdersDb"),
        name: "orders-database",
        tags: new[] { "database", "critical" },
        timeout: TimeSpan.FromSeconds(5))
    // Redis cache check
    .AddRedis(
        redisConnectionString: builder.Configuration.GetConnectionString("Redis"),
        name: "redis-cache",
        tags: new[] { "cache", "critical" },
        timeout: TimeSpan.FromSeconds(3))
    // Azure Blob Storage check
    .AddAzureBlobStorage(
        connectionString: builder.Configuration.GetConnectionString("BlobStorage"),
        name: "blob-storage",
        tags: new[] { "storage" },
        timeout: TimeSpan.FromSeconds(5))
    // External API dependency
    .AddUrlGroup(
        new Uri("https://payment-api.example.com/health"),
        name: "payment-api",
        tags: new[] { "external", "critical" },
        timeout: TimeSpan.FromSeconds(10));

var app = builder.Build();

// Map health endpoints
app.MapHealthChecks("/health");

app.Run();
```

## Multiple Health Endpoints for Different Consumers

Different consumers need different levels of health information. A load balancer just needs to know if the instance can serve traffic. An operations dashboard needs detailed dependency status. A Kubernetes liveness probe needs to know if the process is stuck.

```csharp
// Liveness endpoint - is the process running and not deadlocked?
// Used by Kubernetes liveness probes and basic load balancer checks
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    // No dependency checks - just confirms the process responds
    Predicate = _ => false,
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            timestamp = DateTime.UtcNow
        }));
    }
});

// Readiness endpoint - can this instance handle requests?
// Used by load balancers to determine if traffic should be routed here
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    // Only check critical dependencies
    Predicate = check => check.Tags.Contains("critical"),
    ResponseWriter = WriteDetailedResponse
});

// Full status endpoint - detailed health for operations dashboards
// Requires authentication to prevent information disclosure
app.MapHealthChecks("/health/detail", new HealthCheckOptions
{
    Predicate = _ => true,  // check everything
    ResponseWriter = WriteDetailedResponse
}).RequireAuthorization("HealthCheckPolicy");
```

The detailed response writer provides structured information about each dependency:

```csharp
// Custom response writer that includes per-dependency status
static async Task WriteDetailedResponse(
    HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";

    var response = new
    {
        status = report.Status.ToString(),
        totalDuration = report.TotalDuration.TotalMilliseconds,
        timestamp = DateTime.UtcNow,
        checks = report.Entries.Select(entry => new
        {
            name = entry.Key,
            status = entry.Value.Status.ToString(),
            duration = entry.Value.Duration.TotalMilliseconds,
            description = entry.Value.Description,
            // Only include exception details in non-production
            error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") != "Production"
                ? entry.Value.Exception?.Message
                : null,
            tags = entry.Value.Tags
        })
    };

    // Return 200 for Healthy, 503 for Unhealthy
    context.Response.StatusCode = report.Status == HealthStatus.Healthy
        ? StatusCodes.Status200OK
        : StatusCodes.Status503ServiceUnavailable;

    await context.Response.WriteAsync(
        JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
}
```

## Custom Health Checks

The built-in checks cover common dependencies, but you often need custom checks for application-specific concerns:

```csharp
// Custom health check that verifies the message queue is processing
public class MessageQueueHealthCheck : IHealthCheck
{
    private readonly ServiceBusClient _serviceBusClient;
    private readonly string _queueName;

    public MessageQueueHealthCheck(
        ServiceBusClient serviceBusClient,
        string queueName)
    {
        _serviceBusClient = serviceBusClient;
        _queueName = queueName;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if the queue is accessible
            var receiver = _serviceBusClient.CreateReceiver(_queueName);
            var message = await receiver.PeekMessageAsync(cancellationToken);

            // Check queue depth - degraded if messages are piling up
            var adminClient = new ServiceBusAdministrationClient(
                _serviceBusClient.FullyQualifiedNamespace,
                new DefaultAzureCredential());

            var properties = await adminClient
                .GetQueueRuntimePropertiesAsync(_queueName, cancellationToken);

            var activeMessages = properties.Value.ActiveMessageCount;

            if (activeMessages > 10000)
            {
                return HealthCheckResult.Degraded(
                    $"Queue '{_queueName}' has {activeMessages} pending messages",
                    data: new Dictionary<string, object>
                    {
                        ["activeMessages"] = activeMessages,
                        ["deadLetterMessages"] = properties.Value.DeadLetterMessageCount
                    });
            }

            return HealthCheckResult.Healthy(
                $"Queue '{_queueName}' is operational with {activeMessages} messages");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(
                $"Queue '{_queueName}' is unreachable",
                exception: ex);
        }
    }
}

// Register the custom health check
builder.Services.AddHealthChecks()
    .Add(new HealthCheckRegistration(
        "order-queue",
        sp => new MessageQueueHealthCheck(
            sp.GetRequiredService<ServiceBusClient>(),
            "orders"),
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "messaging", "critical" },
        timeout: TimeSpan.FromSeconds(10)));
```

## Configuring Azure Load Balancer Health Probes

Azure Application Gateway and Load Balancer use health probes to determine which backend instances are healthy. Configure them to use your readiness endpoint:

```bash
# Configure Application Gateway health probe
az network application-gateway probe create \
  --resource-group myResourceGroup \
  --gateway-name myAppGateway \
  --name health-probe \
  --protocol Https \
  --host-name-from-http-settings true \
  --path /health/ready \
  --interval 15 \
  --timeout 10 \
  --threshold 3 \
  --match-status-codes "200"
```

For AKS deployments, configure Kubernetes probes in your deployment manifest:

```yaml
# Kubernetes deployment with liveness, readiness, and startup probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: order-api
          image: myacr.azurecr.io/order-api:v1.0
          ports:
            - containerPort: 8080
          # Startup probe - gives the app time to initialize
          # Checked every 5 seconds, fails after 30 attempts (150s total)
          startupProbe:
            httpGet:
              path: /health/live
              port: 8080
            periodSeconds: 5
            failureThreshold: 30
          # Liveness probe - restarts the pod if it becomes unresponsive
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
            timeoutSeconds: 5
          # Readiness probe - removes pod from service if dependencies are down
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
            timeoutSeconds: 5
```

## Health Check UI

For operations visibility, you can add a health check dashboard using the AspNetCore.HealthChecks.UI package:

```csharp
// Add health checks UI with in-memory storage
builder.Services.AddHealthChecksUI(options =>
{
    options.SetEvaluationTimeInSeconds(30);
    options.MaximumHistoryEntriesPerEndpoint(100);

    // Add endpoints to monitor
    options.AddHealthCheckEndpoint("Order API", "/health/detail");
    options.AddHealthCheckEndpoint("Payment API", "https://payment-api/health/detail");
    options.AddHealthCheckEndpoint("Inventory API", "https://inventory-api/health/detail");
})
.AddInMemoryStorage();

// Map the UI endpoint
app.MapHealthChecksUI(options =>
{
    options.UIPath = "/health-ui";
});
```

## Publishing Health Status to Application Insights

Forward health check results to Application Insights for alerting and historical analysis:

```csharp
// Health check publisher that sends results to Application Insights
public class ApplicationInsightsHealthPublisher : IHealthCheckPublisher
{
    private readonly TelemetryClient _telemetryClient;

    public ApplicationInsightsHealthPublisher(TelemetryClient telemetryClient)
    {
        _telemetryClient = telemetryClient;
    }

    public Task PublishAsync(
        HealthReport report,
        CancellationToken cancellationToken)
    {
        // Track overall health status
        _telemetryClient.TrackMetric("HealthCheck.OverallStatus",
            report.Status == HealthStatus.Healthy ? 1 : 0);

        // Track each dependency individually
        foreach (var entry in report.Entries)
        {
            _telemetryClient.TrackMetric(
                $"HealthCheck.{entry.Key}",
                entry.Value.Status == HealthStatus.Healthy ? 1 : 0);

            _telemetryClient.TrackMetric(
                $"HealthCheck.{entry.Key}.Duration",
                entry.Value.Duration.TotalMilliseconds);

            // Track degraded and unhealthy as events for alerting
            if (entry.Value.Status != HealthStatus.Healthy)
            {
                _telemetryClient.TrackEvent($"HealthCheck.{entry.Key}.{entry.Value.Status}",
                    new Dictionary<string, string>
                    {
                        ["description"] = entry.Value.Description ?? "N/A",
                        ["duration"] = entry.Value.Duration.TotalMilliseconds.ToString()
                    });
            }
        }

        return Task.CompletedTask;
    }
}

// Register the publisher to run every 30 seconds
builder.Services.Configure<HealthCheckPublisherOptions>(options =>
{
    options.Period = TimeSpan.FromSeconds(30);
    options.Timeout = TimeSpan.FromSeconds(20);
});

builder.Services.AddSingleton<IHealthCheckPublisher, ApplicationInsightsHealthPublisher>();
```

## Best Practices

Here is what I have learned from implementing health checks across many Azure projects:

1. **Keep health checks fast.** A health check that takes 30 seconds to complete defeats the purpose. Set timeouts on each check.
2. **Separate liveness from readiness.** A pod can be alive but not ready to serve traffic during initialization.
3. **Use the degraded state.** Not everything is binary. If the cache is down but the database is fine, the app is degraded, not unhealthy.
4. **Do not expose sensitive information.** The public health endpoint should return minimal data. Detailed information should require authentication.
5. **Test your health checks.** Simulate dependency failures and verify that the health endpoint correctly reflects the degraded state.
6. **Cache health check results briefly.** If you have many load balancer instances probing your health endpoint, cache the result for 5-10 seconds to avoid overwhelming your dependencies with check queries.

Health endpoint monitoring is one of the most impactful things you can add to your Azure web applications. It directly improves reliability by enabling load balancers to route around unhealthy instances, gives your operations team visibility into dependency status, and catches problems before users notice them.
