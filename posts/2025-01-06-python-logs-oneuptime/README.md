# How to Send Python Application Logs to OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Logging, OneUptime, Observability, Monitoring, OpenTelemetry, Structured Logging

Description: Learn how to send Python application logs to OneUptime for centralized log management. This guide covers structured logging, log correlation with traces, and production configuration.

---

> Centralized logging transforms debugging from guesswork into investigation. OneUptime provides a unified platform for logs, traces, and metrics. This guide shows you how to send Python logs to OneUptime using OpenTelemetry.

Scattered logs across servers waste time. Centralized logs with proper structure and correlation make debugging fast.

---

## Overview

OneUptime accepts logs via the OpenTelemetry Protocol (OTLP). You can send logs directly or alongside traces for full observability.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Python App     │────▶│  OTLP Exporter  │────▶│    OneUptime    │
│  (logging)      │     │                 │     │  (Logs + Traces)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Installation

```bash
pip install opentelemetry-api opentelemetry-sdk \
    opentelemetry-exporter-otlp-proto-http \
    opentelemetry-instrumentation-logging
```

---

## Basic Setup

### Configure OpenTelemetry Logging

This configuration sets up both tracing and logging with OpenTelemetry, enabling log correlation with distributed traces. Logs will automatically include trace context when emitted within an active span.

```python
# logging_config.py
# OpenTelemetry configuration for sending logs to OneUptime
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

def configure_logging(
    service_name: str,
    oneuptime_endpoint: str,
    oneuptime_token: str
):
    """Configure OpenTelemetry logging for OneUptime

    Args:
        service_name: Identifies your application in OneUptime
        oneuptime_endpoint: OTLP endpoint URL
        oneuptime_token: API token for authentication
    """

    # Resource attributes identify your service in OneUptime
    resource = Resource.create({
        SERVICE_NAME: service_name,
        "deployment.environment": "production"
    })

    # Configure tracing (required for log correlation with traces)
    trace_provider = TracerProvider(resource=resource)
    trace_exporter = OTLPSpanExporter(
        endpoint=f"{oneuptime_endpoint}/v1/traces",
        headers={"Authorization": f"Bearer {oneuptime_token}"}
    )
    # BatchSpanProcessor batches spans for efficient export
    trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(trace_provider)

    # Configure logging exporter
    logger_provider = LoggerProvider(resource=resource)
    log_exporter = OTLPLogExporter(
        endpoint=f"{oneuptime_endpoint}/v1/logs",
        headers={"Authorization": f"Bearer {oneuptime_token}"}
    )
    # BatchLogRecordProcessor batches logs for efficient export
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(log_exporter)
    )
    set_logger_provider(logger_provider)

    # Create handler that bridges Python logging to OpenTelemetry
    handler = LoggingHandler(
        level=logging.INFO,
        logger_provider=logger_provider
    )

    # Attach handler to root logger so all loggers send to OneUptime
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)

    return logger_provider
```

### Usage

Once configured, use Python's standard logging module. The `extra` parameter adds structured fields that appear as searchable attributes in OneUptime.

```python
# main.py
# Example application using OneUptime logging
import logging
import os
from logging_config import configure_logging

# Configure logging on application startup
configure_logging(
    service_name="my-python-app",
    oneuptime_endpoint=os.getenv("ONEUPTIME_ENDPOINT", "https://otlp.oneuptime.com"),
    oneuptime_token=os.getenv("ONEUPTIME_TOKEN")
)

# Get a logger for this module
logger = logging.getLogger(__name__)

def process_order(order_id: str):
    # Log with structured context using 'extra' parameter
    logger.info("Processing order", extra={"order_id": order_id})

    try:
        # Your business logic here
        result = do_processing(order_id)
        # Include relevant details in success logs
        logger.info("Order processed successfully", extra={
            "order_id": order_id,
            "result": result
        })
    except Exception as e:
        # exc_info=True includes the full stack trace
        logger.error("Order processing failed", extra={
            "order_id": order_id,
            "error": str(e)
        }, exc_info=True)
        raise
```

