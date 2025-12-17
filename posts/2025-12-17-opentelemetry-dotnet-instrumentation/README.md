# OpenTelemetry for .NET Applications: A Complete Instrumentation Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, CSharp, ASP.NET Core, Observability, Tracing, Metrics

Description: A comprehensive guide to instrumenting .NET applications with OpenTelemetry- from ASP.NET Core auto-instrumentation to manual spans, metrics, and production-ready configurations for modern .NET services.

---

> .NET powers enterprise applications across industries. OpenTelemetry's .NET SDK brings unified observability with first-class support for ASP.NET Core, Entity Framework, and the entire .NET ecosystem.

This guide covers instrumenting .NET applications with OpenTelemetry, including ASP.NET Core integration, manual instrumentation, metrics, and patterns optimized for the .NET runtime.

---

## Table of Contents

1. Why OpenTelemetry for .NET?
2. Installation and Setup
3. ASP.NET Core Integration
4. Manual Instrumentation
5. HTTP Client Tracing
6. Entity Framework Tracing
7. Custom Metrics
8. Structured Logging with Serilog
9. gRPC Instrumentation
10. Background Services
11. Sampling Configuration
12. Production Deployment
13. Performance Considerations
14. Common Patterns and Best Practices

---

## 1. Why OpenTelemetry for .NET?

| Benefit | Description |
|---------|-------------|
| Native integration | First-class ASP.NET Core support |
| DiagnosticSource | Leverages .NET's built-in instrumentation hooks |
| ILogger integration | Correlate logs with traces automatically |
| High performance | Optimized for .NET's memory model |
| Vendor neutral | Export to any OTLP-compatible backend |

---

## 2. Installation and Setup

### NuGet packages

```bash
# Core packages
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol

# ASP.NET Core instrumentation
dotnet add package OpenTelemetry.Instrumentation.AspNetCore

# HTTP client instrumentation
dotnet add package OpenTelemetry.Instrumentation.Http

# Entity Framework Core instrumentation
dotnet add package OpenTelemetry.Instrumentation.EntityFrameworkCore

# SQL Client instrumentation
dotnet add package OpenTelemetry.Instrumentation.SqlClient
```

### .csproj

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="OpenTelemetry" Version="1.7.0" />
    <PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.7.0" />
    <PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.7.0" />
    <PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.7.0" />
    <PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.7.0" />
    <PackageReference Include="OpenTelemetry.Instrumentation.EntityFrameworkCore" Version="1.0.0-beta.11" />
    <PackageReference Include="OpenTelemetry.Instrumentation.SqlClient" Version="1.7.0-beta.1" />
  </ItemGroup>
</Project>
```

---

## 3. ASP.NET Core Integration

### Program.cs (Minimal API)

```csharp
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry
var serviceName = builder.Configuration["ServiceName"] ?? "dotnet-service";
var otlpEndpoint = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "https://oneuptime.com/otlp";
var oneuptimeToken = builder.Configuration["ONEUPTIME_TOKEN"] ?? "";

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: serviceName, serviceVersion: "1.0.0")
        .AddAttributes(new Dictionary<string, object>
        {
            ["deployment.environment"] = builder.Environment.EnvironmentName,
            ["host.name"] = Environment.MachineName
        }))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation(options =>
        {
            options.RecordException = true;
            options.Filter = httpContext => !httpContext.Request.Path.StartsWithSegments("/health");
        })
        .AddHttpClientInstrumentation(options =>
        {
            options.RecordException = true;
        })
        .AddEntityFrameworkCoreInstrumentation(options =>
        {
            options.SetDbStatementForText = true;
        })
        .AddSqlClientInstrumentation(options =>
        {
            options.SetDbStatementForText = true;
            options.RecordException = true;
        })
        .AddSource("MyApp.*") // Custom activity sources
        .SetSampler(new ParentBasedSampler(new TraceIdRatioBasedSampler(0.1)))
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri($"{otlpEndpoint}/v1/traces");
            options.Headers = $"x-oneuptime-token={oneuptimeToken}";
        }))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddProcessInstrumentation()
        .AddMeter("MyApp.*") // Custom meters
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri($"{otlpEndpoint}/v1/metrics");
            options.Headers = $"x-oneuptime-token={oneuptimeToken}";
        }));

