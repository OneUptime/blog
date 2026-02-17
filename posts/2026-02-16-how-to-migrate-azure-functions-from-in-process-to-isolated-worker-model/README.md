# How to Migrate Azure Functions from In-Process to Isolated Worker Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Migration, Isolated Worker, .NET, Azure, Serverless, Upgrade

Description: A practical migration guide for moving Azure Functions from the in-process model to the isolated worker model with real code examples and gotchas.

---

Microsoft has been pushing the isolated worker model as the future of .NET Azure Functions for a while now, and the in-process model is officially on its way to retirement. If you have .NET Azure Functions running in-process, you need to migrate them to the isolated worker model. This is not just a find-and-replace exercise. There are real architectural differences that affect how you write your functions, handle dependency injection, and work with bindings.

In this post, I will walk through the migration step by step, covering the changes you need to make and the problems you will likely run into.

## Why the Migration Matters

The in-process model runs your function code in the same process as the Azure Functions host. This was convenient but limiting. Your code was locked to the same .NET version as the host, you could not customize the host pipeline, and memory issues in your code could crash the entire host.

The isolated worker model runs your function code in a separate process. This gives you freedom to use any supported .NET version, full control over middleware, and process-level isolation from the host. It also means your functions will continue to be supported going forward since in-process support ends with .NET 8 LTS.

## Step 1: Update Project File

The project file changes are significant. You need to swap out the SDK, update packages, and change the output type.

Here is a typical in-process project file.

```xml
<!-- Old in-process project file -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="4.2.0" />
  </ItemGroup>
</Project>
```

And here is what it looks like after migration.

```xml
<!-- New isolated worker project file -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <!-- This is required for the isolated worker model -->
    <OutputType>Exe</OutputType>
  </PropertyGroup>
  <ItemGroup>
    <!-- Replace the old SDK package with these three -->
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.21.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.16.4" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore" Version="1.2.1" />
    <!-- Add any other extension packages you need -->
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.3.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Storage.Queues" Version="5.3.0" />
    <PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.22.0" />
  </ItemGroup>
</Project>
```

Notice the `OutputType` is set to `Exe`. This is because the isolated worker model runs as its own executable, not as a library loaded by the host.

## Step 2: Add Program.cs

The isolated worker model requires an entry point. Create a `Program.cs` file that configures the host.

```csharp
// Program.cs - Entry point for the isolated worker function app
// This replaces the Startup.cs class from the in-process model
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()  // Use this for HTTP triggers with ASP.NET Core integration
    .ConfigureServices(services =>
    {
        // Register Application Insights for monitoring
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Register your own services - same as you would in Startup.cs
        services.AddHttpClient();
        services.AddSingleton<IMyService, MyService>();
        services.AddScoped<IDataRepository, DataRepository>();
    })
    .ConfigureLogging(logging =>
    {
        // Configure logging levels
        logging.SetMinimumLevel(LogLevel.Information);
    })
    .Build();

host.Run();
```

If you had a `Startup.cs` class with `FunctionsStartup`, move all the service registrations into the `ConfigureServices` call above and delete the Startup class.

## Step 3: Update Function Signatures

This is where most of the work happens. Every function needs its signature updated. Let me show you the before and after for the most common trigger types.

### HTTP Trigger

```csharp
// BEFORE: In-process HTTP trigger
public static class OldHttpFunction
{
    [FunctionName("GetUser")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req,
        ILogger log)
    {
        log.LogInformation("Processing request");
        string name = req.Query["name"];
        return new OkObjectResult($"Hello, {name}");
    }
}

// AFTER: Isolated worker HTTP trigger with ASP.NET Core integration
public class NewHttpFunction
{
    private readonly ILogger<NewHttpFunction> _logger;

    // Use constructor injection instead of the ILogger parameter
    public NewHttpFunction(ILogger<NewHttpFunction> logger)
    {
        _logger = logger;
    }

    [Function("GetUser")]  // Note: Function, not FunctionName
    public IActionResult Run(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req)
    {
        _logger.LogInformation("Processing request");
        string name = req.Query["name"];
        return new OkObjectResult($"Hello, {name}");
    }
}
```

Key differences: the `[FunctionName]` attribute becomes `[Function]`. The class is no longer static. Logging uses constructor injection instead of a method parameter. With the ASP.NET Core integration, you can keep using `HttpRequest` and `IActionResult`, which makes the migration much smoother.

### Timer Trigger

