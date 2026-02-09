# How to Fix the Top 10 OpenTelemetry Setup Mistakes That Silently Drop Your Telemetry Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Troubleshooting, Setup

Description: Learn how to identify and fix the ten most common OpenTelemetry setup mistakes that cause silent telemetry data loss in production systems.

OpenTelemetry is a powerful observability framework, but its flexibility comes with a cost: there are many ways to misconfigure it. The worst part is that most of these misconfigurations fail silently. Your application runs fine, but your traces, metrics, and logs never make it to your backend. Here are the top ten mistakes I have seen teams make, along with concrete fixes.

## 1. Wrong SDK Initialization Order

The SDK must be initialized before any instrumented library is imported. If you import Express, gRPC, or any HTTP library before calling `NodeSDK.start()`, the instrumentation hooks never get applied.

```javascript
// tracing.js - this file must be loaded FIRST
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

Run your app with: `node --require ./tracing.js app.js`

## 2. Missing service.name Resource Attribute

Without `service.name`, your backend shows "unknown_service" for every trace. Always set it explicitly.

```javascript
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'my-order-service',
  }),
});
```

## 3. Confusing OTLP Ports

Port 4317 is for gRPC. Port 4318 is for HTTP/protobuf. Sending HTTP traffic to 4317 produces cryptic protocol errors.

```yaml
# Collector config - both receivers enabled
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

## 4. Configuring a Component Without Adding It to the Pipeline

You can define a processor or exporter in the Collector config, but if it is not listed in the `service.pipelines` section, it simply does not run.

```yaml
processors:
  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]  # Must be listed here!
      exporters: [otlp]
```

## 5. No memory_limiter Processor

Without `memory_limiter` as the first processor in your pipeline, a spike in telemetry can cause the Collector to OOM-crash.

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## 6. Forgetting to Call span.end()

If you create a span but never end it, the span sits in memory and is never exported. This is especially common in error paths.

```python
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

def process_order(order):
    span = tracer.start_span("process_order")
    try:
        # do work
        validate(order)
        charge(order)
    except Exception as e:
        span.set_status(trace.StatusCode.ERROR, str(e))
        span.record_exception(e)
        raise
    finally:
        span.end()  # Always end the span, even on failure
```

## 7. High-Cardinality Span Names

Putting user IDs, request IDs, or URLs into span names creates thousands of unique span names, which overwhelms your tracing backend.

```python
# Bad - creates a unique span name per user
span = tracer.start_span(f"get_user_{user_id}")

# Good - use attributes for variable data
span = tracer.start_span("get_user")
span.set_attribute("user.id", user_id)
```

## 8. Using the Debug Exporter in Production

The debug exporter (formerly known as the logging exporter) writes every single telemetry item to stdout. In production with heavy traffic, this fills your disk and can crash the Collector.

```yaml
# Production config - use OTLP exporter, not debug
exporters:
  otlp:
    endpoint: "https://your-backend:4317"
    tls:
      insecure: false
```

## 9. No Sending Queue Configuration

Without a sending queue, temporary backend outages cause immediate data loss. The queue buffers telemetry during outages.

```yaml
exporters:
  otlp:
    endpoint: "https://your-backend:4317"
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
```

## 10. Using Synchronous Exporters

Synchronous exporters block your application thread while sending data. Always use the batch span processor (which is the default in most SDKs) and verify you have not accidentally switched to the simple processor.

```javascript
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Good - batch processor sends in the background
const processor = new BatchSpanProcessor(new OTLPTraceExporter());

// Bad - simple processor sends synchronously
// const processor = new SimpleSpanProcessor(new OTLPTraceExporter());
```

## Quick Diagnostic Checklist

When telemetry data goes missing, run through this list:

1. Check SDK initialization order (before library imports)
2. Verify `service.name` is set
3. Confirm OTLP port matches protocol (4317 gRPC, 4318 HTTP)
4. Ensure all components appear in `service.pipelines`
5. Look for unclosed spans in error paths
6. Check Collector logs for dropped data warnings

Getting OpenTelemetry right takes attention to detail, but once these ten mistakes are fixed, you will have a reliable observability pipeline that does not silently lose your data.
