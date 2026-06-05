# How to Use the JetBrains Rider OpenTelemetry Plugin for In-IDE Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, JetBrains Rider, .NET, Trace, Metric

Description: Install and configure the JetBrains Rider OpenTelemetry plugin to visualize traces and metrics directly inside your IDE.

JetBrains Rider is a popular IDE for .NET development, and its OpenTelemetry plugin brings trace, metric, and log visualization directly into the editor. Instead of switching to a browser to check Jaeger or Grafana, you can inspect the telemetry your application produces without leaving Rider. This post covers installation, configuration, and practical usage patterns.

## Installing the Plugin

Open Rider and go to Settings (Ctrl+Alt+S on Windows/Linux, Cmd+, on macOS). Navigate to Plugins and search for "OpenTelemetry" in the Marketplace tab. Install the plugin and restart Rider.

You can also install it from the JetBrains Marketplace website by searching for the OpenTelemetry plugin and clicking "Install to Rider."

After restarting, you will find a new "OpenTelemetry" service in the Services window.

## Configuring Your .NET Application

The plugin works by receiving OTLP data that your application exports. For .NET applications launched from Rider, the IDE can set the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable automatically, so your application only needs to add the OTLP exporter without hard-coding an endpoint. Add the required NuGet packages:

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
```

Then configure OpenTelemetry in your `Program.cs`:

```csharp
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();

// Configure OpenTelemetry tracing
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("my-rider-app"))
    .WithTracing(tracing => tracing
        // Instrument incoming HTTP requests
        .AddAspNetCoreInstrumentation()
        // Instrument outgoing HTTP calls
        .AddHttpClientInstrumentation()
        // Export via OTLP to Rider's endpoint from OTEL_EXPORTER_OTLP_ENDPOINT
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddMeter("Microsoft.AspNetCore.Hosting")
        .AddMeter("Microsoft.AspNetCore.Server.Kestrel")
        .AddOtlpExporter());

var app = builder.Build();

app.MapGet("/", () => "Hello from Rider with OpenTelemetry!");
app.MapGet("/weather", async (IHttpClientFactory clientFactory) =>
{
    // This outgoing call will be traced automatically
    var client = clientFactory.CreateClient();
    var response = await client.GetStringAsync("https://api.weather.gov/points/39.7456,-97.0892");
    return response;
});

app.Run();
```

If you run the application outside Rider, configure the plugin to use a fixed OTLP server port and point your exporter to `http://localhost:<port>`. Rider's OpenTelemetry service supports OTLP over gRPC, so you do not need to add `/v1/traces` or `/v1/metrics` paths for that direct-to-Rider setup.

## Using the OpenTelemetry Service View

Run your application from Rider using the standard Run or Debug configuration. As requests come in, the OpenTelemetry service in the Services window populates with telemetry data.

The service view has several tabs:

**Traces** shows a list of traces with their details. Select a trace and click Examine Trace to expand it into a span view showing all spans and their timing relationships.

**Span Details** appears when you select a specific span. It shows attributes, events, and status. For ASP.NET Core spans, you will see attributes like:

- `http.request.method`
- `url.path`
- `http.response.status_code`
- `server.address`

**Metrics View** displays metrics emitted by your configured instrumentation and meters, such as request duration histograms, active request counts, and custom metrics you define.

## Adding Custom Spans for Better Visibility

Instrumentation libraries can cover incoming and outgoing HTTP calls, but your business logic is where the interesting debugging happens. Add custom spans using the `ActivitySource` API (which is .NET's implementation of the OpenTelemetry tracer):

```csharp
using System.Diagnostics;

public class OrderService
{
    // Define an ActivitySource for this service
    private static readonly ActivitySource Source = new("OrderService");

    public async Task<Order> ProcessOrder(OrderRequest request)
    {
        // Start a new span for order processing
        using var activity = Source.StartActivity("ProcessOrder");
        activity?.SetTag("order.customer_id", request.CustomerId);
        activity?.SetTag("order.item_count", request.Items.Count);

        // Validate the order
        using (var validateActivity = Source.StartActivity("ValidateOrder"))
        {
            ValidateItems(request.Items);
            validateActivity?.SetTag("validation.passed", true);
        }

        // Calculate pricing
        using (var pricingActivity = Source.StartActivity("CalculatePricing"))
        {
            var total = CalculateTotal(request.Items);
            pricingActivity?.SetTag("order.total", total);
        }

        // Submit the order
        var order = await SubmitOrder(request);
        activity?.SetTag("order.id", order.Id);

        return order;
    }
}
```

Register the `ActivitySource` with OpenTelemetry in `Program.cs`:

```csharp
.WithTracing(tracing => tracing
    .AddSource("OrderService")  // Register custom source
    .AddAspNetCoreInstrumentation()
    .AddHttpClientInstrumentation()
    .AddOtlpExporter(/* ... */))
```

Now when you process an order, the Rider plugin shows the `ProcessOrder` span with nested `ValidateOrder` and `CalculatePricing` child spans, each with their custom attributes.

## Debugging with Traces

The real power of in-IDE traces appears during debugging. Set a breakpoint in your code and run in Debug mode. When the request completes and spans are exported, check the OpenTelemetry service in the Services window. You can see the completed spans for the current request, including their attributes, events, and status.

This gives you two perspectives simultaneously: the code-level view from the debugger and the distributed-system view from the trace. If your breakpoint is inside a method that is called by another service, the trace shows you the full chain of calls that led to this point.

## Filtering and Navigation

The plugin supports filtering traces by time, duration, and trace ID. If you are looking for slow requests, filter or sort by duration.

For logs, the Navigate To Code action can jump from a log entry to the corresponding source code location when the log record includes the required original message template attribute. This tight integration between telemetry and source code is what makes the in-IDE experience valuable.

## Wrapping Up

The JetBrains Rider OpenTelemetry plugin eliminates the context switch between your IDE and external observability tools during development. You write code, run it, and see the traces right there in the same window. For .NET developers working on distributed systems, this kind of tight feedback loop makes instrumentation feel like a natural part of the development workflow rather than an afterthought.
