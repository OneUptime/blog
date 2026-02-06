# How to Use the JetBrains Rider OpenTelemetry Plugin for In-IDE Trace and Metric Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, JetBrains Rider, .NET, Traces, Metrics

Description: Install and configure the JetBrains Rider OpenTelemetry plugin to visualize traces and metrics directly inside your IDE.

JetBrains Rider is a popular IDE for .NET development, and its OpenTelemetry plugin brings trace and metric visualization directly into the editor. Instead of switching to a browser to check Jaeger or Grafana, you can inspect the telemetry your application produces without leaving Rider. This post covers installation, configuration, and practical usage patterns.

## Installing the Plugin

Open Rider and go to Settings (Ctrl+Alt+S on Windows/Linux, Cmd+, on macOS). Navigate to Plugins and search for "OpenTelemetry" in the Marketplace tab. Install the plugin and restart Rider.

You can also install it from the JetBrains Marketplace website by searching for the OpenTelemetry plugin and clicking "Install to Rider."

After restarting, you will find a new "OpenTelemetry" tool window at the bottom of the IDE.

## Configuring Your .NET Application

The plugin works by receiving OTLP data that your application exports. You need to configure your .NET application to send traces and metrics to a local endpoint. Add the required NuGet packages:

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

// Configure OpenTelemetry tracing
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("my-rider-app"))
    .WithTracing(tracing => tracing
        // Instrument incoming HTTP requests
        .AddAspNetCoreInstrumentation()
        // Instrument outgoing HTTP calls
        .AddHttpClientInstrumentation()
        // Export via OTLP to the local collector or plugin receiver
        .AddOtlpExporter(opts =>
        {
            opts.Endpoint = new Uri("http://localhost:4318/v1/traces");
            opts.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
        }))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opts =>
        {
            opts.Endpoint = new Uri("http://localhost:4318/v1/metrics");
            opts.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
        }));

var app = builder.Build();

app.MapGet("/", () => "Hello from Rider with OpenTelemetry!");
app.MapGet("/weather", async (HttpClient client) =>
{
    // This outgoing call will be traced automatically
    var response = await client.GetStringAsync("https://api.weather.gov/points/39.7456,-97.0892");
    return response;
});

app.Run();
```

## Using the OpenTelemetry Tool Window

Run your application from Rider using the standard Run or Debug configuration. As requests come in, the OpenTelemetry tool window populates with trace data.

The tool window has several views:

**Trace View** shows a list of traces with their root span name, duration, and service name. Click on a trace to expand it into a waterfall diagram showing all spans and their timing relationships.

**Span Details** appears when you select a specific span. It shows attributes, events, and status. For ASP.NET Core spans, you will see attributes like:

- `http.request.method`
- `url.path`
- `http.response.status_code`
- `server.address`

**Metrics View** displays runtime metrics like request duration histograms, active request counts, and custom metrics you define.

## Adding Custom Spans for Better Visibility

Auto-instrumentation covers HTTP and database calls, but your business logic is where the interesting debugging happens. Add custom spans using the `ActivitySource` API (which is .NET's implementation of the OpenTelemetry tracer):

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

The real power of in-IDE traces appears during debugging. Set a breakpoint in your code and run in Debug mode. When you hit the breakpoint, check the OpenTelemetry tool window. You can see the active span for the current request, including all the attributes and events recorded so far.

This gives you two perspectives simultaneously: the code-level view from the debugger and the distributed-system view from the trace. If your breakpoint is inside a method that is called by another service, the trace shows you the full chain of calls that led to this point.

## Filtering and Navigation

The plugin supports filtering traces by service name, span name, status, and duration. If you are looking for slow requests, sort by duration. If you are hunting for errors, filter by error status.

Double-clicking a span attribute that contains a file path or class name navigates you to that location in the code. This tight integration between traces and source code is what makes the in-IDE experience valuable.

## Wrapping Up

The JetBrains Rider OpenTelemetry plugin eliminates the context switch between your IDE and external observability tools during development. You write code, run it, and see the traces right there in the same window. For .NET developers working on distributed systems, this kind of tight feedback loop makes instrumentation feel like a natural part of the development workflow rather than an afterthought.
