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

```python
# logging_config.py
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
    """Configure OpenTelemetry logging for OneUptime"""

    # Create resource
    resource = Resource.create({
        SERVICE_NAME: service_name,
        "deployment.environment": "production"
    })

    # Configure tracing (for log correlation)
    trace_provider = TracerProvider(resource=resource)
    trace_exporter = OTLPSpanExporter(
        endpoint=f"{oneuptime_endpoint}/v1/traces",
        headers={"Authorization": f"Bearer {oneuptime_token}"}
    )
    trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(trace_provider)

    # Configure logging
    logger_provider = LoggerProvider(resource=resource)
    log_exporter = OTLPLogExporter(
        endpoint=f"{oneuptime_endpoint}/v1/logs",
        headers={"Authorization": f"Bearer {oneuptime_token}"}
    )
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(log_exporter)
    )
    set_logger_provider(logger_provider)

    # Create handler
    handler = LoggingHandler(
        level=logging.INFO,
        logger_provider=logger_provider
    )

    # Add to root logger
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)

    return logger_provider
```

### Usage

```python
# main.py
import logging
import os
from logging_config import configure_logging

# Configure on startup
configure_logging(
    service_name="my-python-app",
    oneuptime_endpoint=os.getenv("ONEUPTIME_ENDPOINT", "https://otlp.oneuptime.com"),
    oneuptime_token=os.getenv("ONEUPTIME_TOKEN")
)

logger = logging.getLogger(__name__)

def process_order(order_id: str):
    logger.info("Processing order", extra={"order_id": order_id})

    try:
        # Process order
        result = do_processing(order_id)
        logger.info("Order processed successfully", extra={
            "order_id": order_id,
            "result": result
        })
    except Exception as e:
        logger.error("Order processing failed", extra={
            "order_id": order_id,
            "error": str(e)
        }, exc_info=True)
        raise
```

---

## Structured Logging

### Custom Log Formatter

```python
# structured_logging.py
import logging
import json
from datetime import datetime
from opentelemetry import trace

class StructuredFormatter(logging.Formatter):
    """Format logs as structured JSON"""

    def format(self, record: logging.LogRecord) -> str:
        # Base log record
        log_dict = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add trace context if available
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            log_dict["trace_id"] = format(ctx.trace_id, "032x")
            log_dict["span_id"] = format(ctx.span_id, "016x")

        # Add extra fields
        if hasattr(record, "extra"):
            log_dict.update(record.extra)

        # Add exception info
        if record.exc_info:
            log_dict["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_dict)

def setup_structured_logging(level: int = logging.INFO):
    """Setup structured logging"""
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)
```

### Using Extra Fields

```python
import logging

logger = logging.getLogger(__name__)

def handle_user_request(user_id: str, action: str):
    # Log with extra context
    logger.info(
        "User request received",
        extra={
            "user_id": user_id,
            "action": action,
            "ip_address": request.client.host
        }
    )

    # Process request
    result = process(user_id, action)

    logger.info(
        "User request completed",
        extra={
            "user_id": user_id,
            "action": action,
            "result_code": result.code,
            "duration_ms": result.duration
        }
    )
```

---

## FastAPI Integration

### Complete Setup

```python
# app/main.py
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
    """Initialize OpenTelemetry for OneUptime"""
    resource = Resource.create({
        SERVICE_NAME: os.getenv("SERVICE_NAME", "fastapi-app"),
        "deployment.environment": os.getenv("ENVIRONMENT", "production")
    })

    endpoint = os.getenv("ONEUPTIME_ENDPOINT", "https://otlp.oneuptime.com")
    token = os.getenv("ONEUPTIME_TOKEN")
    headers = {"Authorization": f"Bearer {token}"}

    # Tracing
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers)
        )
    )
    trace.set_tracer_provider(trace_provider)

    # Logging
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(endpoint=f"{endpoint}/v1/logs", headers=headers)
        )
    )
    set_logger_provider(logger_provider)

    # Add handler
    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_telemetry()
    yield

app = FastAPI(lifespan=lifespan)

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests"""
    logger.info(
        "Request started",
        extra={
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host
        }
    )

    response = await call_next(request)

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
    logger.info("Fetching user", extra={"user_id": user_id})

    user = await fetch_user(user_id)

    if not user:
        logger.warning("User not found", extra={"user_id": user_id})
        raise HTTPException(status_code=404, detail="User not found")

    logger.info("User fetched", extra={"user_id": user_id})
    return user
```

