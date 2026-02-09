# How to Implement FaaS Semantic Conventions for Serverless Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Serverless, FaaS, AWS Lambda, Semantic Conventions, Observability, Tracing, Cloud Functions

Description: Learn how to implement OpenTelemetry FaaS semantic conventions to trace and monitor serverless functions across AWS Lambda, Azure Functions, and Google Cloud Functions.

---

## Introduction

Serverless functions present a unique observability challenge. They are ephemeral, stateless, and event-driven. Traditional monitoring approaches that rely on long-lived processes and persistent connections do not translate well to this model. OpenTelemetry addresses this with FaaS (Function as a Service) semantic conventions, which define a standard set of attributes for describing serverless function invocations.

This guide shows you how to apply FaaS semantic conventions in practice. You will learn the attribute schema, see working implementations for AWS Lambda and other platforms, and understand how to configure your telemetry pipeline for serverless workloads.

## The FaaS Semantic Convention Schema

OpenTelemetry defines FaaS attributes in two categories: resource attributes that describe the function itself, and span attributes that describe individual invocations.

### Resource Attributes

These attributes are set once and apply to all telemetry produced by the function.

| Attribute | Type | Description |
|-----------|------|-------------|
| `faas.name` | string | The name of the function |
| `faas.version` | string | The version or alias of the function |
| `faas.instance` | string | The execution environment instance ID |
| `faas.max_memory` | int | Maximum memory available in MB |
| `cloud.provider` | string | The cloud provider (aws, gcp, azure) |
| `cloud.region` | string | The region where the function runs |
| `cloud.account.id` | string | The cloud account ID |

### Span Attributes

These attributes vary per invocation and are set on the function's root span.

| Attribute | Type | Description |
|-----------|------|-------------|
| `faas.trigger` | string | The trigger type (http, pubsub, datasource, timer, other) |
| `faas.invocation_id` | string | The cloud provider's invocation ID |
| `faas.coldstart` | boolean | Whether this was a cold start |
| `faas.document.collection` | string | For datasource triggers, the collection name |
| `faas.document.operation` | string | The document operation (insert, edit, delete) |
| `faas.document.name` | string | The document name or key |
| `faas.time` | string | For timer triggers, the scheduled time |
| `faas.cron` | string | For timer triggers, the cron expression |

```mermaid
graph TD
    A[FaaS Invocation] --> B{Trigger Type}
    B -->|HTTP| C[faas.trigger = http]
    B -->|Queue/PubSub| D[faas.trigger = pubsub]
    B -->|Database| E[faas.trigger = datasource]
    B -->|Scheduled| F[faas.trigger = timer]
    B -->|Other| G[faas.trigger = other]

    C --> H[+ HTTP semantic conventions]
    D --> H2[+ Messaging semantic conventions]
    E --> H3[+ faas.document.* attributes]
    F --> H4[+ faas.time, faas.cron]
```

The trigger type is especially important because it determines which additional semantic conventions apply. An HTTP-triggered function should also carry HTTP request and response attributes. A queue-triggered function should carry messaging attributes.

## Instrumenting AWS Lambda Functions

AWS Lambda is the most widely deployed serverless platform. Let's walk through a complete instrumentation setup.

### Basic Setup with the OpenTelemetry Lambda Layer

The simplest approach for Python Lambda functions is to use the OpenTelemetry Lambda layer. But to understand what happens under the hood, here is a manual setup that explicitly applies FaaS semantic conventions.

This Python Lambda handler sets up OpenTelemetry with full FaaS resource and span attributes. The resource attributes are read from Lambda environment variables that AWS provides automatically:

