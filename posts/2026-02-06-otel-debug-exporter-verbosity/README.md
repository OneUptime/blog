# How to Use the Debug Exporter with Verbosity Levels for Step-by-Step Local Instrumentation Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Debug Exporter, Collector, Debugging, Instrumentation

Description: Learn how to use the OpenTelemetry Collector debug exporter with different verbosity levels to troubleshoot instrumentation issues.

When your traces are not showing up in Jaeger, or your metrics look wrong in Grafana, the problem could be anywhere in the pipeline: your application, the collector, or the backend. The OpenTelemetry Collector's debug exporter is your first tool for isolating the issue. It prints telemetry data to the collector's stdout at different levels of detail. This post explains each verbosity level and when to use it.

## What is the Debug Exporter?

The debug exporter is a built-in exporter in the OpenTelemetry Collector that writes received telemetry to standard output. It replaced the older `logging` exporter. You add it to your collector configuration alongside your production exporters, and it prints what the collector receives and processes.

## Verbosity Levels

The debug exporter supports three verbosity levels: `basic`, `normal`, and `detailed`. Each level shows progressively more information.

### Basic Verbosity

Use `basic` when you just want to confirm that data is flowing through the collector. It prints a one-line summary per batch:

```yaml
exporters:
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug, otlp/jaeger]
```

The output looks like this:

```
2026-02-06T10:15:30Z info TracesExporter {"kind": "exporter", "data_type": "traces", "name": "debug", "resource spans": 1, "spans": 5}
```

This tells you the collector received a batch with 1 resource and 5 spans. If you see this output but traces are not appearing in Jaeger, the problem is between the collector and Jaeger, not between your app and the collector.

### Normal Verbosity

`normal` is the default level. It shows resource attributes and span summaries:

```yaml
exporters:
  debug:
    verbosity: normal
```

Output:

```
2026-02-06T10:15:30Z info TracesExporter {"kind": "exporter", "data_type": "traces", "name": "debug"}
    Resource SchemaURL:
    Resource attributes:
        -> service.name: Str(order-service)
        -> deployment.environment: Str(staging)
    ScopeSpans #0
        InstrumentationScope opentelemetry.instrumentation.flask 0.43b0
        Span #0
            Trace ID: abc123def456...
            Span ID: 789abc...
            Name: GET /api/orders
            Kind: Server
            Start time: 2026-02-06 10:15:29.123
            End time: 2026-02-06 10:15:29.456
            Status: Ok
```

This level is useful when you need to verify that the right service name and resource attributes are being sent. If your traces show up in Jaeger under the wrong service name, this output will show you exactly what the collector received.

### Detailed Verbosity

`detailed` shows everything, including all span attributes, events, and links:

```yaml
exporters:
  debug:
    verbosity: detailed
```

Output includes every attribute on every span:

```
Span #0
    Trace ID: abc123def456...
    Span ID: 789abc...
    Parent Span ID: 456def...
    Name: GET /api/orders
    Kind: Server
    Start time: 2026-02-06 10:15:29.123
    End time: 2026-02-06 10:15:29.456
    Status: Ok
    Attributes:
        -> http.request.method: Str(GET)
        -> url.path: Str(/api/orders)
        -> http.response.status_code: Int(200)
        -> net.host.name: Str(order-service)
        -> net.host.port: Int(8080)
    Events:
        -> Name: order.validated
           Timestamp: 2026-02-06 10:15:29.200
           Attributes:
               -> order.id: Str(ord-12345)
               -> validation.result: Str(passed)
```

Use `detailed` when you are debugging specific attribute values or checking whether span events are being recorded correctly.

## A Practical Debugging Session

Let's walk through a real debugging scenario. Your application is supposed to send traces with a custom `user.id` attribute, but it is not showing up in Jaeger.

Step 1: Set the debug exporter to `detailed`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug:
    verbosity: detailed
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug, otlp/jaeger]
```

Step 2: Restart the collector and trigger a request:

```bash
# Restart the collector to pick up the config change
docker compose restart otel-collector

# Trigger a request to your application
curl http://localhost:8080/api/orders
```

Step 3: Check the collector logs:

```bash
docker compose logs otel-collector --tail=50
```

Step 4: Look at the span attributes in the output. If `user.id` is missing from the detailed output, the issue is in your application code. The attribute is never being set. Go back to your instrumentation code and verify:

```python
# Check that you are setting the attribute correctly
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def handle_request(user_id):
    with tracer.start_as_current_span("handle-request") as span:
        # Make sure this line is actually executing
        span.set_attribute("user.id", user_id)
        # ... rest of the handler
```

If `user.id` IS present in the debug output but not in Jaeger, the problem is downstream. Maybe Jaeger is not indexing that attribute, or there is a processor in the collector pipeline that is removing it.

## Debugging Metrics and Logs

The debug exporter works for all signal types, not just traces:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
    logs:
      receivers: [otlp]
      exporters: [debug]
```

For metrics, the detailed output shows metric names, types, data points, and labels. For logs, it shows the log body, severity, and associated trace context.

## Performance Considerations

The debug exporter adds overhead because it serializes every piece of telemetry to text. In a local development setup this is fine. In production, you should either remove it entirely or keep it at `basic` verbosity with sampling:

```yaml
exporters:
  debug:
    verbosity: basic
    # Only sample 1% of data for debug output in production
    sampling_initial: 2
    sampling_thereafter: 500
```

The debug exporter is a simple tool, but it is often the fastest way to answer the question "is my telemetry data actually reaching the collector, and does it contain what I think it contains?" Start with `basic` to confirm flow, move to `normal` to check structure, and use `detailed` to inspect specific values.
