# How to Configure OpenTelemetry for .NET Framework 4.6.2+ Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET Framework, Legacy, Configuration, Tracing

Description: Complete guide to implementing OpenTelemetry in .NET Framework 4.6.2+ applications with practical examples and production-ready configurations.

Working with legacy .NET Framework applications doesn't mean you should sacrifice modern observability. OpenTelemetry support for .NET Framework 4.6.2 and later versions brings standardized telemetry collection to your existing applications without requiring a full migration to .NET Core or .NET 5+.

The challenge with .NET Framework is its older runtime architecture and different dependency injection patterns compared to modern .NET. However, the OpenTelemetry team has created compatibility packages that bridge this gap effectively.

## Understanding .NET Framework Limitations

Before diving into implementation, you need to understand what differs in .NET Framework:

.NET Framework lacks the built-in dependency injection container that ASP.NET Core provides. You'll need to manually manage the lifecycle of OpenTelemetry SDK instances. The instrumentation libraries also have different initialization patterns since they can't hook into the generic host builder pattern.

Additionally, some automatic instrumentation features available in modern .NET require runtime capabilities that simply don't exist in .NET Framework. You'll rely more heavily on manual instrumentation in certain areas.

## Installing Required Packages

Start by installing the core OpenTelemetry packages that support .NET Framework.

```xml
<!-- Add these to your packages.config or .csproj -->
<PackageReference Include="OpenTelemetry" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Exporter.Console" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.SqlClient" Version="1.7.0-rc.1" />
```

The HTTP and SqlClient instrumentation packages provide automatic tracing for outbound HTTP calls and database operations, which covers the most common scenarios in enterprise .NET Framework applications.

## Creating a TracerProvider Singleton

Since there's no dependency injection container, you'll create a singleton pattern to manage the OpenTelemetry SDK lifecycle.

```csharp
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System;

namespace YourApplication.Telemetry
{
    public sealed class TelemetryManager
    {
        private static readonly Lazy<TelemetryManager> instance =
            new Lazy<TelemetryManager>(() => new TelemetryManager());

        private readonly TracerProvider tracerProvider;
        private bool disposed = false;

        public static TelemetryManager Instance => instance.Value;

        private TelemetryManager()
        {
            tracerProvider = Sdk.CreateTracerProviderBuilder()
                .SetResourceBuilder(ResourceBuilder.CreateDefault()
                    .AddService(
                        serviceName: "legacy-api-service",
                        serviceVersion: "1.0.0",
                        serviceInstanceId: Environment.MachineName))
                .AddHttpClientInstrumentation(options =>
                {
                    options.RecordException = true;
                    // Filter out health check endpoints
                    options.FilterHttpRequestMessage = (request) =>
                    {
                        return !request.RequestUri.AbsolutePath.Contains("/health");
                    };
                })
                .AddSqlClientInstrumentation(options =>
                {
                    options.SetDbStatementForText = true;
                    options.RecordException = true;
                    options.EnableConnectionLevelAttributes = true;
                })
                .AddSource("YourApplication.*")
                .AddOtlpExporter(options =>
                {
                    options.Endpoint = new Uri("http://localhost:4317");
                    options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.Grpc;
                })
                .Build();
        }

        public void Dispose()
        {
            if (!disposed)
            {
                tracerProvider?.Dispose();
                disposed = true;
            }
        }
    }
}
```

This singleton initialization ensures OpenTelemetry starts when your application starts. Call `TelemetryManager.Instance` early in your application startup to trigger initialization.

## Integrating with Global.asax for Web Applications

For ASP.NET Web API or MVC applications, hook into the Global.asax lifecycle events.

```csharp
using System;
using System.Web;
using System.Web.Http;
using YourApplication.Telemetry;

namespace YourApplication
{
    public class WebApiApplication : HttpApplication
    {
        protected void Application_Start()
        {
            // Standard Web API configuration
            GlobalConfiguration.Configure(WebApiConfig.Register);

            // Initialize OpenTelemetry
            var telemetry = TelemetryManager.Instance;

            // Register cleanup on application shutdown
            RegisterForDispose(telemetry);
        }

        protected void Application_End()
        {
            // Ensure telemetry is flushed before shutdown
            TelemetryManager.Instance.Dispose();
        }

        protected void Application_BeginRequest(object sender, EventArgs e)
        {
            // Create a root span for each HTTP request
            var context = HttpContext.Current;
            if (context != null)
            {
                RequestTracingHelper.StartRequestSpan(context);
            }
        }

        protected void Application_EndRequest(object sender, EventArgs e)
        {
            var context = HttpContext.Current;
            if (context != null)
            {
                RequestTracingHelper.EndRequestSpan(context);
            }
        }
    }
}
```