```csharp
// BEFORE: In-process timer trigger
public static class OldTimerFunction
{
    [FunctionName("CleanupJob")]
    public static void Run(
        [TimerTrigger("0 0 * * * *")] TimerInfo timer,
        ILogger log)
    {
        log.LogInformation("Cleanup running at {time}", DateTime.UtcNow);
    }
}

// AFTER: Isolated worker timer trigger
public class NewTimerFunction
{
    private readonly ILogger<NewTimerFunction> _logger;

    public NewTimerFunction(ILogger<NewTimerFunction> logger)
    {
        _logger = logger;
    }

    [Function("CleanupJob")]
    public void Run([TimerTrigger("0 0 * * * *")] TimerInfo timer)
    {
        _logger.LogInformation("Cleanup running at {time}", DateTime.UtcNow);
    }
}
```

### Queue Trigger

```csharp
// BEFORE: In-process queue trigger with output binding
public static class OldQueueFunction
{
    [FunctionName("ProcessOrder")]
    [return: Queue("processed-orders")]
    public static string Run(
        [QueueTrigger("incoming-orders")] string orderJson,
        ILogger log)
    {
        log.LogInformation("Processing order: {order}", orderJson);
        return orderJson; // Output binding sends this to the output queue
    }
}

// AFTER: Isolated worker queue trigger with output binding
public class NewQueueFunction
{
    private readonly ILogger<NewQueueFunction> _logger;

    public NewQueueFunction(ILogger<NewQueueFunction> logger)
    {
        _logger = logger;
    }

    [Function("ProcessOrder")]
    [QueueOutput("processed-orders")]  // Output binding attribute changed
    public string Run(
        [QueueTrigger("incoming-orders")] string orderJson)
    {
        _logger.LogInformation("Processing order: {order}", orderJson);
        return orderJson;
    }
}
```

## Step 4: Update local.settings.json

Add the worker runtime setting.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
  }
}
```

The `FUNCTIONS_WORKER_RUNTIME` value changes from `dotnet` to `dotnet-isolated`. Make sure you also update this in your Azure Function App's application settings.

## Step 5: Handle Middleware

One of the advantages of the isolated model is that you can add middleware to the request pipeline. If you were doing cross-cutting concerns like authentication validation or request logging in a hacky way in the in-process model, you can now do it properly.

```csharp
// Custom middleware for logging request details
public class RequestLoggingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(ILogger<RequestLoggingMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        _logger.LogInformation("Function {Name} starting", context.FunctionDefinition.Name);

        // Call the next middleware or the function itself
        await next(context);

        stopwatch.Stop();
        _logger.LogInformation(
            "Function {Name} completed in {Duration}ms",
            context.FunctionDefinition.Name,
            stopwatch.ElapsedMilliseconds);
    }
}
```

Register the middleware in `Program.cs`.

```csharp
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(worker =>
    {
        // Add your custom middleware to the pipeline
        worker.UseMiddleware<RequestLoggingMiddleware>();
    })
    .Build();
```

## Common Migration Pitfalls

There are several issues I have seen teams run into during this migration.

First, **binding types change**. Some binding types that were available in-process have different names or namespaces in the isolated model. Check the extension package documentation for each binding type you use.

Second, **ILogger injection changes**. You cannot use the `ILogger` method parameter anymore. You must use constructor injection with `ILogger<T>`.

Third, **the Newtonsoft.Json vs System.Text.Json difference**. The isolated worker model uses System.Text.Json by default for serialization. If your code depends on Newtonsoft.Json attributes or behaviors, you need to configure the worker to use Newtonsoft.Json.

```csharp
// Configure the worker to use Newtonsoft.Json if needed
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(services =>
    {
        services.Configure<WorkerOptions>(options =>
        {
            options.Serializer = new JsonObjectSerializer(
                new Newtonsoft.Json.JsonSerializerSettings());
        });
    })
    .Build();
```

Fourth, **deployment considerations**. Make sure your CI/CD pipeline publishes the isolated worker project correctly. The output includes the `handler.exe` (or equivalent on Linux) that the Functions host launches. If the publish step is not configured properly, you will get startup failures.

## Testing Your Migration

Before deploying, test thoroughly in a local environment. The Azure Functions Core Tools support the isolated model, so `func start` will work. Run through every trigger type in your function app to verify behavior. Pay special attention to output bindings and serialization, as these are the areas where subtle differences are most likely to surface.

## Summary

Migrating from in-process to isolated worker requires updating your project file, adding a Program.cs entry point, converting all function signatures, and adjusting how you handle dependency injection and logging. The effort is real, but the payoff is better .NET version support, middleware capabilities, and long-term platform support. Start the migration early so you are not scrambling when in-process support reaches end of life.
