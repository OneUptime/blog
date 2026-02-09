# How to Inject Trace IDs and Span IDs into Structured Logs for Bidirectional Trace-Log Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Trace-Log Correlation, Structured Logging, Trace ID

Description: Inject OpenTelemetry trace IDs and span IDs into your structured logs to enable bidirectional trace-to-log and log-to-trace navigation.

The most common question during an incident is "what happened?" Traces show you the request flow. Logs show you the details. But if you cannot jump from a trace to its related logs, or from a log line to the trace that produced it, you are stuck copying trace IDs and manually searching. Injecting trace context into your logs creates a bidirectional link that eliminates this friction.

## The Goal: Logs with Trace Context

Every log line emitted during a traced request should include the `trace_id` and `span_id` fields:

```json
{
  "timestamp": "2026-02-06T14:23:45.123Z",
  "level": "ERROR",
  "message": "Payment declined: insufficient funds",
  "service.name": "payment-service",
  "trace_id": "abc123456789abcdef0123456789abcd",
  "span_id": "def456789abcdef0",
  "user_id": "user-42",
  "amount": 99.99
}
```

With these fields present, your observability backend can build the links in both directions: from a trace view showing related logs, and from a log search linking to the parent trace.

## Python: Injecting Trace Context with the logging Module

The OpenTelemetry Python SDK provides a log handler that automatically injects trace context:

```python
# app.py
import logging
import json
from opentelemetry import trace
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Enable automatic trace context injection into log records
LoggingInstrumentor().instrument(set_logging_format=True)

# Configure structured JSON logging
class JsonFormatter(logging.Formatter):
    """Formats log records as JSON with trace context."""

    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            # These fields are injected by LoggingInstrumentor
            "trace_id": getattr(record, "otelTraceID", "0" * 32),
            "span_id": getattr(record, "otelSpanID", "0" * 16),
            "trace_flags": getattr(record, "otelTraceFlagss", "00"),
        }

        # Include exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)

# Set up the logger
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.root.addHandler(handler)
logging.root.setLevel(logging.INFO)

logger = logging.getLogger("payment-service")

# Now every log call inside a span automatically includes trace context
tracer = trace.get_tracer("payment-service")

def process_payment(user_id, amount):
    with tracer.start_as_current_span("process_payment") as span:
        logger.info(f"Processing payment for user {user_id}, amount: {amount}")

        if amount > 1000:
            logger.warning(f"Large payment detected for user {user_id}")

        # This log will include trace_id and span_id automatically
        logger.info("Payment processed successfully")
```

## Java: Injecting Trace Context with SLF4J and Logback

For Java applications using SLF4J with Logback, the OpenTelemetry Java agent automatically injects MDC (Mapped Diagnostic Context) fields:

```xml
<!-- logback-spring.xml -->
<configuration>
  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
      <!-- Include MDC fields which contain trace context -->
      <includeMdcKeyName>trace_id</includeMdcKeyName>
      <includeMdcKeyName>span_id</includeMdcKeyName>
      <includeMdcKeyName>trace_flags</includeMdcKeyName>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="CONSOLE" />
  </root>
</configuration>
```

If you are using the Java agent, enable MDC injection in your declarative config:

```yaml
# otel-config.yaml
instrumentation:
  java:
    logging:
      # Inject trace context into SLF4J MDC
      mdc:
        enabled: true
        trace_id_key: "trace_id"
        span_id_key: "span_id"
        trace_flags_key: "trace_flags"
```

Your application code does not need to change at all:

```java
// PaymentService.java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PaymentService {
    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    public void processPayment(String userId, double amount) {
        // trace_id and span_id are automatically in the MDC
        logger.info("Processing payment for user={}, amount={}", userId, amount);

        if (amount > 1000) {
            logger.warn("Large payment detected for user={}", userId);
        }

        logger.info("Payment completed successfully");
    }
}
```

## Node.js: Injecting Trace Context with Pino

For Node.js applications using Pino:

```javascript
// logger.js
const pino = require("pino");
const { trace, context } = require("@opentelemetry/api");

// Create a Pino logger with a mixin that injects trace context
const logger = pino({
  // The mixin function runs on every log call
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags.toString(16).padStart(2, "0"),
      };
    }
    return {};
  },
});

module.exports = logger;
```

```javascript
// payment.js
const logger = require("./logger");
const { trace } = require("@opentelemetry/api");

const tracer = trace.getTracer("payment-service");

async function processPayment(userId, amount) {
  return tracer.startActiveSpan("processPayment", async (span) => {
    // trace_id and span_id are automatically included
    logger.info({ userId, amount }, "Processing payment");

    try {
      // ... payment logic
      logger.info({ userId }, "Payment completed");
    } catch (error) {
      logger.error({ userId, error: error.message }, "Payment failed");
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Go: Injecting Trace Context with slog

For Go applications using the standard `slog` package:

```go
// logger.go
package main

import (
    "context"
    "log/slog"
    "os"

    "go.opentelemetry.io/otel/trace"
)

// TraceHandler wraps an slog.Handler to inject trace context
type TraceHandler struct {
    slog.Handler
}

func (h *TraceHandler) Handle(ctx context.Context, r slog.Record) error {
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        r.AddAttrs(
            slog.String("trace_id", span.SpanContext().TraceID().String()),
            slog.String("span_id", span.SpanContext().SpanID().String()),
        )
    }
    return h.Handler.Handle(ctx, r)
}

func NewLogger() *slog.Logger {
    jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })
    return slog.New(&TraceHandler{Handler: jsonHandler})
}
```

## Querying Correlated Logs

Once trace context is in your logs, you can query in both directions:

```
# From a trace: find all logs for this trace
trace_id="abc123456789abcdef0123456789abcd"

# From a log: find the trace that produced this log
# Click on the trace_id field in your log UI

# Find error logs and their traces
level="ERROR" | extract trace_id | join traces on trace_id
```

## Wrapping Up

Injecting trace IDs into structured logs is the single most impactful thing you can do for trace-log correlation. Every major language SDK supports it, either through auto-instrumentation or a few lines of logging configuration. Once the IDs are in your logs, your observability backend can build the links automatically, and navigating between traces and logs during an incident becomes a single click instead of a manual search.