---

## Structured Logging

### Custom Log Formatter

This JSON formatter outputs logs in a structured format, making them easily searchable in OneUptime. It automatically includes trace context when available, enabling you to jump from a log entry to its associated distributed trace.

```python
# structured_logging.py
# Custom JSON formatter with trace correlation
import logging
import json
from datetime import datetime
from opentelemetry import trace

class StructuredFormatter(logging.Formatter):
    """Format logs as structured JSON for searchability"""

    def format(self, record: logging.LogRecord) -> str:
        # Build base log record with standard fields
        log_dict = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add trace context for correlation with distributed traces
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            # Format as hex strings for compatibility with trace UIs
            log_dict["trace_id"] = format(ctx.trace_id, "032x")
            log_dict["span_id"] = format(ctx.span_id, "016x")

        # Merge any extra fields passed to the logger
        if hasattr(record, "extra"):
            log_dict.update(record.extra)

        # Include full exception traceback if present
        if record.exc_info:
            log_dict["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_dict)

def setup_structured_logging(level: int = logging.INFO):
    """Configure structured logging to stdout"""
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)
```

### Using Extra Fields

The `extra` dictionary adds structured fields to your logs. Include context that helps with debugging: user IDs, request IDs, operation names, and measurable values like duration.

```python
import logging

logger = logging.getLogger(__name__)

def handle_user_request(user_id: str, action: str):
    # Include context that helps identify and filter this log entry
    logger.info(
        "User request received",
        extra={
            "user_id": user_id,      # Who is making the request
            "action": action,         # What operation they're performing
            "ip_address": request.client.host  # Where request originated
        }
    )

    # Process request
    result = process(user_id, action)

    # Include measurable values for metrics and analysis
    logger.info(
        "User request completed",
        extra={
            "user_id": user_id,
            "action": action,
            "result_code": result.code,      # Outcome for filtering
            "duration_ms": result.duration   # Performance tracking
        }
    )
```

---

## FastAPI Integration

### Complete Setup

This example shows a complete FastAPI application with OneUptime logging integration. The middleware logs all requests, and FastAPIInstrumentor adds automatic tracing for request handling.

```python
# app/main.py
# Complete FastAPI application with OneUptime logging
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
import logging
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

logger = logging.getLogger(__name__)

def setup_telemetry():
    """Initialize OpenTelemetry for OneUptime - called once at startup"""
    # Resource identifies your service in OneUptime
    resource = Resource.create({
        SERVICE_NAME: os.getenv("SERVICE_NAME", "fastapi-app"),
        "deployment.environment": os.getenv("ENVIRONMENT", "production")
    })

    # Configure connection to OneUptime
    endpoint = os.getenv("ONEUPTIME_ENDPOINT", "https://otlp.oneuptime.com")
    token = os.getenv("ONEUPTIME_TOKEN")
    headers = {"Authorization": f"Bearer {token}"}

    # Setup tracing for distributed trace correlation
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers)
        )
    )
    trace.set_tracer_provider(trace_provider)

    # Setup logging to send logs to OneUptime
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(endpoint=f"{endpoint}/v1/logs", headers=headers)
        )
    )
    set_logger_provider(logger_provider)

    # Bridge Python logging to OpenTelemetry
    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan handler - setup telemetry at startup"""
    setup_telemetry()
    yield  # Application runs here

app = FastAPI(lifespan=lifespan)

# Auto-instrument FastAPI for distributed tracing
FastAPIInstrumentor.instrument_app(app)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log all incoming requests and responses"""
    # Log request start with identifying information
    logger.info(
        "Request started",
        extra={
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host
        }
    )

    response = await call_next(request)

    # Log request completion with status code
    logger.info(
        "Request completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code
        }
    )

    return response

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Example endpoint with structured logging"""
    logger.info("Fetching user", extra={"user_id": user_id})

    user = await fetch_user(user_id)

    if not user:
        # Use WARNING for expected failures (not found, validation errors)
        logger.warning("User not found", extra={"user_id": user_id})
        raise HTTPException(status_code=404, detail="User not found")

    logger.info("User fetched", extra={"user_id": user_id})
    return user
```

