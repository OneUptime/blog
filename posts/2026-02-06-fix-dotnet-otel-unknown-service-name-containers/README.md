# How to Fix the .NET OpenTelemetry SDK Reporting service.name as 'unknown_service' in Container Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Docker, Service Name

Description: Fix the unknown_service problem in .NET container deployments where OpenTelemetry cannot determine the service name.

You deploy your .NET application in a Docker container, check your tracing backend, and see all your spans tagged with `service.name: unknown_service:dotnet`. Not exactly helpful when you have 20 microservices and they all show the same name.

## Why This Happens

The OpenTelemetry .NET SDK tries to determine the service name automatically. It follows this priority order:

1. `OTEL_SERVICE_NAME` environment variable
2. `OTEL_RESOURCE_ATTRIBUTES` environment variable (looks for `service.name` key)
3. Programmatic configuration via `ConfigureResource`
4. Assembly entry point name

In a container, option 4 often resolves to the .NET runtime executable name (like `dotnet`) rather than your application's name, especially when using `dotnet run` or when the entry point assembly is not clear.

## Quick Fix: Set the Environment Variable

The simplest fix is to set `OTEL_SERVICE_NAME` in your container:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# Set the service name explicitly
ENV OTEL_SERVICE_NAME=order-service

ENTRYPOINT ["dotnet", "OrderService.dll"]
```

Or in your Kubernetes deployment:

```yaml
containers:
- name: order-service
  image: myregistry/order-service:latest
  env:
  - name: OTEL_SERVICE_NAME
    value: "order-service"
```

## Better Fix: Configure It in Code

Setting the service name in code gives you more control and makes it visible in your source:

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource =>
    {
        resource.AddService(
            serviceName: "order-service",
            serviceVersion: "1.2.0",
            serviceInstanceId: Environment.MachineName
        );
    })
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    });
```

The `AddService` method sets `service.name`, `service.version`, and `service.instance.id` on all telemetry emitted by this application.

## Adding More Resource Attributes

You will probably want more than just the service name. Add deployment environment and other metadata:

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource =>
    {
        resource
            .AddService(
                serviceName: "order-service",
                serviceVersion: Assembly.GetEntryAssembly()
                    ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
                    ?.InformationalVersion ?? "unknown"
            )
            .AddAttributes(new Dictionary<string, object>
            {
                ["deployment.environment"] = builder.Environment.EnvironmentName,
                ["host.name"] = Environment.MachineName,
            })
            // Add container resource detector for Kubernetes metadata
            .AddContainerDetector()
            .AddEnvironmentVariableDetector();
    })
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddOtlpExporter();
    });
```

## Using Resource Detectors

Resource detectors automatically populate resource attributes from the environment. Install the detectors package:

```bash
dotnet add package OpenTelemetry.ResourceDetectors.Container
dotnet add package OpenTelemetry.ResourceDetectors.Host
```

```csharp
resource
    .AddService("order-service")
    .AddContainerDetector()  // adds container.id
    .AddHostDetector();      // adds host.name, host.arch, etc.
```

In Kubernetes, the container detector reads the container ID from `/proc/self/cgroup`. The host detector reads the hostname and OS information.

## Using OTEL_RESOURCE_ATTRIBUTES for Dynamic Configuration

If you want to keep the service name configurable per deployment without code changes, use `OTEL_RESOURCE_ATTRIBUTES`:

```yaml
# Kubernetes deployment
env:
- name: OTEL_RESOURCE_ATTRIBUTES
  value: "service.name=order-service,deployment.environment=production,service.version=1.2.0"
```

The SDK parses this comma-separated list and adds each key-value pair as a resource attribute. This is useful when the same Docker image is deployed with different service names in different environments.

## Priority Resolution

When multiple sources set the same attribute, here is the precedence (highest wins):

```csharp
// 1. OTEL_SERVICE_NAME env var (highest priority)
// 2. service.name in OTEL_RESOURCE_ATTRIBUTES
// 3. AddService() in code
// 4. Auto-detected assembly name (lowest priority)

// Example: if OTEL_SERVICE_NAME is set, it overrides AddService()
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource =>
    {
        // This will be overridden if OTEL_SERVICE_NAME is set
        resource.AddService("order-service");
    });
```

## Verifying the Service Name

Add a startup log to confirm the service name is correct:

```csharp
var app = builder.Build();

// Log the configured service name on startup
var tracerProvider = app.Services.GetService<TracerProvider>();
if (tracerProvider != null)
{
    var resource = tracerProvider.GetResource();
    var serviceName = resource.Attributes
        .FirstOrDefault(a => a.Key == "service.name").Value;
    app.Logger.LogInformation(
        "OpenTelemetry configured with service.name: {ServiceName}",
        serviceName);
}
```

If you see `unknown_service:dotnet` in this log, your configuration is not being applied. Double-check the order of your service registration and ensure `AddOpenTelemetry()` is called before `builder.Build()`.

The fix is simple: always set the service name explicitly, either through environment variables or in code. Never rely on auto-detection in container environments.