// Configure logging with OpenTelemetry
builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
    logging.AddOtlpExporter(options =>
    {
        options.Endpoint = new Uri($"{otlpEndpoint}/v1/logs");
        options.Headers = $"x-oneuptime-token={oneuptimeToken}";
    });
});

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapGet("/users/{id}", async (string id, UserService userService) =>
{
    var user = await userService.GetUserAsync(id);
    return user is not null ? Results.Ok(user) : Results.NotFound();
});

app.MapPost("/orders", async (Order order, OrderService orderService) =>
{
    var result = await orderService.CreateOrderAsync(order);
    return Results.Created($"/orders/{result.Id}", result);
});

app.Run();
```

### Traditional Startup.cs approach

```csharp
// Startup.cs
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();

        services.AddOpenTelemetry()
            .ConfigureResource(ConfigureResource)
            .WithTracing(ConfigureTracing)
            .WithMetrics(ConfigureMetrics);
    }

    private void ConfigureResource(ResourceBuilder builder)
    {
        builder
            .AddService(serviceName: "my-api", serviceVersion: "1.0.0")
            .AddTelemetrySdk()
            .AddEnvironmentVariableDetector();
    }

    private void ConfigureTracing(TracerProviderBuilder builder)
    {
        builder
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddOtlpExporter();
    }

    private void ConfigureMetrics(MeterProviderBuilder builder)
    {
        builder
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter();
    }
}
```

---

## 4. Manual Instrumentation

### Using ActivitySource

```csharp
using System.Diagnostics;

public class OrderService
{
    private static readonly ActivitySource ActivitySource = new("MyApp.OrderService");
    private readonly ILogger<OrderService> _logger;

    public OrderService(ILogger<OrderService> logger)
    {
        _logger = logger;
    }

    public async Task<OrderResult> CreateOrderAsync(Order order)
    {
        using var activity = ActivitySource.StartActivity("order.create", ActivityKind.Internal);
        activity?.SetTag("order.id", order.Id);
        activity?.SetTag("order.items", order.Items.Count);
        activity?.SetTag("order.total", order.Total);

        try
        {
            // Validation
            await ValidateOrderAsync(order);

            // Payment
            var paymentResult = await ProcessPaymentAsync(order);
            activity?.SetTag("payment.id", paymentResult.Id);

            // Fulfillment
            await FulfillOrderAsync(order);

            activity?.AddEvent(new ActivityEvent("order.completed"));
            activity?.SetStatus(ActivityStatusCode.Ok);

            _logger.LogInformation("Order {OrderId} created successfully", order.Id);

            return new OrderResult(order.Id, paymentResult.Id, "completed");
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            _logger.LogError(ex, "Failed to create order {OrderId}", order.Id);
            throw;
        }
    }

    private async Task ValidateOrderAsync(Order order)
    {
        using var activity = ActivitySource.StartActivity("order.validate");

        if (!order.Items.Any())
        {
            throw new ValidationException("Order has no items");
        }

        activity?.AddEvent(new ActivityEvent("validation.passed"));
        await Task.CompletedTask;
    }

