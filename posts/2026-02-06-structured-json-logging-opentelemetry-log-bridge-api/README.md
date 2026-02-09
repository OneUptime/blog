# How to Implement Structured JSON Logging with OpenTelemetry Log Bridge API in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Structured Logging, JSON Logs, Log Bridge API

Description: Implement structured JSON logging in production applications using the OpenTelemetry Log Bridge API for correlated observability.

Most applications start with simple text logging. You write `logger.info("User logged in")` and call it a day. But as your system grows, you realize that unstructured text logs are nearly impossible to query, aggregate, or correlate with traces and metrics. Structured JSON logging fixes this, and the OpenTelemetry Log Bridge API lets you connect your existing logging framework to the OpenTelemetry ecosystem without rewriting your logging code.

This post walks through setting up structured JSON logging with the OpenTelemetry Log Bridge API in a production Python application, including trace correlation and proper export configuration.

## What the Log Bridge API Does

The Log Bridge API is not a new logging framework. It is a bridge that sits between your existing logger (Python's `logging`, Java's Log4j, etc.) and the OpenTelemetry pipeline. Your application keeps using whatever logger it already uses. The bridge intercepts log records, enriches them with trace context and resource attributes, and sends them to the OpenTelemetry Collector.

This means you do not need to change any of your existing `logger.info()` calls. You just wire up the bridge once and your logs start flowing through OpenTelemetry.

## Setting Up in Python

Install the required packages:

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc
```

Here is the setup code that configures both tracing and logging through OpenTelemetry. The key piece is the `LoggingHandler` that bridges Python's built-in logging module:

```python
# otel_setup.py
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk.resources import Resource

def setup_otel(service_name: str):
    """Initialize OpenTelemetry tracing and logging."""
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.4.2",
        "deployment.environment": "production",
    })

    # Set up tracing
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
    )
    trace.set_tracer_provider(trace_provider)

    # Set up log export through OpenTelemetry
    log_provider = LoggerProvider(resource=resource)
    log_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint="http://otel-collector:4317"))
    )

    # Create the bridge handler that connects Python logging to OTel
    otel_handler = LoggingHandler(
        level=logging.INFO,
        logger_provider=log_provider,
    )

    # Attach the handler to the root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(otel_handler)
    root_logger.setLevel(logging.INFO)

    return trace.get_tracer(service_name)
```

## Using It in Your Application

Once the setup runs, every log statement automatically includes trace context. Here is how it looks in a Flask application:

```python
# app.py
import logging
from flask import Flask, request
from otel_setup import setup_otel

tracer = setup_otel("order-service")
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route("/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        order_data = request.get_json()

        # These log calls automatically get trace_id and span_id attached
        logger.info(
            "Creating order",
            extra={
                "order.customer_id": order_data["customer_id"],
                "order.item_count": len(order_data["items"]),
                "order.total_amount": order_data["total"],
            },
        )

        try:
            order_id = process_order(order_data)
            logger.info(
                "Order created successfully",
                extra={"order.id": order_id},
            )
            return {"order_id": order_id}, 201

        except ValueError as e:
            logger.warning(
                "Order validation failed",
                extra={
                    "order.customer_id": order_data["customer_id"],
                    "error.type": type(e).__name__,
                    "error.message": str(e),
                },
            )
            return {"error": str(e)}, 400
```

The `extra` dict fields become structured attributes on the log record. When exported as JSON through the collector, each log entry will look something like this:

```json
{
  "timestamp": "2026-02-06T14:23:11.492Z",
  "severity_text": "INFO",
  "body": "Creating order",
  "attributes": {
    "order.customer_id": "cust_8291",
    "order.item_count": 3,
    "order.total_amount": 149.99
  },
  "resource": {
    "service.name": "order-service",
    "service.version": "1.4.2",
    "deployment.environment": "production"
  },
  "trace_id": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "span_id": "1a2b3c4d5e6f7a8b"
}
```

## Collector Configuration for Logs

The collector receives logs via OTLP and can export them to multiple destinations. Here is a config that sends logs to both a file (for debugging) and a remote backend:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  # Add the collector's hostname to all log records
  resourcedetection:
    detectors: [system]
    system:
      hostname_sources: ["os"]

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"
    tls:
      insecure: false

  # Optional: write logs to a local file for debugging
  file:
    path: /var/log/otel/structured-logs.json

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Production Considerations

**Log volume control**: The BatchLogRecordProcessor has configuration for queue size and export timeouts. In high-throughput services, tune these to avoid memory pressure:

```python
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

processor = BatchLogRecordProcessor(
    OTLPLogExporter(endpoint="http://otel-collector:4317"),
    max_queue_size=4096,
    max_export_batch_size=512,
    schedule_delay_millis=5000,
)
```

**Sensitive data**: Be careful about what goes into structured log attributes. Do not log passwords, tokens, credit card numbers, or PII. Add a review step for any new `extra` fields.

**Backwards compatibility**: If you have log consumers that expect plain text, you can keep a text-based handler alongside the OpenTelemetry handler. The two do not conflict.

## Wrapping Up

The OpenTelemetry Log Bridge API is the practical path to structured logging in existing applications. You do not need to rip out your current logging framework. Just add the bridge handler, start including structured attributes in your log calls, and your logs become queryable, correlated with traces, and ready for modern observability backends.