---

## Flask Integration

Flask integration uses the same OpenTelemetry configuration. This example shows request logging with duration tracking using Flask's `before_request` and `after_request` hooks.

```python
# app.py
# Flask application with OneUptime logging
from flask import Flask, request, g
import logging
import os
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor

def create_app():
    """Flask application factory with OneUptime integration"""
    app = Flask(__name__)

    # Initialize OpenTelemetry (same config as FastAPI)
    setup_oneuptime_telemetry()

    # Auto-instrument Flask for distributed tracing
    FlaskInstrumentor().instrument_app(app)

    logger = logging.getLogger(__name__)

    @app.before_request
    def log_request_start():
        """Log request start and record start time for duration calculation"""
        g.start_time = time.time()  # Store start time in Flask's g object
        logger.info(
            "Request started",
            extra={
                "method": request.method,
                "path": request.path,
                "remote_addr": request.remote_addr
            }
        )

    @app.after_request
    def log_request_end(response):
        """Log request completion with duration"""
        duration = time.time() - g.start_time
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": duration * 1000  # Convert to milliseconds
            }
        )
        return response

    @app.route("/api/process", methods=["POST"])
    def process():
        """Example endpoint with structured logging"""
        data = request.get_json()
        # Log input size for debugging large payloads
        logger.info("Processing data", extra={"data_size": len(str(data))})

        result = process_data(data)

        # Log output identifier for tracing through the system
        logger.info("Processing complete", extra={"result_id": result["id"]})
        return result

    return app
```

---

## Log Levels and Best Practices

### When to Use Each Level

Choosing the right log level is crucial for effective monitoring. This example demonstrates when to use each level in a real-world payment processing scenario.

```python
import logging

logger = logging.getLogger(__name__)

def process_payment(payment_id: str, amount: float):
    # DEBUG: Verbose diagnostic info - only visible in development
    # Use for tracing code flow and variable values
    logger.debug("Starting payment processing", extra={
        "payment_id": payment_id,
        "amount": amount
    })

    # INFO: Normal business operations - the happy path
    # Use for significant events you want to track in production
    logger.info("Payment initiated", extra={
        "payment_id": payment_id,
        "amount": amount
    })

    try:
        result = charge_card(payment_id, amount)

        # INFO: Successful completion of operations
        logger.info("Payment successful", extra={
            "payment_id": payment_id,
            "transaction_id": result.transaction_id
        })

    except InsufficientFundsError as e:
        # WARNING: Expected, recoverable failures - not our bug
        # User can fix this (add funds, use different card)
        logger.warning("Payment declined - insufficient funds", extra={
            "payment_id": payment_id,
            "available": e.available_amount
        })
        raise

    except CardExpiredError as e:
        # WARNING: User-related issues that are expected
        logger.warning("Payment declined - card expired", extra={
            "payment_id": payment_id
        })
        raise

    except PaymentGatewayError as e:
        # ERROR: System failures that need investigation
        # Our dependency failed - may need alerting
        logger.error("Payment gateway error", extra={
            "payment_id": payment_id,
            "gateway_error": str(e)
        }, exc_info=True)  # Include stack trace
        raise

    except Exception as e:
        # CRITICAL: Unexpected failures - bugs in our code
        # These should trigger immediate alerts
        logger.critical("Unexpected payment error", extra={
            "payment_id": payment_id,
            "error_type": type(e).__name__
        }, exc_info=True)
        raise
```

---

## Environment Configuration

### Production Settings