    private async Task<PaymentResult> ProcessPaymentAsync(Order order)
    {
        using var activity = ActivitySource.StartActivity("payment.process", ActivityKind.Client);
        activity?.SetTag("payment.amount", order.Total);
        activity?.SetTag("payment.currency", "USD");

        try
        {
            var result = await _paymentGateway.ChargeAsync(order.Total);
            activity?.SetTag("payment.transaction_id", result.TransactionId);
            return result;
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    private async Task FulfillOrderAsync(Order order)
    {
        using var activity = ActivitySource.StartActivity("order.fulfill");
        activity?.SetTag("order.id", order.Id);

        // Fulfillment logic
        await Task.Delay(100);

        activity?.AddEvent(new ActivityEvent("fulfillment.completed"));
    }
}
```

### Activity helper extension

```csharp
public static class ActivityExtensions
{
    public static Activity? StartActivity(
        this ActivitySource source,
        string name,
        ActivityKind kind = ActivityKind.Internal,
        IDictionary<string, object?>? tags = null)
    {
        var activity = source.StartActivity(name, kind);

        if (activity is not null && tags is not null)
        {
            foreach (var (key, value) in tags)
            {
                activity.SetTag(key, value);
            }
        }

        return activity;
    }

    public static void RecordException(this Activity? activity, Exception ex)
    {
        activity?.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
        {
            { "exception.type", ex.GetType().FullName },
            { "exception.message", ex.Message },
            { "exception.stacktrace", ex.StackTrace }
        }));
    }
}
```

---

## 5. HTTP Client Tracing

### HttpClientFactory with tracing

```csharp
// Program.cs
builder.Services.AddHttpClient<IPaymentGateway, PaymentGateway>(client =>
{
    client.BaseAddress = new Uri("https://payments.example.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Service
public class PaymentGateway : IPaymentGateway
{
    private static readonly ActivitySource ActivitySource = new("MyApp.PaymentGateway");
    private readonly HttpClient _httpClient;

    public PaymentGateway(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PaymentResult> ChargeAsync(decimal amount)
    {
        using var activity = ActivitySource.StartActivity("payment.gateway.charge", ActivityKind.Client);
        activity?.SetTag("payment.amount", amount);
        activity?.SetTag("http.url", $"{_httpClient.BaseAddress}charge");

        try
        {
            var request = new { Amount = amount, Currency = "USD" };
            var response = await _httpClient.PostAsJsonAsync("charge", request);

            activity?.SetTag("http.status_code", (int)response.StatusCode);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PaymentResult>();

            activity?.SetTag("payment.transaction_id", result?.TransactionId);
            return result!;
        }
        catch (HttpRequestException ex)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }
}
```

### Manual context propagation

```csharp
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;

public class TracedHttpClient
{
    private static readonly TextMapPropagator Propagator = Propagators.DefaultTextMapPropagator;
    private readonly HttpClient _httpClient;

    public async Task<T?> GetAsync<T>(string url)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);

        // Inject trace context into headers
        Propagator.Inject(
            new PropagationContext(Activity.Current?.Context ?? default, Baggage.Current),
            request.Headers,
            (headers, key, value) => headers.TryAddWithoutValidation(key, value));

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<T>();
    }
}
```

---

## 6. Entity Framework Tracing

### Automatic instrumentation

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddEntityFrameworkCoreInstrumentation(options =>
        {
            options.SetDbStatementForText = true; // Include SQL in spans
            options.SetDbStatementForStoredProcedure = true;
            options.EnrichWithIDbCommand = (activity, command) =>
            {
                activity.SetTag("db.command_type", command.CommandType.ToString());
            };
        }));
```

### Manual repository tracing

```csharp
public class UserRepository : IUserRepository
{
    private static readonly ActivitySource ActivitySource = new("MyApp.UserRepository");
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        using var activity = ActivitySource.StartActivity("db.query.users.select", ActivityKind.Client);
        activity?.SetTag("db.system", "postgresql");
        activity?.SetTag("db.name", "mydb");
        activity?.SetTag("db.operation", "SELECT");
        activity?.SetTag("db.sql.table", "users");

        try
        {
            var user = await _context.Users.FindAsync(id);
            activity?.SetTag("db.rows.found", user is not null);
            return user;
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task<IReadOnlyList<User>> SearchAsync(string query)
    {
        using var activity = ActivitySource.StartActivity("db.query.users.search", ActivityKind.Client);
        activity?.SetTag("db.system", "postgresql");
        activity?.SetTag("db.operation", "SELECT");

        var users = await _context.Users
            .Where(u => u.Name.Contains(query) || u.Email.Contains(query))
            .ToListAsync();

        activity?.SetTag("db.rows.returned", users.Count);
        return users;
    }
}
```

---

## 7. Custom Metrics

### Creating custom meters

```csharp
using System.Diagnostics.Metrics;

public class OrderMetrics
{
    private static readonly Meter Meter = new("MyApp.Orders", "1.0.0");

    private readonly Counter<long> _ordersCreated;
    private readonly Counter<long> _ordersFailed;
    private readonly Histogram<double> _orderValue;
    private readonly UpDownCounter<long> _ordersInProcess;

    public OrderMetrics()
    {
        _ordersCreated = Meter.CreateCounter<long>(
            "orders.created.total",
            unit: "1",
            description: "Total orders created");

        _ordersFailed = Meter.CreateCounter<long>(
            "orders.failed.total",
            unit: "1",
            description: "Total orders failed");

        _orderValue = Meter.CreateHistogram<double>(
            "orders.value",
            unit: "USD",
            description: "Distribution of order values");

        _ordersInProcess = Meter.CreateUpDownCounter<long>(
            "orders.in_process",
            unit: "1",
            description: "Orders currently being processed");
    }

    public void RecordOrderCreated(string orderType, string region, double value)
    {
        var tags = new TagList
        {
            { "order.type", orderType },
            { "order.region", region }
        };

        _ordersCreated.Add(1, tags);
        _orderValue.Record(value, tags);
    }

    public void RecordOrderFailed(string orderType, string reason)
    {
        _ordersFailed.Add(1, new TagList
        {
            { "order.type", orderType },
            { "failure.reason", reason }
        });
    }

    public void IncrementInProcess() => _ordersInProcess.Add(1);
    public void DecrementInProcess() => _ordersInProcess.Add(-1);
}

// Register in DI
builder.Services.AddSingleton<OrderMetrics>();

// Register meter for export
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddMeter("MyApp.Orders"));
```

### Observable gauges

```csharp
public class SystemMetrics
{
    private static readonly Meter Meter = new("MyApp.System", "1.0.0");

    public SystemMetrics()
    {
        Meter.CreateObservableGauge(
            "process.memory.working_set",
            () => Process.GetCurrentProcess().WorkingSet64,
            unit: "By",
            description: "Process working set memory");

        Meter.CreateObservableGauge(
            "process.cpu.time",
            () => Process.GetCurrentProcess().TotalProcessorTime.TotalSeconds,
            unit: "s",
            description: "Total CPU time consumed");

        Meter.CreateObservableGauge(
            "process.threads.count",
            () => Process.GetCurrentProcess().Threads.Count,
            unit: "1",
            description: "Number of threads");
    }
}
```

---

## 8. Structured Logging with Serilog

### Serilog with trace enrichment

```csharp
// Program.cs
using Serilog;
using Serilog.Enrichers.Span;

Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithSpan() // Adds TraceId, SpanId
    .WriteTo.Console(new JsonFormatter())
    .CreateLogger();

builder.Host.UseSerilog();

// Usage - trace context automatically included
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public async Task CreateOrderAsync(Order order)
    {
        // Logs automatically include TraceId and SpanId
        _logger.LogInformation("Creating order {OrderId} with {ItemCount} items",
            order.Id, order.Items.Count);

        try
        {
            await ProcessOrder(order);
            _logger.LogInformation("Order {OrderId} created successfully", order.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create order {OrderId}", order.Id);
            throw;
        }
    }
}
```

### Custom Serilog enricher

```csharp
public class OpenTelemetryEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        var activity = Activity.Current;
        if (activity is null) return;

        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("TraceId", activity.TraceId.ToString()));
        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("SpanId", activity.SpanId.ToString()));
        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ParentSpanId", activity.ParentSpanId.ToString()));

        foreach (var tag in activity.Tags)
        {
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty($"Trace.{tag.Key}", tag.Value));
        }
    }
}

// Register
Log.Logger = new LoggerConfiguration()
    .Enrich.With<OpenTelemetryEnricher>()
    .CreateLogger();
```

---

## 9. gRPC Instrumentation

### gRPC server

```csharp
// Program.cs
builder.Services.AddGrpc();

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddGrpcClientInstrumentation()
        .AddSource("Grpc.AspNetCore.Server")); // Built-in gRPC instrumentation
```

### gRPC service with manual tracing

```csharp
public class UserServiceImpl : UserService.UserServiceBase
{
    private static readonly ActivitySource ActivitySource = new("MyApp.UserService.Grpc");
    private readonly IUserRepository _repository;

    public UserServiceImpl(IUserRepository repository)
    {
        _repository = repository;
    }

    public override async Task<GetUserResponse> GetUser(GetUserRequest request, ServerCallContext context)
    {
        using var activity = ActivitySource.StartActivity("grpc.user.get");
        activity?.SetTag("user.id", request.UserId);

        try
        {
            var user = await _repository.GetByIdAsync(request.UserId);

            if (user is null)
            {
                activity?.SetStatus(ActivityStatusCode.Error, "User not found");
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));
            }

            activity?.SetTag("user.found", true);
            return new GetUserResponse { User = MapToProto(user) };
        }
        catch (Exception ex) when (ex is not RpcException)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw new RpcException(new Status(StatusCode.Internal, ex.Message));
        }
    }
}
```

### gRPC client

```csharp
// Program.cs
builder.Services.AddGrpcClient<UserService.UserServiceClient>(options =>
{
    options.Address = new Uri("https://localhost:5001");
});

// Client usage
public class UserClient
{
    private static readonly ActivitySource ActivitySource = new("MyApp.UserClient.Grpc");
    private readonly UserService.UserServiceClient _client;

    public UserClient(UserService.UserServiceClient client)
    {
        _client = client;
    }

    public async Task<User> GetUserAsync(string userId)
    {
        using var activity = ActivitySource.StartActivity("grpc.user.get", ActivityKind.Client);
        activity?.SetTag("user.id", userId);

        try
        {
            var response = await _client.GetUserAsync(new GetUserRequest { UserId = userId });
            activity?.SetTag("user.found", true);
            return MapFromProto(response.User);
        }
        catch (RpcException ex)
        {
            activity?.SetTag("grpc.status_code", ex.StatusCode.ToString());
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }
}
```

---

## 10. Background Services

### IHostedService with tracing

```csharp
public class OrderProcessingBackgroundService : BackgroundService
{
    private static readonly ActivitySource ActivitySource = new("MyApp.OrderProcessor");
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderProcessingBackgroundService> _logger;

    public OrderProcessingBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<OrderProcessingBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = ActivitySource.StartActivity("order.batch.process");
            activity?.SetTag("batch.start_time", DateTime.UtcNow.ToString("O"));

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();

                var pendingOrders = await orderService.GetPendingOrdersAsync();
                activity?.SetTag("batch.size", pendingOrders.Count);

                foreach (var order in pendingOrders)
                {
                    using var orderActivity = ActivitySource.StartActivity("order.process");
                    orderActivity?.SetTag("order.id", order.Id);

                    try
                    {
                        await orderService.ProcessOrderAsync(order);
                        orderActivity?.SetStatus(ActivityStatusCode.Ok);
                    }
                    catch (Exception ex)
                    {
                        orderActivity?.RecordException(ex);
                        orderActivity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                        _logger.LogError(ex, "Failed to process order {OrderId}", order.Id);
                    }
                }

                activity?.AddEvent(new ActivityEvent("batch.completed"));
            }
            catch (Exception ex)
            {
                activity?.RecordException(ex);
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                _logger.LogError(ex, "Batch processing failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

### Message consumer with context propagation

```csharp
public class MessageConsumer : BackgroundService
{
    private static readonly ActivitySource ActivitySource = new("MyApp.MessageConsumer");
    private static readonly TextMapPropagator Propagator = Propagators.DefaultTextMapPropagator;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in _messageQueue.ConsumeAsync(stoppingToken))
        {
            // Extract trace context from message headers
            var parentContext = Propagator.Extract(
                default,
                message.Headers,
                (headers, key) => headers.TryGetValue(key, out var value) ? new[] { value } : Array.Empty<string>());

            using var activity = ActivitySource.StartActivity(
                "message.process",
                ActivityKind.Consumer,
                parentContext.ActivityContext);

            activity?.SetTag("messaging.system", "rabbitmq");
            activity?.SetTag("messaging.destination", message.Queue);
            activity?.SetTag("messaging.message_id", message.Id);

            try
            {
                await ProcessMessageAsync(message);
                activity?.SetStatus(ActivityStatusCode.Ok);
            }
            catch (Exception ex)
            {
                activity?.RecordException(ex);
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            }
        }
    }
}
```

---

## 11. Sampling Configuration

### Programmatic sampling

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        // Always sample (development)
        .SetSampler(new AlwaysOnSampler())

        // Never sample
        // .SetSampler(new AlwaysOffSampler())

        // Ratio-based (10%)
        // .SetSampler(new TraceIdRatioBasedSampler(0.1))

        // Parent-based (production recommended)
        .SetSampler(new ParentBasedSampler(new TraceIdRatioBasedSampler(0.1))));
```

