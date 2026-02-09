# How to Correlate Logs with Traces Automatically Using OpenTelemetry Trace Context Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logging, Distributed Tracing, Observability

Description: Learn how to automatically inject trace context into your application logs so every log line links back to its parent trace and span.

One of the most frustrating things in production debugging is staring at a log line and having no idea which request produced it. You know the error happened, but connecting it to a specific user journey or API call requires guesswork. OpenTelemetry solves this by injecting trace context (trace ID, span ID) directly into your log records, so every single log line carries a pointer back to its distributed trace.

This post walks through how to set this up in practice.

## Why Correlating Logs and Traces Matters

When a request flows through multiple services, a distributed trace ties together all the spans from each service. Logs, on the other hand, tend to live in their own silo. Without correlation, you end up searching logs by timestamp and hoping you find the right ones.

With trace context injection, every log line includes a `trace_id` and `span_id`. This means you can click on a trace in your observability tool, see all associated logs, and vice versa. No more guessing.

## How It Works Under the Hood

OpenTelemetry SDKs maintain a context object for each active span. When you configure your logging library to hook into this context, the logger automatically reads the current `trace_id` and `span_id` and attaches them as fields on the log record.

The OpenTelemetry Logs SDK bridges your existing logging library (like Python's `logging`, Java's Log4j, or Go's `slog`) with the OpenTelemetry pipeline.

## Setting It Up in Python

Python's `logging` module is straightforward to integrate. Install the required packages first:

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-logging
```

Then configure your application:

```python
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Set up the tracer provider
provider = TracerProvider()
provider.add_span_processor(BatchSpanExporter(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# This is the key line - it patches the logging module
# to include trace_id and span_id in every log record
LoggingInstrumentor().instrument(set_logging_format=True)

# Now use logging as normal
logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process-order"):
    logger.info("Starting order processing")
    # This log line will automatically contain trace_id and span_id
```

The `LoggingInstrumentor` modifies the default log format to include `otelTraceID`, `otelSpanID`, and `otelServiceName`. If you want a custom format, you can define it yourself:

```python
logging.basicConfig(
    format="%(asctime)s %(levelname)s [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s] %(message)s",
    level=logging.INFO,
)
```

## Setting It Up in Java with Log4j2

For Java applications using Log4j2, the OpenTelemetry Java agent handles most of the work automatically. Add the agent to your JVM startup:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.service.name=order-service \
     -Dotel.exporter.otlp.endpoint=http://collector:4317 \
     -jar myapp.jar
```

Then update your `log4j2.xml` to include the trace context in the pattern layout:

```xml
<Configuration>
  <Appenders>
    <Console name="Console" target="SYSTEM_OUT">
      <PatternLayout pattern="%d{yyyy-MM-dd HH:mm:ss} %-5level [trace_id=%X{trace_id} span_id=%X{span_id}] %logger{36} - %msg%n"/>
    </Console>
  </Appenders>
  <Loggers>
    <Root level="info">
      <AppenderRef ref="Console"/>
    </Root>
  </Loggers>
</Configuration>
```

The Java agent automatically populates the MDC (Mapped Diagnostic Context) with `trace_id` and `span_id`, so Log4j2 can reference them using the `%X{}` pattern.

## Forwarding Correlated Logs Through the Collector

Once your application emits logs with trace context, you need the OpenTelemetry Collector to forward them to your backend. Here is a collector config that receives logs via OTLP and exports them:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    # Batch logs for efficient export
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

The important thing here is that both logs and traces go through the same collector and end up in the same backend. This is what allows your observability tool to join them on `trace_id`.

## Verifying the Correlation

To confirm everything is wired up, generate a request that produces both a trace and some log lines. Then query your backend for the trace and check whether the associated logs appear. If your logs contain the `trace_id` field but your backend does not link them, check that the field names match what your backend expects. Some backends look for `traceID` while others expect `trace_id`.

## Common Pitfalls

There are a few things that trip people up. First, if you create logs outside of an active span, the trace context will be empty. Make sure your logging happens inside a span's scope. Second, async code can lose context if you are not propagating the context correctly across threads or coroutines. In Python, use `contextvars`-aware libraries. In Java, the OpenTelemetry agent handles thread propagation automatically for most frameworks.

Third, be careful with log sampling. If you sample traces at 10% but keep 100% of logs, you will have orphan logs with trace IDs that point to traces your backend never received. Align your sampling strategies or use tail-based sampling in the collector.

## Wrapping Up

Correlating logs with traces removes the guesswork from debugging distributed systems. With OpenTelemetry's trace context injection, every log line becomes a direct link to the broader request context. Set it up once, and you will wonder how you ever debugged without it.
