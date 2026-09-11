# Run traceparent and Legacy Correlation IDs During an OTel Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, OpenTelemetry, Distributed Tracing, ASP.NET Core, HTTP

Description: Migrate to W3C trace context while preserving legacy correlation searches, with separate propagation contracts and clear trust and sampling behavior.

---

Migrating to OpenTelemetry does not require replacing every legacy correlation ID immediately. Keep `X-Correlation-ID` as the existing application search key while W3C `traceparent` carries the trace and parent span relationship. Log both values during the transition.

The fields answer different questions. The correlation ID can join a workflow across several requests or traces. The trace ID identifies one execution graph. The span ID identifies the current operation within that graph. Copying a legacy UUID into `traceparent` does not create valid trace context.

## Define the transition contract

Publish a small compatibility table before changing services:

| Field | Owner | Migration behavior |
| --- | --- | --- |
| `X-Correlation-ID` | trusted application boundary | validate, preserve, and forward |
| `traceparent` | tracing propagator | extract and inject according to W3C rules |
| `tracestate` | tracing implementation | propagate under your trust policy |
| `correlation_id` log field | logging integration | write the selected application ID |
| `trace_id` and `span_id` log fields | active span | write actual current trace context |

The [W3C Trace Context specification](https://www.w3.org/TR/trace-context/) defines field validity and processing. Use your SDK or framework propagator rather than splitting the header and constructing replacement span IDs manually.

At a public edge, decide whether external traces are continued or a new internal trace is started. That decision is independent of whether a client correlation ID is accepted. Neither header authenticates the caller.

## Let .NET manage W3C propagation

ASP.NET Core and `HttpClient` participate in `Activity` propagation. OpenTelemetry instrumentation observes and exports those activities when configured. In a .NET web project, install the hosting, ASP.NET Core, HttpClient, and OTLP exporter packages:

```bash
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

The following `Program.cs` preserves a validated header on an internal service. It assumes an authenticated gateway assigned the header and that direct public access to this service is blocked:

```csharp
using System.Diagnostics;
using System.Text.RegularExpressions;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddJsonConsole(o => o.IncludeScopes = true);
builder.Services.AddHttpClient();
builder.Services.AddOpenTelemetry().WithTracing(t => t
    .AddAspNetCoreInstrumentation()
    .AddHttpClientInstrumentation()
    .AddOtlpExporter());

var app = builder.Build();
app.Use(async (ctx, next) =>
{
    var values = ctx.Request.Headers["X-Correlation-ID"];
    var candidate = values.Count == 1 ? values[0] : null;
    var id = candidate is not null && Regex.IsMatch(
        candidate, @"\A[A-Za-z0-9_-]{1,64}\z")
        ? candidate : Guid.NewGuid().ToString("N");

    ctx.Items["correlation_id"] = id;
    ctx.Response.Headers["X-Correlation-ID"] = id;
    Activity.Current?.SetTag("app.correlation_id", id);
    using var scope = app.Logger.BeginScope(
        new Dictionary<string, object?> { ["correlation_id"] = id });
    await next(ctx);
});

app.MapGet("/call", async (HttpContext ctx, IHttpClientFactory clients) =>
{
    var target = app.Configuration["DOWNSTREAM_URL"]
        ?? "http://localhost:8081/health";
    using var request = new HttpRequestMessage(HttpMethod.Get, target);
    request.Headers.Add("X-Correlation-ID",
        (string)ctx.Items["correlation_id"]!);
    using var response = await clients.CreateClient().SendAsync(
        request, ctx.RequestAborted);
    app.Logger.LogInformation("Downstream status {Status}",
        (int)response.StatusCode);
    return Results.StatusCode((int)response.StatusCode);
});
app.Run();
```

Configure a reachable OTLP collector using the exporter settings for your environment. The example adds the legacy header to each request explicitly. It leaves `traceparent` injection to the instrumented HTTP stack, which can represent the outgoing client span correctly.

Avoid setting request-specific correlation IDs on shared `HttpClient.DefaultRequestHeaders`; simultaneous requests may otherwise interfere. Construct a new `HttpRequestMessage` for each outgoing call.

## Keep log enrichment explicit

A logging scope is not automatically exported as a span attribute, and a span attribute is not automatically a logging scope. The example sets both deliberately. Configure your log provider to include scopes and its trace enrichment features, then inspect the actual emitted JSON.

For a downstream call, the trace ID should remain the same while the span ID changes. The legacy correlation ID should remain stable according to your application's contract. Searching by either ID should lead to records containing the other value, creating a practical bridge between old dashboards and new traces.

If the application uses a workflow correlation ID across days, several trace IDs may map to it. That is expected. Do not force every workflow event into one continuously growing trace merely to preserve a one-to-one relationship.

## Handle partial instrumentation and sampling

An uninstrumented service can preserve the legacy ID while breaking trace parentage. Adding a log field named `trace_id` does not repair that missing relationship. Instrument the receive and send boundaries, then confirm parent span IDs in the exported trace.

An unsampled trace can still carry valid trace context. Do not replace an ID because the sampling flag is unset or because the trace backend has no stored trace. Logging and trace retention are separate decisions, so retaining both IDs in selected logs remains useful.

During migration, avoid installing duplicate HTTP instrumentation that creates overlapping client or server spans. Inventory agent-based, framework, and manual instrumentation and choose one owner for each boundary.

## Verify compatibility before retiring the old field

Exercise four inputs: neither header, correlation only, trace context only, and both. Include malformed headers and concurrent requests. Verify the selected correlation ID, a valid trace ID, distinct client/server span IDs, and correct downstream parentage.

Then test a mixed chain containing an old service and a new service. Measure which legacy dashboards, support tooling, and queued messages still depend on the header. Retire it only after those consumers have a replacement or a deliberate durable workflow ID.

## Conclusion

Run legacy correlation IDs and W3C trace context as separate contracts during migration. Preserve the application ID explicitly, let tracing libraries manage span propagation, and log their association so existing support workflows continue working while instrumentation coverage improves.

## Official Documentation

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [.NET distributed tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [.NET logging and scopes](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview)