## Manual Request Instrumentation Helper

Since ASP.NET doesn't have built-in OpenTelemetry middleware like ASP.NET Core, create a helper class to manage request spans.

```csharp
using OpenTelemetry.Trace;
using System;
using System.Diagnostics;
using System.Web;

namespace YourApplication.Telemetry
{
    public static class RequestTracingHelper
    {
        private static readonly ActivitySource activitySource =
            new ActivitySource("YourApplication.WebAPI");

        private const string ActivityKey = "OpenTelemetry.Activity";

        public static void StartRequestSpan(HttpContext context)
        {
            var request = context.Request;

            // Start a new activity for this request
            var activity = activitySource.StartActivity(
                $"{request.HttpMethod} {request.Path}",
                ActivityKind.Server);

            if (activity != null)
            {
                // Add standard HTTP attributes
                activity.SetTag("http.method", request.HttpMethod);
                activity.SetTag("http.url", request.Url.ToString());
                activity.SetTag("http.target", request.Path);
                activity.SetTag("http.host", request.Url.Host);
                activity.SetTag("http.scheme", request.Url.Scheme);
                activity.SetTag("http.user_agent", request.UserAgent);

                if (request.UrlReferrer != null)
                {
                    activity.SetTag("http.referrer", request.UrlReferrer.ToString());
                }

                // Store activity in context for later retrieval
                context.Items[ActivityKey] = activity;
            }
        }

        public static void EndRequestSpan(HttpContext context)
        {
            var activity = context.Items[ActivityKey] as Activity;
            if (activity != null)
            {
                var response = context.Response;

                activity.SetTag("http.status_code", response.StatusCode);

                // Mark as error if status code indicates failure
                if (response.StatusCode >= 400)
                {
                    activity.SetStatus(ActivityStatusCode.Error);
                }
                else
                {
                    activity.SetStatus(ActivityStatusCode.Ok);
                }

                activity.Stop();
            }
        }

        public static Activity GetCurrentActivity(HttpContext context)
        {
            return context?.Items[ActivityKey] as Activity;
        }
    }
}
```

## Creating Custom Spans in Business Logic

For tracing business operations, manually create spans using the Activity API.

```csharp
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace YourApplication.Services
{
    public class OrderProcessingService
    {
        private static readonly ActivitySource activitySource =
            new ActivitySource("YourApplication.Services");

        public async Task<Order> ProcessOrderAsync(OrderRequest request)
        {
            // Create a span for the entire operation
            using (var activity = activitySource.StartActivity("ProcessOrder"))
            {
                activity?.SetTag("order.id", request.OrderId);
                activity?.SetTag("order.customer_id", request.CustomerId);
                activity?.SetTag("order.total", request.TotalAmount);

                try
                {
                    // Validate order
                    await ValidateOrderAsync(request);

                    // Calculate pricing
                    var pricing = await CalculatePricingAsync(request);

                    // Save to database
                    var order = await SaveOrderAsync(request, pricing);

                    activity?.SetTag("order.final_amount", order.FinalAmount);

                    return order;
                }
                catch (Exception ex)
                {
                    activity?.RecordException(ex);
                    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                    throw;
                }
            }
        }

        private async Task ValidateOrderAsync(OrderRequest request)
        {
            using (var activity = activitySource.StartActivity("ValidateOrder"))
            {
                // Validation logic here
                await Task.Delay(50); // Simulating validation

                activity?.AddEvent(new ActivityEvent("Validation completed"));
            }
        }

        private async Task<PricingResult> CalculatePricingAsync(OrderRequest request)
        {
            using (var activity = activitySource.StartActivity("CalculatePricing"))
            {
                // Pricing calculation logic
                await Task.Delay(100); // Simulating calculation

                var result = new PricingResult();
                activity?.SetTag("pricing.discount_applied", result.DiscountApplied);

                return result;
            }
        }

        private async Task<Order> SaveOrderAsync(OrderRequest request, PricingResult pricing)
        {
            using (var activity = activitySource.StartActivity("SaveOrder"))
            {
                // Database save operation (SqlClient instrumentation will auto-trace)
                await Task.Delay(75); // Simulating save

                return new Order { /* populated order */ };
            }
        }
    }
}
```