```python
# AWS Lambda handler with manual OpenTelemetry FaaS instrumentation.
# AWS sets environment variables like AWS_LAMBDA_FUNCTION_NAME and
# AWS_REGION automatically, so we read them to build the resource.
import os
import json
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import SimpleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Track cold start across invocations
_is_cold_start = True

# Build the resource with FaaS and cloud attributes
resource = Resource.create({
    "faas.name": os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown"),
    "faas.version": os.environ.get("AWS_LAMBDA_FUNCTION_VERSION", "$LATEST"),
    "faas.instance": os.environ.get("AWS_LAMBDA_LOG_STREAM_NAME", "unknown"),
    "faas.max_memory": int(os.environ.get("AWS_LAMBDA_FUNCTION_MEMORY_SIZE", "128")),
    "cloud.provider": "aws",
    "cloud.region": os.environ.get("AWS_REGION", "us-east-1"),
    "cloud.account.id": os.environ.get("AWS_ACCOUNT_ID", "unknown"),
    "service.name": os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown"),
})

# Use SimpleSpanExporter for Lambda to flush before the function freezes
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    SimpleSpanExporter(OTLPSpanExporter(
        endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT",
                                 "https://ingest.oneuptime.com/v1/traces")
    ))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("order-processor")
```

Notice that we use `SimpleSpanExporter` instead of `BatchSpanProcessor`. This is critical for Lambda. The batch processor relies on background threads and timers, which do not work reliably in Lambda's execution model. When the function finishes, Lambda freezes the execution environment immediately, and queued spans may never be exported.

### The Handler Function

The handler function creates a span for each invocation and sets the per-invocation FaaS attributes. Here is the handler that processes API Gateway events, detecting cold starts and recording the trigger type:

```python
# Lambda handler that creates a span with FaaS invocation attributes.
# The cold start flag is set on the first invocation and cleared
# for subsequent invocations in the same execution environment.
def handler(event, context):
    global _is_cold_start

    with tracer.start_as_current_span(
        "order-processor",
        kind=trace.SpanKind.SERVER,
    ) as span:
        # Set FaaS invocation attributes
        span.set_attribute("faas.trigger", "http")
        span.set_attribute("faas.invocation_id", context.aws_request_id)
        span.set_attribute("faas.coldstart", _is_cold_start)

        # Clear cold start flag after first invocation
        _is_cold_start = False

        # If triggered by API Gateway, add HTTP attributes
        if "httpMethod" in event:
            span.set_attribute("http.request.method", event["httpMethod"])
            span.set_attribute("url.path", event.get("path", "/"))

        try:
            # Process the order
            body = json.loads(event.get("body", "{}"))
            order_id = body.get("order_id", "unknown")
            span.set_attribute("app.order.id", order_id)

            result = process_order(order_id)

            span.set_attribute("http.response.status_code", 200)
            return {
                "statusCode": 200,
                "body": json.dumps({"status": "processed", "order_id": order_id})
            }
        except Exception as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)})
            }
```

### Handling Different Trigger Types

Serverless functions respond to many event sources. Each trigger type calls for different attributes. The following function demonstrates how to detect the trigger type from the Lambda event shape and set the appropriate attributes:

```python
# Detect the Lambda trigger type from the event structure
# and set the corresponding FaaS and domain-specific attributes.
# Each AWS event source has a distinct shape that we can identify.
def set_trigger_attributes(span, event):
    if "httpMethod" in event or "requestContext" in event:
        # API Gateway trigger
        span.set_attribute("faas.trigger", "http")
        span.set_attribute("http.request.method",
                          event.get("httpMethod", "GET"))

    elif "Records" in event and event["Records"][0].get("eventSource") == "aws:sqs":
        # SQS trigger
        span.set_attribute("faas.trigger", "pubsub")
        span.set_attribute("messaging.system", "aws_sqs")
        span.set_attribute("messaging.destination.name",
                          event["Records"][0].get("eventSourceARN", "").split(":")[-1])
        span.set_attribute("messaging.batch.message_count", len(event["Records"]))

    elif "Records" in event and event["Records"][0].get("eventSource") == "aws:dynamodb":
        # DynamoDB Streams trigger
        span.set_attribute("faas.trigger", "datasource")
        span.set_attribute("faas.document.collection",
                          event["Records"][0].get("eventSourceARN", "").split("/")[1])
        span.set_attribute("faas.document.operation",
                          event["Records"][0]["eventName"].lower())

    elif "source" in event and event["source"] == "aws.events":
        # EventBridge / CloudWatch Events (scheduled)
        span.set_attribute("faas.trigger", "timer")
        span.set_attribute("faas.time", event.get("time", ""))

    else:
        span.set_attribute("faas.trigger", "other")
```

