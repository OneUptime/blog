# How to Use Dapr with NLog in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, NLog, .NET, Logging, Observability

Description: Configure NLog with Dapr in .NET applications to capture structured logs from service invocations, pub/sub events, and actor operations with proper correlation.

---

## Setting Up NLog with Dapr

NLog is a battle-tested .NET logging framework that integrates cleanly with ASP.NET Core's `ILogger` abstraction. When used with Dapr, it captures logs from both your application code and the Dapr middleware pipeline.

```bash
# Install NLog packages
dotnet add package NLog.Web.AspNetCore
dotnet add package NLog.Extensions.Logging
dotnet add package Dapr.AspNetCore
```

## NLog Configuration File

Create `nlog.config` in your project root:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      autoReload="true">

  <extensions>
    <add assembly="NLog.Web.AspNetCore"/>
  </extensions>

  <targets>
    <target xsi:type="Console" name="console"
            layout="${longdate} ${level:uppercase=true} [${logger:shortName=true}] TraceId=${aspnet-TraceIdentifier} ${message} ${exception:format=tostring}" />

    <target xsi:type="File" name="file"
            fileName="logs/dapr-${shortdate}.log"
            layout="${longdate}|${level}|${logger}|${aspnet-request-headers:HeaderNames=traceparent}|${message}|${exception}" />
  </targets>

  <rules>
    <logger name="Microsoft.*" maxlevel="Info" final="true" />
    <logger name="Dapr.*" minlevel="Info" writeTo="console,file" />
    <logger name="*" minlevel="Info" writeTo="console,file" />
  </rules>
</nlog>
```

## Configure NLog in Program.cs

```csharp
using NLog;
using NLog.Web;

var logger = LogManager.Setup()
    .LoadConfigurationFromAppSettings()
    .GetCurrentClassLogger();

try
{
    logger.Info("Starting Dapr application");

    var builder = WebApplication.CreateBuilder(args);

    builder.Logging.ClearProviders();
    builder.Host.UseNLog();

    builder.Services.AddDaprClient();
    builder.Services.AddControllers().AddDapr();

    var app = builder.Build();
    app.MapSubscribeHandler();
    app.MapControllers();
    app.Run();
}
catch (Exception ex)
{
    logger.Error(ex, "Application startup failed");
    throw;
}
finally
{
    LogManager.Shutdown();
}
```

## Structured Logging in Controllers

```csharp
[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly ILogger<InventoryController> _logger;
    private readonly DaprClient _dapr;

    public InventoryController(ILogger<InventoryController> logger, DaprClient dapr)
    {
        _logger = logger;
        _dapr = dapr;
    }

    [HttpGet("{productId}")]
    public async Task<IActionResult> GetStock(string productId)
    {
        _logger.LogInformation(
            "Fetching stock for product {ProductId}", productId);

        var state = await _dapr.GetStateAsync<InventoryItem>(
            "statestore", $"inventory-{productId}");

        if (state == null)
        {
            _logger.LogWarning(
                "Product {ProductId} not found in state store", productId);
            return NotFound();
        }

        _logger.LogInformation(
            "Product {ProductId} has {Quantity} units available",
            productId, state.Quantity);

        return Ok(state);
    }
}
```

## NLog with Dapr MDLC (Mapped Diagnostics Logical Context)

```csharp
// Middleware to add Dapr context to NLog MDLC
public class DaprContextMiddleware
{
    private readonly RequestDelegate _next;

    public DaprContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var appId = context.Request.Headers["dapr-app-id"].ToString();
        var traceParent = context.Request.Headers["traceparent"].ToString();

        using (NLog.MappedDiagnosticsLogicalContext.SetScoped("DaprAppId", appId))
        using (NLog.MappedDiagnosticsLogicalContext.SetScoped("TraceParent", traceParent))
        {
            await _next(context);
        }
    }
}
```

## Summary

NLog integrates seamlessly with Dapr in .NET through ASP.NET Core's logging abstraction. By configuring NLog targets to capture Dapr-specific HTTP headers like `traceparent` and `dapr-app-id`, you get correlated structured logs across your distributed microservices. Use NLog's flexible layout renderers and rules to control verbosity per namespace and route logs to multiple targets simultaneously.
