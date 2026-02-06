# How to Fix Log Records Missing Trace Correlation Because the Logging Framework Does Not Inject span_id Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logs, Trace Correlation, Logging Framework

Description: Fix missing trace correlation in log records by configuring your logging framework to inject trace_id and span_id automatically.

Trace-log correlation is one of the most powerful features of unified observability. You click on a trace in your UI, and you see all the log lines associated with that specific request. But if your logging framework is not configured to inject `trace_id` and `span_id` into log records, this correlation does not happen. Your logs and traces exist as separate silos.

## Understanding Trace-Log Correlation

For correlation to work, each log record needs three pieces of information:

```json
{
  "timestamp": "2026-02-06T10:15:32Z",
  "message": "Processing order",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": "01"
}
```

The `trace_id` and `span_id` link the log to a specific span in a specific trace. Without them, there is no way to correlate logs with traces.

## Diagnosing the Problem

Check your log output for trace context:

```bash
# Look at raw log output
kubectl logs my-app-pod | head -5

# If you see logs without trace_id/span_id fields, correlation is missing:
# {"timestamp": "2026-02-06T10:15:32Z", "message": "Processing order", "level": "INFO"}
# No trace_id or span_id!

# Correct output should include:
# {"timestamp": "2026-02-06T10:15:32Z", "message": "Processing order", "level": "INFO",
#  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736", "span_id": "00f067aa0ba902b7"}
```

## Fix for Python (Standard Logging)

The OpenTelemetry Python SDK provides a log handler that bridges Python's standard logging with OpenTelemetry:

```python
import logging
from opentelemetry import trace
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Set up the OTel log provider
log_provider = LoggerProvider()
log_provider.add_log_record_processor(
    BatchLogRecordProcessor(
        OTLPLogExporter(endpoint="http://otel-collector:4317", insecure=True)
    )
)

# Attach the OTel handler to the standard logger
handler = LoggingHandler(
    level=logging.INFO,
    logger_provider=log_provider,
)

# Configure the root logger
logging.basicConfig(level=logging.INFO)
logging.getLogger().addHandler(handler)

# Now logs within a span context will automatically include trace_id and span_id
tracer = trace.get_tracer("my-service")
logger = logging.getLogger(__name__)

with tracer.start_as_current_span("handle-request"):
    logger.info("Processing order")
    # This log record will include trace_id and span_id automatically
```

If you want trace context in your console/file logs too (not just OTLP-exported logs), use a custom formatter:

```python
class TraceContextFormatter(logging.Formatter):
    def format(self, record):
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            record.trace_id = format(ctx.trace_id, '032x')
            record.span_id = format(ctx.span_id, '016x')
        else:
            record.trace_id = "0" * 32
            record.span_id = "0" * 16
        return super().format(record)

# Use the formatter
formatter = TraceContextFormatter(
    '%(asctime)s [%(levelname)s] trace_id=%(trace_id)s span_id=%(span_id)s %(message)s'
)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logging.getLogger().addHandler(handler)
```

## Fix for Java (SLF4J / Logback)

Add the OpenTelemetry Logback appender:

```xml
<!-- logback.xml -->
<configuration>
  <!-- Add the OTel appender -->
  <appender name="OpenTelemetry" class="io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender">
  </appender>

  <!-- Your existing console appender with trace context in MDC -->
  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} trace_id=%X{trace_id} span_id=%X{span_id} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="CONSOLE" />
    <appender-ref ref="OpenTelemetry" />
  </root>
</configuration>
```

If using the Java agent, trace context injection is automatic. Make sure the agent is properly attached:

```bash
# The Java agent automatically injects trace_id and span_id into MDC
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.instrumentation.logback-mdc.enabled=true \
  -jar myapp.jar
```

## Fix for Node.js (Winston / Pino)

For Winston:

```javascript
const { trace, context } = require('@opentelemetry/api');
const winston = require('winston');

// Custom format that adds trace context
const traceFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
    info.trace_flags = `0${spanContext.traceFlags.toString(16)}`;
  }
  return info;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    traceFormat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Usage:
// logger.info("Processing order", { orderId: "12345" });
// Output: {"message":"Processing order","orderId":"12345",
//          "trace_id":"abc123...","span_id":"def456..."}
```

For Pino:

```javascript
const pino = require('pino');
const { trace, context } = require('@opentelemetry/api');

const logger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      };
    }
    return {};
  },
});
```

## Fix for Go (zerolog / zap)

For zap:

```go
package main

import (
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

func logWithTrace(ctx context.Context, logger *zap.Logger, msg string) {
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        logger.Info(msg,
            zap.String("trace_id", span.SpanContext().TraceID().String()),
            zap.String("span_id", span.SpanContext().SpanID().String()),
        )
    } else {
        logger.Info(msg)
    }
}
```

## Verifying Correlation

After setting up trace context injection, verify in your backend:

```bash
# Generate a test request
curl http://my-service/api/test

# In your tracing backend, find the trace
# Click on a span - you should see associated log records

# In your log backend, search for a specific trace_id
# You should see all log lines from that trace
```

Trace-log correlation transforms your debugging workflow. Instead of searching through millions of log lines, you go directly from a slow trace to the exact logs that explain what happened. The setup is framework-specific but always follows the same pattern: extract trace context from the current span and inject it into the log record.