---

## Flask Integration

```python
# app.py
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
    app = Flask(__name__)

    # Setup telemetry
    setup_oneuptime_telemetry()

    # Instrument Flask
    FlaskInstrumentor().instrument_app(app)

    logger = logging.getLogger(__name__)

    @app.before_request
    def log_request_start():
        g.start_time = time.time()
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
        duration = time.time() - g.start_time
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": duration * 1000
            }
        )
        return response

    @app.route("/api/process", methods=["POST"])
    def process():
        data = request.get_json()
        logger.info("Processing data", extra={"data_size": len(str(data))})

        result = process_data(data)

        logger.info("Processing complete", extra={"result_id": result["id"]})
        return result

    return app
```

---

## Log Levels and Best Practices

### When to Use Each Level

```python
import logging

logger = logging.getLogger(__name__)

def process_payment(payment_id: str, amount: float):
    # DEBUG: Detailed diagnostic info
    logger.debug("Starting payment processing", extra={
        "payment_id": payment_id,
        "amount": amount
    })

    # INFO: Normal operations
    logger.info("Payment initiated", extra={
        "payment_id": payment_id,
        "amount": amount
    })

    try:
        result = charge_card(payment_id, amount)

        # INFO: Successful operations
        logger.info("Payment successful", extra={
            "payment_id": payment_id,
            "transaction_id": result.transaction_id
        })

    except InsufficientFundsError as e:
        # WARNING: Expected failures
        logger.warning("Payment declined - insufficient funds", extra={
            "payment_id": payment_id,
            "available": e.available_amount
        })
        raise

    except CardExpiredError as e:
        # WARNING: User-related issues
        logger.warning("Payment declined - card expired", extra={
            "payment_id": payment_id
        })
        raise

    except PaymentGatewayError as e:
        # ERROR: System failures
        logger.error("Payment gateway error", extra={
            "payment_id": payment_id,
            "gateway_error": str(e)
        }, exc_info=True)
        raise

    except Exception as e:
        # CRITICAL: Unexpected failures
        logger.critical("Unexpected payment error", extra={
            "payment_id": payment_id,
            "error_type": type(e).__name__
        }, exc_info=True)
        raise
```

---

## Environment Configuration

### Production Settings

```python
# config.py
import os
from dataclasses import dataclass

@dataclass
class OneUptimeConfig:
    endpoint: str
    token: str
    service_name: str
    environment: str
    log_level: str

    @classmethod
    def from_env(cls):
        return cls(
            endpoint=os.getenv("ONEUPTIME_ENDPOINT", "https://otlp.oneuptime.com"),
            token=os.getenv("ONEUPTIME_TOKEN"),
            service_name=os.getenv("SERVICE_NAME", "python-app"),
            environment=os.getenv("ENVIRONMENT", "production"),
            log_level=os.getenv("LOG_LEVEL", "INFO")
        )
```

### Environment Variables

```bash
# .env
ONEUPTIME_ENDPOINT=https://otlp.oneuptime.com
ONEUPTIME_TOKEN=your-api-token
SERVICE_NAME=my-python-app
ENVIRONMENT=production
LOG_LEVEL=INFO
```

---

## Async Logging Handler

For high-throughput applications:

```python
# async_logging.py
import asyncio
import logging
from queue import Queue
from threading import Thread
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

class AsyncLoggingHandler(logging.Handler):
    """Non-blocking logging handler"""

    def __init__(self, otel_handler: logging.Handler, queue_size: int = 10000):
        super().__init__()
        self.otel_handler = otel_handler
        self.queue = Queue(maxsize=queue_size)
        self._start_worker()

    def _start_worker(self):
        def worker():
            while True:
                record = self.queue.get()
                if record is None:
                    break
                try:
                    self.otel_handler.emit(record)
                except Exception:
                    pass  # Don't let logging errors crash the app

        self.worker = Thread(target=worker, daemon=True)
        self.worker.start()

    def emit(self, record: logging.LogRecord):
        try:
            self.queue.put_nowait(record)
        except:
            pass  # Drop if queue full

    def close(self):
        self.queue.put(None)
        self.worker.join(timeout=5)
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
