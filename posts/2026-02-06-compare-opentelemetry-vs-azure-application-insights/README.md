# How to Compare OpenTelemetry vs Azure Application Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Azure, Application Insights, Observability, Cloud Monitoring

Description: A practical comparison of OpenTelemetry and Azure Application Insights for application monitoring, covering SDKs, data export, and hybrid strategies.

---

Azure Application Insights is Microsoft's APM solution within the Azure Monitor ecosystem. It provides deep integration with Azure services and a rich analysis experience through the Azure portal. OpenTelemetry offers a vendor-neutral alternative that can also export to Application Insights. This article compares the two approaches and helps you decide which path makes sense for your workloads.

## The Convergence Story

Microsoft has been one of the most active contributors to OpenTelemetry. In fact, the Application Insights SDKs for .NET, Java, Python, and JavaScript have been moving toward OpenTelemetry-based implementations since 2023. The Azure Monitor OpenTelemetry Distro is now the recommended way to instrument new applications for Application Insights.

This means the comparison is less about "one or the other" and more about "how much of the Azure-specific experience do you want versus a pure OpenTelemetry approach."

## Instrumentation Approaches

The classic Application Insights SDK:

```csharp
// Traditional Application Insights SDK for .NET
// Tightly coupled to Azure Monitor backend
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;

var config = TelemetryConfiguration.CreateDefault();
// Connection string ties instrumentation to Azure Monitor
config.ConnectionString = "InstrumentationKey=your-key;IngestionEndpoint=https://eastus-1.in.applicationinsights.azure.com/";

var client = new TelemetryClient(config);

// Track a custom event with properties
client.TrackEvent("OrderProcessed", new Dictionary<string, string>
{
    { "OrderId", orderId },
    { "Region", "us-east" }
});

// Track a dependency call manually
var dependency = new DependencyTelemetry
{
    Name = "GET /api/inventory",
    Target = "inventory-service",
    Data = $"/api/inventory/{itemId}",
    Duration = TimeSpan.FromMilliseconds(145),
    Success = true
};
client.TrackDependency(dependency);
```

The Azure Monitor OpenTelemetry Distro approach:

```csharp
// Azure Monitor OpenTelemetry Distro for .NET
// Uses standard OpenTelemetry APIs with Azure Monitor export
using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

var builder = WebApplication.CreateBuilder(args);

// Add Azure Monitor with OpenTelemetry under the hood
builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
{
    options.ConnectionString = "InstrumentationKey=your-key;...";
});

var app = builder.Build();

// Now use standard OpenTelemetry APIs for custom telemetry
var tracer = app.Services.GetRequiredService<TracerProvider>()
    .GetTracer("order-service");

app.MapPost("/orders", async (Order order) =>
{
    // Standard OTel span creation
    using var span = tracer.StartActiveSpan("process-order");
    span.SetAttribute("order.id", order.Id);
    span.SetAttribute("order.region", "us-east");

    await ProcessOrder(order);
    return Results.Created($"/orders/{order.Id}", order);
});
```

The distro approach gives you standard OpenTelemetry APIs while still exporting to Application Insights. This is now Microsoft's recommended path.

## Pure OpenTelemetry with Azure Monitor Exporter

You can also use a completely standard OpenTelemetry setup with just the Azure Monitor exporter:

```csharp
// Pure OpenTelemetry setup with Azure Monitor exporter
// Maximum portability with Azure Monitor as one of potentially many backends
using OpenTelemetry;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;
using OpenTelemetry.Logs;
using Azure.Monitor.OpenTelemetry.Exporter;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry with explicit control over each signal
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddSqlClientInstrumentation()
            // Export to Azure Monitor
            .AddAzureMonitorTraceExporter(o =>
                o.ConnectionString = connectionString)
            // Also export to a local OTel Collector for flexibility
            .AddOtlpExporter(o =>
                o.Endpoint = new Uri("http://otel-collector:4317"));
    })
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddAzureMonitorMetricExporter(o =>
                o.ConnectionString = connectionString);
    });

// Configure logging with OpenTelemetry
builder.Logging.AddOpenTelemetry(logging =>
{
    logging.AddAzureMonitorLogExporter(o =>
        o.ConnectionString = connectionString);
});
```

This approach gives you full control and the ability to send data to multiple backends simultaneously.

## Feature Comparison