### Custom sampler

```csharp
public class ErrorBiasedSampler : Sampler
{
    private readonly Sampler _baseSampler;

    public ErrorBiasedSampler(double ratio)
    {
        _baseSampler = new TraceIdRatioBasedSampler(ratio);
    }

    public override SamplingResult ShouldSample(in SamplingParameters samplingParameters)
    {
        // Always sample if error tag is set
        foreach (var tag in samplingParameters.Tags ?? Enumerable.Empty<KeyValuePair<string, object?>>())
        {
            if (tag.Key == "error" && tag.Value is true)
            {
                return new SamplingResult(SamplingDecision.RecordAndSample);
            }
        }

        return _baseSampler.ShouldSample(samplingParameters);
    }
}
```

### Environment-based configuration

```bash
# Environment variables
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

---

## 12. Production Deployment

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MyApp.csproj", "."]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp

ENTRYPOINT ["dotnet", "MyApp.dll"]
```

### Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-service
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-dotnet-service:latest
          env:
            - name: OTEL_SERVICE_NAME
              value: "dotnet-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.monitoring:4317"
            - name: ONEUPTIME_TOKEN
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: token
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "k8s.pod.name=$(POD_NAME),k8s.namespace.name=$(POD_NAMESPACE)"
          resources:
            limits:
              memory: "512Mi"
              cpu: "500m"