Use a configuration class to centralize OneUptime settings. This makes it easy to validate required settings and provide sensible defaults.

```python
# config.py
# Centralized configuration for OneUptime integration
import os
from dataclasses import dataclass

@dataclass
class OneUptimeConfig:
    """Configuration for OneUptime logging and tracing"""
    endpoint: str       # OTLP endpoint URL
    token: str          # API authentication token
    service_name: str   # Identifies your app in OneUptime
    environment: str    # deployment environment (staging, production)
    log_level: str      # Minimum log level to send

    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        return cls(
            endpoint=os.getenv("ONEUPTIME_ENDPOINT", "https://otlp.oneuptime.com"),
            token=os.getenv("ONEUPTIME_TOKEN"),  # Required - no default
            service_name=os.getenv("SERVICE_NAME", "python-app"),
            environment=os.getenv("ENVIRONMENT", "production"),
            log_level=os.getenv("LOG_LEVEL", "INFO")
        )
```

### Environment Variables

Set these environment variables in your deployment configuration. The token is sensitive and should be stored securely (e.g., Kubernetes secrets, AWS Secrets Manager).

```bash
# .env
# OneUptime connection settings
ONEUPTIME_ENDPOINT=https://otlp.oneuptime.com  # OTLP endpoint
ONEUPTIME_TOKEN=your-api-token                  # API token (keep secret!)

# Service identification
SERVICE_NAME=my-python-app    # Appears in OneUptime UI
ENVIRONMENT=production        # Helps filter logs by environment

# Logging configuration
LOG_LEVEL=INFO               # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

---

## Async Logging Handler

For high-throughput applications, logging can become a bottleneck if the OTLP exporter blocks. This handler queues log records and processes them in a background thread, preventing logging from slowing down your application.

```python
# async_logging.py
# Non-blocking logging handler for high-throughput applications
import asyncio
import logging
from queue import Queue
from threading import Thread
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

class AsyncLoggingHandler(logging.Handler):
    """Non-blocking logging handler that queues logs for background processing"""

    def __init__(self, otel_handler: logging.Handler, queue_size: int = 10000):
        super().__init__()
        self.otel_handler = otel_handler
        # Queue with max size to prevent memory exhaustion
        self.queue = Queue(maxsize=queue_size)
        self._start_worker()

    def _start_worker(self):
        """Start background thread to process queued log records"""
        def worker():
            while True:
                record = self.queue.get()
                if record is None:  # Shutdown signal
                    break
                try:
                    self.otel_handler.emit(record)
                except Exception:
                    # Never let logging errors crash the application
                    pass

        # Daemon thread exits when main program exits
        self.worker = Thread(target=worker, daemon=True)
        self.worker.start()

    def emit(self, record: logging.LogRecord):
        """Queue log record for background processing (non-blocking)"""
        try:
            self.queue.put_nowait(record)  # Don't block if queue is full
        except:
            pass  # Drop log if queue is full - better than blocking

    def close(self):
        """Graceful shutdown - process remaining logs before exit"""
        self.queue.put(None)  # Signal worker to stop
        self.worker.join(timeout=5)  # Wait up to 5 seconds
        super().close()
```

---

## Best Practices

1. **Always include context** - user_id, request_id, etc.
2. **Use appropriate log levels** - don't log everything at INFO
3. **Correlate with traces** - include trace_id and span_id
4. **Don't log sensitive data** - mask PII and credentials
5. **Use structured logging** - JSON format for searchability
6. **Set up alerting** - monitor ERROR and CRITICAL logs

---

## Conclusion

Sending Python logs to OneUptime provides centralized observability. Key takeaways:

- **OpenTelemetry** provides the logging pipeline
- **Structured logs** enable powerful searching
- **Trace correlation** connects logs to requests
- **Proper log levels** reduce noise

---

*Ready to centralize your Python logs? [OneUptime](https://oneuptime.com) provides unified logging, tracing, and monitoring for your applications.*
