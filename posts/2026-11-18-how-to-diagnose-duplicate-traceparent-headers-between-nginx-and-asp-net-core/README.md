# How to Diagnose Duplicate traceparent Headers Between Nginx and ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Nginx, ASP.NET Core, Debugging, Context Propagation

Description: Locate duplicate traceparent headers across Nginx and ASP.NET Core, distinguish wire duplication from log formatting, and assign one propagation owner.

A request that arrives at ASP.NET Core with two `traceparent` values can produce a new trace, a rejected context, or version-dependent extraction behavior. The repair starts with locating where the second value appeared. A duplicated log line alone does not prove there were two headers on the wire.

Capture the header at the caller, immediately before Nginx, and at the application. Compare field counts and raw values for one controlled request.

## Confirm what ASP.NET Core received

Temporarily add this endpoint to a local or restricted diagnostic deployment. It returns only trace metadata:

```csharp
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/debug/trace-context", (HttpContext http) =>
{
    var values = http.Request.Headers["traceparent"];
    string? candidate = values.Count == 1 ? values[0] : null;
    bool parsed = ActivityContext.TryParse(
        candidate,
        http.Request.Headers["tracestate"].ToString(),
        out var remote);
    return Results.Json(new
    {
        count = values.Count,
        values = values.ToArray(),
        parsed,
        incomingTraceId = parsed ? remote.TraceId.ToString() : null,
        activeTraceId = Activity.Current?.TraceId.ToString(),
        activeParentSpanId = Activity.Current?.ParentSpanId.ToString()
    });
});

app.Run();
```

The endpoint observes the request after ASP.NET Core has performed its normal server activity initialization. It does not repair or replace that activity. `ActivityContext.TryParse` is useful for checking one serialized context, as documented by [Microsoft](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitycontext.tryparse?view=net-6.0).

Inspect both `count` and `values`: an intermediary can combine duplicate fields into one comma-containing string. A count of one is therefore insufficient. The W3C `traceparent` value has a defined field structure; it is not a comma-separated list like `tracestate`. See the [W3C header format](https://www.w3.org/TR/trace-context/#traceparent-header).

## Reproduce with known headers

First send one value directly to the diagnostic application, then through Nginx:

```bash
curl -sS \
  -H 'traceparent: 00-11111111111111111111111111111111-2222222222222222-01' \
  http://127.0.0.1:5000/debug/trace-context

curl -sS \
  -H 'traceparent: 00-11111111111111111111111111111111-2222222222222222-01' \
  http://127.0.0.1:8080/debug/trace-context
```

Then reproduce duplicate input with two `-H 'traceparent: ...'` arguments containing different contexts. Treat that as invalid input in the test contract; do not depend on whichever duplicate a particular framework version happens to select.

If the direct request is already duplicated, inspect the caller's instrumentation and interceptors. Common mistakes include copying incoming headers and then appending an outgoing value, or running both a manual injector and an automatic client injector.

## Inspect the effective Nginx configuration

Use `nginx -T` in the diagnostic environment and inspect the actual location handling the request, including generated includes. Search for `traceparent`, `proxy_set_header`, `otel_trace_context`, and custom Lua or njs header mutation.

Two clear configurations are possible. For an ordinary pass-through proxy, preserve the incoming request headers and remove custom trace-header manipulation unless it serves an intentional policy. Nginx passes request headers by default; `proxy_set_header` changes selected upstream fields. Its inheritance rules matter when a nested location defines its own directives. The [proxy module reference](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header) explains those rules.

For a proxy that participates in tracing using the official OTel module, let the module own the outgoing trace context:

```nginx
# Inside a server block; module loading and exporter belong in the full config.
location / {
    otel_trace on;
    otel_trace_context propagate;
    proxy_pass http://127.0.0.1:5000;
}
```

Remove overlapping manual `traceparent` injection from that path. `propagate` extracts incoming context and injects the updated context; `inject` starts from the module's context and overwrites existing context headers. These behaviors are documented by the [Nginx OTel module](https://nginx.org/en/docs/ngx_otel_module.html). Do not assume the module alone causes duplicates: inspect what the installed module and surrounding configuration actually emit.

## Check the resulting parent relationship

For pass-through, the application's parent should match the span identified in the incoming header. For a tracing Nginx proxy, the trace ID should remain the same while the application's parent should identify Nginx's span. An unchanged parent ID is not a success requirement when the proxy creates a span.

Retest one value, no value, duplicated values, and two concurrent callers. Require exactly one valid outgoing context on the normal path and a deliberate policy for invalid ingress. Remove the diagnostic endpoint afterward. Fixing ownership at the point that adds the second header is more reliable than stripping duplicates inside application middleware after server tracing has already started.
