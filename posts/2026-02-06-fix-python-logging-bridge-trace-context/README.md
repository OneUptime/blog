# How to Fix OpenTelemetry Python Logging Bridge Not Correlating Logs with Active Trace Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Logging, Trace Correlation

Description: Fix the configuration issue that prevents Python logs from being correlated with OpenTelemetry trace and span IDs automatically.

Log-trace correlation lets you click on a trace and see the associated log messages, or search logs by trace ID. The OpenTelemetry Python logging bridge should automatically inject trace IDs into your Python log records, but it requires specific setup to work. Without it, your logs and traces live in separate silos.

## The Expected Behavior

When properly configured, every log message emitted within an active span includes the trace and span IDs:

```json
{
  "message": "Processing order 12345",
  "trace_id": "abc123def456",
  "span_id": "789xyz",
  "trace_flags": "01",
  "severity": "INFO"
}
```

## Setting Up the Logging Bridge

```python
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter

# Set up trace provider
resource = Resource.create({SERVICE_NAME: "my-service"})
trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)

# Set up log provider
logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter())
)
set_logger_provider(logger_provider)

# Attach OpenTelemetry handler to Python's logging
handler = LoggingHandler(
    level=logging.INFO,
    logger_provider=logger_provider,
)
logging.getLogger().addHandler(handler)
```

## Why Correlation Might Not Work

### Problem 1: No Active Span

Logs emitted outside of a span have no trace context to correlate with:

```python
logger = logging.getLogger(__name__)

# No active span - log has no trace context
logger.info("Application starting")  # trace_id will be empty

def handle_request():
    with tracer.start_as_current_span("handle_request"):
        # Inside a span - log has trace context
        logger.info("Processing request")  # trace_id will be set
```

### Problem 2: Missing LoggingHandler

If you do not add the `LoggingHandler`, Python logs are not processed by OpenTelemetry:

```python
# This alone is not enough
logger_provider = LoggerProvider(resource=resource)
set_logger_provider(logger_provider)

# You MUST add the handler to Python's logging
handler = LoggingHandler(logger_provider=logger_provider)
logging.getLogger().addHandler(handler)
```

### Problem 3: Log Level Filtering

The handler has its own log level. If it is set higher than your log messages:

```python
# Handler only processes WARNING and above
handler = LoggingHandler(level=logging.WARNING, logger_provider=logger_provider)

# INFO messages are filtered out by the handler
logger.info("This will not be correlated")  # Filtered
logger.warning("This will be correlated")   # Passes through
```

## Adding Trace Context to Standard Log Output

If you want trace IDs in your console/file logs (not just in OTLP-exported logs), use a custom formatter:

```python
import logging
from opentelemetry import trace

class TraceContextFormatter(logging.Formatter):
    def format(self, record):
        span = trace.get_current_span()
        if span and span.is_recording():
            ctx = span.get_span_context()
            record.trace_id = format(ctx.trace_id, '032x')
            record.span_id = format(ctx.span_id, '016x')
        else:
            record.trace_id = '0' * 32
            record.span_id = '0' * 16
        return super().format(record)

# Configure logging with trace context
formatter = TraceContextFormatter(
    '%(asctime)s [%(levelname)s] [trace_id=%(trace_id)s span_id=%(span_id)s] %(message)s'
)

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logging.getLogger().addHandler(console_handler)
```

Output:

```
2024-01-15 10:30:00 [INFO] [trace_id=abc123def456... span_id=789xyz...] Processing order 12345
```

## Using opentelemetry-instrument for Automatic Setup

The CLI automatically sets up the logging bridge:

```bash
OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true \
OTEL_LOGS_EXPORTER=otlp \
opentelemetry-instrument python app.py
```

The `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` flag is required to enable the logging bridge through auto-instrumentation.

## Complete Example

```python
# app.py
import logging
from flask import Flask
from opentelemetry import trace

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

app = Flask(__name__)

@app.route("/api/orders/<order_id>")
def get_order(order_id):
    # This log will include the trace_id from the Flask request span
    logger.info(f"Fetching order {order_id}")

    with tracer.start_as_current_span("db_query"):
        # This log will include the db_query span_id
        logger.info(f"Querying database for order {order_id}")
        order = db.get_order(order_id)

    return order
```

When you view this trace in your backend and switch to the logs tab, you see the log messages attached to the correct spans.

## Summary

For log-trace correlation in Python:
1. Set up both TracerProvider and LoggerProvider
2. Add the `LoggingHandler` to Python's root logger
3. Make sure the handler log level matches your application's log level
4. Emit logs inside active spans for correlation
5. Use `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` with the CLI
