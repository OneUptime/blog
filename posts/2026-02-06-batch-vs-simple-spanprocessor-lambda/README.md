# How to Choose Between BatchSpanProcessor and SimpleSpanProcessor for Lambda Functions vs Long-Running Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SpanProcessor, Lambda, Serverless

Description: Understand when to use BatchSpanProcessor versus SimpleSpanProcessor in serverless Lambda functions and long-running services.

The OpenTelemetry SDK provides two built-in span processors: BatchSpanProcessor and SimpleSpanProcessor. Choosing the wrong one for your runtime environment can lead to lost telemetry data or unnecessary performance overhead. The choice comes down to the lifecycle of your application process.

## How Each Processor Works

**SimpleSpanProcessor** exports each span synchronously as soon as it ends. The export call happens on the same thread that finishes the span. There is no batching, no queuing, and no background thread.

**BatchSpanProcessor** buffers completed spans in an in-memory queue and exports them in batches on a background thread at regular intervals. It is more efficient for high-volume workloads but relies on the process staying alive long enough for the background thread to flush.

## The Lambda Problem

AWS Lambda functions (and similar serverless platforms) have a key characteristic: the runtime environment can freeze or terminate immediately after the handler function returns. If you use BatchSpanProcessor, spans sitting in the queue may never get exported because the background flush thread does not get a chance to run.

```python
# BAD: Using BatchSpanProcessor in Lambda
# Spans may be lost when the Lambda freezes after handler returns
from opentelemetry.sdk.trace.export import BatchSpanProcessor

processor = BatchSpanProcessor(exporter)  # Background thread may not flush in time
```

```python
# GOOD: Using SimpleSpanProcessor in Lambda
# Each span is exported immediately when it ends
from opentelemetry.sdk.trace.export import SimpleSpanProcessor

processor = SimpleSpanProcessor(exporter)  # Spans exported synchronously
```

## Lambda Configuration with SimpleSpanProcessor

```python
# lambda_handler.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Initialize outside the handler for reuse across invocations
resource = Resource.create({"service.name": "order-processor-lambda"})
exporter = OTLPSpanExporter(endpoint="https://collector.example.com:4318/v1/traces")

provider = TracerProvider(resource=resource)
# SimpleSpanProcessor ensures every span is exported before the function returns
provider.add_span_processor(SimpleSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-processor")

def handler(event, context):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", event.get("order_id"))
        result = process_order(event)
        span.set_attribute("order.status", result["status"])
        # Span is exported synchronously when this block exits
        return result
```

## Long-Running Service Configuration with BatchSpanProcessor

For a web server, API service, or any process that runs continuously, BatchSpanProcessor is the right choice:

```python
# app.py - A Flask web application
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "order-api"})
exporter = OTLPSpanExporter(endpoint="http://collector:4317", insecure=True)

provider = TracerProvider(resource=resource)
# BatchSpanProcessor is efficient for long-running services
provider.add_span_processor(BatchSpanProcessor(
    exporter,
    max_queue_size=8192,
    schedule_delay_millis=5000,
    max_export_batch_size=512,
))
trace.set_tracer_provider(provider)
```

## The ForceFlush Alternative for Lambda

If you really want batch processing in Lambda (for performance reasons when your function handles many requests in a single invocation), you can call `force_flush` before the handler returns:

```python
# Lambda with BatchSpanProcessor and explicit flush
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "batch-lambda"})
exporter = OTLPSpanExporter(endpoint="https://collector.example.com:4318/v1/traces")

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("batch-lambda")

def handler(event, context):
    with tracer.start_as_current_span("process_batch") as span:
        for item in event["records"]:
            with tracer.start_as_current_span("process_item") as child:
                child.set_attribute("item.id", item["id"])
                process_item(item)

    # Force flush all buffered spans before Lambda freezes
    # Timeout in milliseconds - must complete before Lambda timeout
    remaining_ms = context.get_remaining_time_in_millis()
    provider.force_flush(timeout_millis=min(remaining_ms - 500, 5000))

    return {"statusCode": 200}
```

## Performance Comparison

Here are the trade-offs in numbers:

| Aspect | SimpleSpanProcessor | BatchSpanProcessor |
|--------|--------------------|--------------------|
| Export latency per span | 1-50ms (network call) | Near zero (queued) |
| Network calls | One per span | One per batch |
| Memory usage | Minimal | Queue size dependent |
| Risk of data loss | Low | Higher in short-lived processes |
| CPU overhead | Higher per span | Lower per span |

For a Lambda function processing a single event with 3-5 spans, SimpleSpanProcessor adds maybe 10-50ms of total export time. That is acceptable for most use cases.

For a web server handling 1000 requests per second with 5 spans each, SimpleSpanProcessor would make 5000 synchronous network calls per second. That is not viable. BatchSpanProcessor reduces this to perhaps 10 batch exports per second.

## Decision Framework

Use **SimpleSpanProcessor** when:
- Running in serverless environments (Lambda, Cloud Functions, Azure Functions)
- Running short-lived CLI tools or scripts
- Running batch jobs that process and exit
- Debugging locally and you want immediate span visibility

Use **BatchSpanProcessor** when:
- Running long-lived services (web servers, API services, workers)
- Handling high request throughput
- Network efficiency matters
- You have proper shutdown hooks configured

The right choice depends entirely on your process lifecycle. Match the processor to how your application runs, and you will get reliable telemetry export without unnecessary overhead.