## Cold Start Tracking

Cold starts are one of the biggest performance concerns in serverless architectures. The `faas.coldstart` attribute lets you measure cold start frequency and duration across your function fleet.

```mermaid
sequenceDiagram
    participant Client
    participant Lambda
    participant OTel

    Note over Lambda: Execution environment created
    Client->>Lambda: First request
    Lambda->>OTel: Span (faas.coldstart=true, duration=2.3s)
    Client->>Lambda: Second request
    Lambda->>OTel: Span (faas.coldstart=false, duration=0.1s)
    Client->>Lambda: Third request
    Lambda->>OTel: Span (faas.coldstart=false, duration=0.09s)
    Note over Lambda: Environment frozen after idle timeout
    Note over Lambda: New environment created
    Client->>Lambda: Fourth request
    Lambda->>OTel: Span (faas.coldstart=true, duration=2.1s)
```

By filtering your traces on `faas.coldstart = true`, you can calculate cold start rates per function, measure the cold start penalty in milliseconds, and identify functions that need provisioned concurrency or optimization.

## Collector Configuration for Serverless

Serverless functions need a lightweight export path. Running a full Collector sidecar is not practical in most serverless environments. Instead, export directly to an OTLP endpoint or use the Lambda extension.

This configuration shows how to set up the OpenTelemetry Collector as a Lambda layer extension. The extension runs alongside your function and buffers telemetry for export:

```yaml
# Collector configuration for the Lambda extension layer.
# The extension runs as a separate process in the Lambda
# execution environment and receives telemetry over localhost.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: localhost:4317

processors:
  batch:
    # Keep batch sizes small for Lambda
    timeout: 1s
    send_batch_size: 50
    send_batch_max_size: 100

exporters:
  otlp:
    endpoint: "https://ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"
    retry_on_failure:
      enabled: true
      max_elapsed_time: 10s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Cross-Platform Considerations

While the examples above focus on AWS Lambda, the FaaS semantic conventions are platform-agnostic. For Azure Functions, you would read from `WEBSITE_SITE_NAME` and `REGION_NAME`. For Google Cloud Functions, you would use `FUNCTION_NAME` and `FUNCTION_REGION`. The attribute names remain the same regardless of provider.

This portability is one of the strongest benefits of following the semantic conventions. If you migrate a function from AWS Lambda to Google Cloud Functions, your dashboards and alerts continue to work because they query `faas.name` and `faas.coldstart`, not provider-specific attributes.

## Best Practices

Always track cold starts with the `faas.coldstart` attribute. This is the single most valuable FaaS-specific data point for performance optimization.

Use `SimpleSpanExporter` or the Lambda extension rather than `BatchSpanProcessor` in Lambda environments. Batch processing assumes long-lived processes and will lose data in serverless contexts.

Set the `faas.trigger` attribute on every function span. It enables you to build dashboards that break down performance by trigger type, which is essential for functions that respond to multiple event sources.

Include `faas.max_memory` in your resource attributes. Correlating function duration with available memory helps you right-size your functions and reduce costs.

## Conclusion

FaaS semantic conventions bring structure to serverless observability. By consistently applying `faas.*` attributes to your function telemetry, you gain visibility into cold starts, trigger patterns, and invocation performance across your entire serverless fleet. Whether you run on AWS Lambda, Azure Functions, or Google Cloud Functions, these conventions provide a unified vocabulary that makes your observability tooling work across platforms and providers.
