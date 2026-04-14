# How to Use Dapr with Serilog in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serilog, .NET, Logging, Observability

Description: Learn how to integrate Serilog structured logging with Dapr in .NET applications, including correlation IDs, sinks, and distributed tracing context.

---

## Why Serilog with Dapr?

Dapr emits structured logs from its sidecar, and your .NET application benefits from matching that structure. Serilog's property-based logging enables consistent log correlation across Dapr invocations, pub/sub events, and actor calls.

```bash
# Install Serilog packages
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.Seq
dotnet add package Serilog.Enrichers.Environment
dotnet add package Dapr.AspNetCore
```

## Configure Serilog in Program.cs

```csharp
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.Seq("http://localhost:5341")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

builder.Services.AddDaprClient();
builder.Services.AddControllers().AddDapr();

var app = builder.Build();
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("DaprAppId",
            httpContext.Request.Headers["dapr-app-id"].ToString());
        diagnosticContext.Set("TraceId",
            httpContext.Request.Headers["traceparent"].ToString());
    };
});

app.UseCloudEvents();
app.MapSubscribeHandler();
app.MapControllers();
app.Run();
```

## Logging in Dapr Service Invocation

```csharp
[ApiController]
[Route("[controller]")]
public class OrderController : ControllerBase
{
    private readonly ILogger<OrderController> _logger;
    private readonly DaprClient _dapr;

    public OrderController(ILogger<OrderController> logger, DaprClient dapr)
    {
        _logger = logger;
        _dapr = dapr;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] OrderRequest request)
    {
        var activity = System.Diagnostics.Activity.Current;

        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["OrderId"] = request.OrderId,
            ["CustomerId"] = request.CustomerId,
            ["TraceId"] = activity?.TraceId.ToString() ?? "none"
        }))
        {
            _logger.LogInformation("Processing order {OrderId} for customer {CustomerId}",
                request.OrderId, request.CustomerId);

            try
            {
                await _dapr.InvokeMethodAsync("payment-service", "charge", request);
                _logger.LogInformation("Payment processed for order {OrderId}", request.OrderId);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payment failed for order {OrderId}", request.OrderId);
                return StatusCode(500);
            }
        }
    }
}
```

## Logging in Pub/Sub Subscribers

```csharp
[Topic("pubsub", "orders")]
[HttpPost("orders")]
public async Task<ActionResult> HandleOrder(OrderEvent orderEvent)
{
    _logger.LogInformation(
        "Received pub/sub event for order {OrderId}",
        orderEvent.OrderId);

    await ProcessOrderAsync(orderEvent);

    _logger.LogInformation("Successfully processed order {OrderId}", orderEvent.OrderId);
    return Ok();
}
```

## Serilog Configuration via appsettings.json

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "Dapr": "Information"
      }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/dapr-app-.log",
          "rollingInterval": "Day"
        }
      }
    ],
    "Enrich": ["FromLogContext", "WithMachineName"]
  }
}
```

## Summary

Integrating Serilog with Dapr in .NET gives you structured, property-rich logs that correlate across service invocations and pub/sub events. By enriching log context with Dapr headers like `dapr-app-id` and the W3C `traceparent`, you can trace requests end-to-end across your microservices. Configure sinks like Seq or Elasticsearch to aggregate and query logs from all your Dapr-enabled services.