```

### appsettings.json

```json
{
  "OpenTelemetry": {
    "ServiceName": "my-dotnet-service",
    "ServiceVersion": "1.0.0",
    "Exporter": {
      "Otlp": {
        "Endpoint": "https://oneuptime.com/otlp"
      }
    },
    "Tracing": {
      "SamplingRatio": 0.1
    }
  }
}
```

---

## 13. Performance Considerations

### Batch processor tuning

```csharp
.AddOtlpExporter(options =>
{
    options.BatchExportProcessorOptions = new BatchExportProcessorOptions<Activity>
    {
        MaxQueueSize = 2048,
        ScheduledDelayMilliseconds = 5000,
        ExporterTimeoutMilliseconds = 30000,
        MaxExportBatchSize = 512
    };
});
```

### Filtering noisy spans

```csharp
.AddAspNetCoreInstrumentation(options =>
{
    // Filter out health checks and static files
    options.Filter = context =>
        !context.Request.Path.StartsWithSegments("/health") &&
        !context.Request.Path.StartsWithSegments("/metrics") &&
        !context.Request.Path.StartsWithSegments("/static");

    // Enrich spans
    options.EnrichWithHttpRequest = (activity, request) =>
    {
        activity.SetTag("http.client_ip", request.HttpContext.Connection.RemoteIpAddress?.ToString());
    };

    options.EnrichWithHttpResponse = (activity, response) =>
    {
        activity.SetTag("http.response_content_length", response.ContentLength);
    };
});
```

---

## 14. Common Patterns and Best Practices

| Pattern | Description |
|---------|-------------|
| Use ActivitySource | Consistent activity creation across the app |
| Register sources | `AddSource("MyApp.*")` to export custom activities |
| Set status explicitly | Always set `ActivityStatusCode` on completion |
| Record exceptions | Use `RecordException` for full stack traces |
| Filter noise | Exclude health checks, metrics endpoints |
| Sample appropriately | 10% base with parent-based fallback |

### Error handling pattern

```csharp
public async Task<T> ExecuteWithTracingAsync<T>(string operationName, Func<Task<T>> operation)
{
    using var activity = ActivitySource.StartActivity(operationName);

    try
    {
        var result = await operation();
        activity?.SetStatus(ActivityStatusCode.Ok);
        return result;
    }
    catch (Exception ex)
    {
        activity?.RecordException(ex);
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        throw;
    }
}
```

---

## Summary

| Component | Instrumentation |
|-----------|-----------------|
| ASP.NET Core | `AddAspNetCoreInstrumentation()` |
| HttpClient | `AddHttpClientInstrumentation()` |
| EF Core | `AddEntityFrameworkCoreInstrumentation()` |
| SQL Client | `AddSqlClientInstrumentation()` |
| gRPC | `AddGrpcClientInstrumentation()` |
| Custom | `ActivitySource` + `AddSource()` |

.NET's OpenTelemetry SDK integrates seamlessly with the .NET ecosystem. Start with automatic instrumentation, add custom activities for business logic, and export to OneUptime for unified observability.

---

*Ready to observe your .NET services? Send telemetry to [OneUptime](https://oneuptime.com) and correlate traces with metrics and logs.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/)
- [Entity Framework and Database Tracing](/blog/post/2025-12-17-opentelemetry-database-tracing/)
- [OpenTelemetry Collector](/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/)