## Handling Distributed Tracing Context

For distributed tracing across services, propagate trace context in HTTP headers.

```csharp
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;
using System;
using System.Diagnostics;
using System.Net.Http;

namespace YourApplication.Http
{
    public class DistributedTracingHandler : DelegatingHandler
    {
        private static readonly TextMapPropagator propagator = Propagators.DefaultTextMapPropagator;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var currentActivity = Activity.Current;

            if (currentActivity != null)
            {
                // Inject trace context into outgoing request headers
                propagator.Inject(
                    new PropagationContext(currentActivity.Context, Baggage.Current),
                    request,
                    (r, key, value) => r.Headers.Add(key, value));
            }

            return await base.SendAsync(request, cancellationToken);
        }
    }

    // Usage in HttpClient creation
    public class HttpClientFactory
    {
        public static HttpClient CreateClient()
        {
            var handler = new DistributedTracingHandler
            {
                InnerHandler = new HttpClientHandler()
            };

            return new HttpClient(handler);
        }
    }
}
```

## Configuration Management

Store OpenTelemetry configuration in Web.config or App.config for easy updates.

```xml
<configuration>
  <appSettings>
    <add key="OpenTelemetry:ServiceName" value="legacy-api-service" />
    <add key="OpenTelemetry:ServiceVersion" value="1.0.0" />
    <add key="OpenTelemetry:OtlpEndpoint" value="http://localhost:4317" />
    <add key="OpenTelemetry:EnableConsoleExporter" value="false" />
    <add key="OpenTelemetry:SamplingRatio" value="1.0" />
  </appSettings>
</configuration>
```

Read these settings in your TelemetryManager initialization.

```csharp
using System.Configuration;

private TelemetryManager()
{
    var serviceName = ConfigurationManager.AppSettings["OpenTelemetry:ServiceName"] ?? "unknown-service";
    var serviceVersion = ConfigurationManager.AppSettings["OpenTelemetry:ServiceVersion"] ?? "1.0.0";
    var otlpEndpoint = ConfigurationManager.AppSettings["OpenTelemetry:OtlpEndpoint"] ?? "http://localhost:4317";
    var samplingRatio = double.Parse(ConfigurationManager.AppSettings["OpenTelemetry:SamplingRatio"] ?? "1.0");

    tracerProvider = Sdk.CreateTracerProviderBuilder()
        .SetResourceBuilder(ResourceBuilder.CreateDefault()
            .AddService(serviceName, serviceVersion))
        .SetSampler(new TraceIdRatioBasedSampler(samplingRatio))
        // ... rest of configuration
        .Build();
}
```

## Performance Considerations

OpenTelemetry adds minimal overhead when configured properly. The automatic instrumentation for HTTP and SQL operations typically adds less than 5ms of latency per operation. For high-throughput applications, consider adjusting the sampling ratio to reduce data volume.

Use tail-based sampling at the collector level rather than head-based sampling in the application to ensure you capture complete traces for errors while reducing overall data volume.

## Troubleshooting Common Issues

If traces aren't appearing in your backend, verify the OTLP endpoint is reachable and the collector is running. Enable console exporter temporarily to confirm spans are being created.

For applications with custom thread pools or async operations, ensure Activity.Current flows correctly through async contexts. The AsyncLocal storage used by Activity.Current should work correctly in .NET Framework 4.6.2+, but custom synchronization contexts can sometimes interfere.

## Migration Path to Modern .NET

While this configuration works well for .NET Framework 4.6.2+, consider planning a migration to modern .NET. The observability story is significantly better with built-in support for OpenTelemetry, better performance, and more automatic instrumentation options.

You can run both .NET Framework and modern .NET services side by side with consistent telemetry, making incremental migration feasible while maintaining full observability across your entire application landscape.

OpenTelemetry brings standardized observability to .NET Framework applications, providing the foundation for understanding application behavior in production. With proper instrumentation, your legacy applications can achieve the same level of observability as modern cloud-native services.