| Feature | App Insights Classic | OTel + Azure Exporter | Pure OTel |
|---------|---------------------|----------------------|-----------|
| Auto-instrumentation | Deep, Azure-aware | Good, standard OTel | Good, standard OTel |
| Application Map | Full support | Full support | Not available |
| Live Metrics Stream | Yes | Yes (via distro) | No |
| Smart Detection | Yes | Yes | No |
| Profiler | Yes (Snapshot Debugger) | Limited | No |
| Multi-backend export | No | Possible | Yes |
| Vendor portability | No | Partial | Full |
| KQL queries | Yes | Yes | Backend-dependent |

The Application Map and Smart Detection features are powered by the Application Insights backend. They work regardless of whether you use the classic SDK or OpenTelemetry, as long as data flows to Azure Monitor.

## Java Auto-Instrumentation

For Java applications, Azure has a particularly smooth auto-instrumentation experience:

```yaml
# Application Insights Java agent configuration
# Provides zero-code instrumentation for Java applications
{
  "connectionString": "InstrumentationKey=your-key;...",
  "role": {
    "name": "order-service"
  },
  "instrumentation": {
    "micrometer": {
      "enabled": true
    }
  },
  "preview": {
    "openTelemetryApiSupport": true,
    "instrumentation": {
      "springIntegration": {
        "enabled": true
      }
    }
  }
}
```

This Java agent is actually built on OpenTelemetry internals. It auto-instruments most popular Java frameworks and exports data to Application Insights without code changes.

The pure OpenTelemetry Java agent works similarly:

```bash
# Running a Java app with the OpenTelemetry Java agent
# Auto-instruments the application and exports to OTLP endpoint
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=order-service \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
  -jar app.jar
```

## Cost and Pricing Model

Application Insights charges based on data ingestion (per GB) and data retention. As of 2026, the first 5 GB per month are free, with additional data at approximately $2.30 per GB. Long-term retention beyond 90 days costs extra.

With pure OpenTelemetry, you control your costs by choosing your backend. Self-hosted options like Jaeger or Grafana Tempo can dramatically reduce costs for high-volume workloads. The trade-off is that you manage the infrastructure yourself.

A hybrid approach works well for many teams: send critical application traces to Application Insights for its analysis features, and send high-volume infrastructure telemetry to a self-hosted backend through the OTel Collector.

```yaml
# OTel Collector routing data to multiple backends
# Critical traces go to Azure Monitor, bulk data goes to self-hosted
exporters:
  azuremonitor:
    connection_string: "InstrumentationKey=your-key;..."

  otlp/tempo:
    endpoint: "tempo.internal:4317"

processors:
  # Route based on attributes
  filter/critical:
    traces:
      span:
        - 'attributes["app.tier"] == "critical"'

service:
  pipelines:
    # All traces go to Tempo for long-term storage
    traces/all:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
    # Critical traces also go to Application Insights
    traces/critical:
      receivers: [otlp]
      processors: [filter/critical, batch]
      exporters: [azuremonitor]
```

## Migration Strategy

If you are currently using the classic Application Insights SDK and want to move toward OpenTelemetry, here is a practical migration path:

1. Start with the Azure Monitor OpenTelemetry Distro. It is a drop-in replacement that still exports to Application Insights.
2. Replace custom `TelemetryClient` calls with standard OpenTelemetry API calls (tracers, meters, loggers).
3. Once instrumentation is fully OpenTelemetry-based, you can add additional exporters alongside the Azure Monitor exporter.
4. Eventually, you can remove the Azure Monitor exporter entirely if you choose a different backend.

This incremental approach avoids any disruption to your existing monitoring setup.

## When to Use Each Approach

Use the Azure Monitor OpenTelemetry Distro when:

- You want Application Insights features (Application Map, Smart Detection)
- Your team relies on KQL queries in the Azure portal
- You need Azure-specific auto-instrumentation features
- You want the simplest path that still uses OpenTelemetry APIs

Use pure OpenTelemetry when:

- Vendor portability is a hard requirement
- You run workloads across multiple clouds
- You want full control over your telemetry pipeline
- Cost optimization requires self-hosted backends

## Conclusion

The line between Azure Application Insights and OpenTelemetry is blurring. Microsoft's investment in OpenTelemetry means you can use standard APIs and still get the Application Insights experience. For new projects on Azure, the Azure Monitor OpenTelemetry Distro is the sweet spot. For multi-cloud or vendor-neutral strategies, pure OpenTelemetry with the Azure Monitor exporter as one of several backends gives you maximum flexibility.
