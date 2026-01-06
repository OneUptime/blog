# How to Structure Logs Properly in Python with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, OpenTelemetry, Logging, Structured Logging, Observability, Trace Correlation, Logs

Description: Learn how to implement structured logging in Python applications with OpenTelemetry. This guide covers trace correlation, proper log formatting, context enrichment, and integration with popular logging frameworks.

---

> Logs are your application's narrative. When properly structured and correlated with traces, they transform from a wall of text into a powerful debugging tool. This guide shows you how to implement structured logging in Python that integrates seamlessly with OpenTelemetry.

The difference between useful logs and noise comes down to structure. Structured logs with trace correlation let you jump directly from a trace span to the exact logs generated during that operation, making debugging distributed systems dramatically easier.

---

## Why Structured Logging Matters

Traditional logging produces output like this:

```
2025-01-06 10:15:23 ERROR User login failed for john@example.com
2025-01-06 10:15:23 INFO Database query completed in 150ms
2025-01-06 10:15:24 ERROR Payment processing failed
```

This is hard to parse, filter, and correlate. Structured logging produces:

```json
{"timestamp": "2025-01-06T10:15:23Z", "level": "error", "message": "User login failed", "user.email": "john@example.com", "auth.failure_reason": "invalid_password", "trace_id": "abc123", "span_id": "def456"}
```

Now you can:
- Filter logs by any field
- Correlate logs with specific traces
- Aggregate and analyze patterns
- Alert on specific conditions

---

## Setting Up OpenTelemetry Logging

### Installation

```bash
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp \
            opentelemetry-instrumentation-logging
```

### Basic Configuration

```python
# telemetry.py
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
import os

def init_telemetry(service_name: str):
    """Initialize OpenTelemetry for traces and logs"""

    resource = Resource.create({
        "service.name": service_name,
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    # Set up tracing
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/traces"),
                headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}
            )
        )
    )
    trace.set_tracer_provider(trace_provider)

    # Set up logging
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(
                endpoint=os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/logs"),
                headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}
            )
        )
    )
    set_logger_provider(logger_provider)

    # Create handler that sends to OTLP
    handler = LoggingHandler(
        level=logging.NOTSET,
        logger_provider=logger_provider
    )

    # Attach to root logger
    logging.getLogger().addHandler(handler)

    return trace.get_tracer(service_name)
```

---

## Structured Logger Implementation

### Basic Structured Logger

```python
# structured_logger.py
import logging
import json
import sys
from datetime import datetime
from opentelemetry import trace
from typing import Any, Dict, Optional

class StructuredFormatter(logging.Formatter):
    """JSON formatter with trace correlation"""

    def __init__(self, service_name: str = "app"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        # Base log structure
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
        }

        # Add trace context if available
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            log_record["trace_id"] = format(ctx.trace_id, "032x")
            log_record["span_id"] = format(ctx.span_id, "016x")

        # Add source location
        log_record["source"] = {
            "file": record.pathname,
            "line": record.lineno,
            "function": record.funcName
        }

        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }

        # Add extra fields from record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'taskName'
            ]:
                extra_fields[key] = value

        if extra_fields:
            log_record["attributes"] = extra_fields

        return json.dumps(log_record)


def get_logger(name: str, service_name: str = "app") -> logging.Logger:
    """Get a configured structured logger"""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter(service_name))
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

    return logger
```

### Enhanced Logger with Context

```python
# context_logger.py
import logging
from contextvars import ContextVar
from typing import Any, Dict, Optional
from opentelemetry import trace

# Context variable for request-scoped data
_log_context: ContextVar[Dict[str, Any]] = ContextVar('log_context', default={})

class ContextLogger:
    """Logger that automatically includes context data"""

    def __init__(self, name: str):
        self._logger = logging.getLogger(name)

    @staticmethod
    def set_context(**kwargs):
        """Set context values for the current request"""
        current = _log_context.get().copy()
        current.update(kwargs)
        _log_context.set(current)

    @staticmethod
    def clear_context():
        """Clear the current context"""
        _log_context.set({})

    @staticmethod
    def get_context() -> Dict[str, Any]:
        """Get current context"""
        return _log_context.get().copy()

    def _get_trace_context(self) -> Dict[str, str]:
        """Get current trace context"""
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            return {
                "trace_id": format(ctx.trace_id, "032x"),
                "span_id": format(ctx.span_id, "016x")
            }
        return {}

    def _log(self, level: int, message: str, **kwargs):
        """Internal logging method with context enrichment"""
        # Merge context with provided kwargs
        extra = {
            **_log_context.get(),
            **self._get_trace_context(),
            **kwargs
        }

        self._logger.log(level, message, extra=extra)

    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        self._log(logging.ERROR, message, **kwargs)

    def exception(self, message: str, **kwargs):
        self._log(logging.ERROR, message, exc_info=True, **kwargs)

    def critical(self, message: str, **kwargs):
        self._log(logging.CRITICAL, message, **kwargs)


def get_context_logger(name: str) -> ContextLogger:
    """Get a context-aware logger"""
    return ContextLogger(name)
```

---

## Integration with Web Frameworks

### Flask Integration

```python
# flask_logging.py
from flask import Flask, request, g
from context_logger import ContextLogger, get_context_logger
from structured_logger import get_logger, StructuredFormatter
import logging
import uuid
import time

app = Flask(__name__)

# Configure structured logging
logger = get_context_logger(__name__)

# Configure Flask's logger
handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter("flask-api"))
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

@app.before_request
def before_request():
    """Set up request context for logging"""
    g.start_time = time.time()
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

    # Set logging context for this request
    ContextLogger.set_context(
        request_id=g.request_id,
        method=request.method,
        path=request.path,
        remote_addr=request.remote_addr,
        user_agent=request.headers.get('User-Agent', 'unknown')
    )

    logger.info("Request started")

@app.after_request
def after_request(response):
    """Log request completion"""
    duration_ms = (time.time() - g.start_time) * 1000

    logger.info(
        "Request completed",
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2),
        response_size=response.content_length or 0
    )

    # Clear context after request
    ContextLogger.clear_context()

    return response

@app.errorhandler(Exception)
def handle_error(error):
    """Log unhandled exceptions"""
    logger.exception(
        "Unhandled exception",
        error_type=type(error).__name__,
        error_message=str(error)
    )
    return {"error": "Internal server error"}, 500

@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.json

    logger.info("Creating user", user_email=data.get("email"))

    try:
        user = create_user_in_db(data)
        logger.info("User created", user_id=user["id"])
        return {"user": user}, 201
    except ValueError as e:
        logger.warning("Invalid user data", error=str(e))
        return {"error": str(e)}, 400

@app.route("/api/users/<user_id>")
def get_user(user_id):
    logger.debug("Fetching user", user_id=user_id)

    user = get_user_from_db(user_id)
    if not user:
        logger.warning("User not found", user_id=user_id)
        return {"error": "Not found"}, 404

    return {"user": user}
```

### FastAPI Integration

```python
# fastapi_logging.py
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from context_logger import ContextLogger, get_context_logger
from opentelemetry import trace
import time
import uuid

app = FastAPI()
logger = get_context_logger(__name__)
tracer = trace.get_tracer(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request logging with context"""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        start_time = time.time()

        # Set logging context
        ContextLogger.set_context(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else 'unknown'
        )

        # Log request start
        logger.info("Request started", query_params=dict(request.query_params))

        try:
            response = await call_next(request)

            # Log request completion
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "Request completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2)
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            logger.exception(
                "Request failed",
                error_type=type(e).__name__
            )
            raise
        finally:
            ContextLogger.clear_context()

app.add_middleware(LoggingMiddleware)

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)

        logger.debug("Fetching order", order_id=order_id)

        order = await fetch_order(order_id)

        if not order:
            logger.warning("Order not found", order_id=order_id)
            return {"error": "Not found"}, 404

        logger.info(
            "Order retrieved",
            order_id=order_id,
            order_status=order["status"],
            order_total=order["total"]
        )

        return order

@app.post("/api/orders")
async def create_order(order_data: dict):
    with tracer.start_as_current_span("create_order") as span:
        logger.info(
            "Creating order",
            items_count=len(order_data.get("items", [])),
            customer_id=order_data.get("customer_id")
        )

        try:
            order = await process_order(order_data)

            span.set_attribute("order.id", order["id"])

            logger.info(
                "Order created",
                order_id=order["id"],
                order_total=order["total"]
            )

            return order

        except ValueError as e:
            logger.error(
                "Order validation failed",
                error=str(e),
                customer_id=order_data.get("customer_id")
            )
            return {"error": str(e)}, 400
```

---

## Python Standard Library Integration

### Using structlog for Better Ergonomics

```bash
pip install structlog
```

```python
# structlog_config.py
import structlog
import logging
from opentelemetry import trace
from datetime import datetime

def add_trace_context(logger, method_name, event_dict):
    """Processor to add trace context to logs"""
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict

def add_timestamp(logger, method_name, event_dict):
    """Add ISO timestamp"""
    event_dict["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return event_dict

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        add_timestamp,
        add_trace_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Usage
log = structlog.get_logger()

def process_payment(payment_id: str, amount: float):
    log.info(
        "Processing payment",
        payment_id=payment_id,
        amount=amount,
        currency="USD"
    )

    try:
        result = charge_card(payment_id, amount)
        log.info(
            "Payment successful",
            payment_id=payment_id,
            transaction_id=result["transaction_id"]
        )
        return result
    except PaymentError as e:
        log.error(
            "Payment failed",
            payment_id=payment_id,
            error_code=e.code,
            error_message=str(e)
        )
        raise
```

### Integrating with python-json-logger

```bash
pip install python-json-logger
```

```python
# json_logger_config.py
import logging
from pythonjsonlogger import jsonlogger
from opentelemetry import trace
from datetime import datetime

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """JSON formatter with trace correlation"""

    def __init__(self, *args, **kwargs):
        self.service_name = kwargs.pop('service_name', 'app')
        super().__init__(*args, **kwargs)

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'

        # Add service name
        log_record['service'] = self.service_name

        # Add log level
        log_record['level'] = record.levelname.lower()

        # Add trace context
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            log_record['trace_id'] = format(ctx.trace_id, '032x')
            log_record['span_id'] = format(ctx.span_id, '016x')

        # Add source info
        log_record['source'] = {
            'file': record.pathname,
            'line': record.lineno,
            'function': record.funcName
        }

def setup_json_logging(service_name: str = 'app', level: int = logging.INFO):
    """Configure JSON logging for the application"""

    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        service_name=service_name
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    return root_logger

# Usage
setup_json_logging('payment-service')
logger = logging.getLogger(__name__)

logger.info("Payment processed", extra={
    'payment_id': 'pay_123',
    'amount': 99.99,
    'currency': 'USD'
})
```

---

## Log Levels and When to Use Them

```python
# logging_levels.py
from context_logger import get_context_logger

logger = get_context_logger(__name__)

# DEBUG: Detailed diagnostic information
# Use for: Verbose output during development
logger.debug(
    "Cache lookup performed",
    cache_key="user:123",
    cache_hit=True,
    lookup_time_ms=0.5
)

# INFO: General operational events
# Use for: Normal operations, business events
logger.info(
    "User registered",
    user_id="usr_456",
    email="user@example.com",
    registration_source="web"
)

# WARNING: Unexpected but handled situations
# Use for: Recoverable errors, deprecations, approaching limits
logger.warning(
    "Rate limit threshold approaching",
    current_rate=95,
    limit=100,
    window_seconds=60
)

# ERROR: Failures that prevented an operation
# Use for: Errors that need attention but aren't critical
logger.error(
    "Payment processing failed",
    payment_id="pay_789",
    error_code="card_declined",
    retry_count=2
)

# CRITICAL: Severe failures affecting system operation
# Use for: System-wide failures, data corruption
logger.critical(
    "Database connection pool exhausted",
    active_connections=100,
    max_connections=100,
    waiting_requests=50
)
```

---

## Sensitive Data Handling

### Redacting Sensitive Fields

```python
# secure_logger.py
import re
import logging
from typing import Any, Dict, List, Set

class SensitiveDataFilter(logging.Filter):
    """Filter to redact sensitive data from logs"""

    SENSITIVE_FIELDS: Set[str] = {
        'password', 'secret', 'token', 'api_key', 'apikey',
        'authorization', 'auth', 'credential', 'private_key',
        'credit_card', 'card_number', 'cvv', 'ssn', 'social_security'
    }

    PATTERNS = [
        # Email addresses
        (re.compile(r'([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)'), r'\1***@\2'),
        # Credit card numbers
        (re.compile(r'\b(\d{4})\d{8,12}(\d{4})\b'), r'\1********\2'),
        # API keys (common patterns)
        (re.compile(r'(sk_live_|pk_live_|sk_test_|pk_test_)\w+'), r'\1***REDACTED***'),
    ]

    def __init__(self, additional_fields: List[str] = None):
        super().__init__()
        if additional_fields:
            self.SENSITIVE_FIELDS.update(additional_fields)

    def filter(self, record: logging.LogRecord) -> bool:
        # Redact sensitive fields in extra attributes
        if hasattr(record, '__dict__'):
            for key, value in list(record.__dict__.items()):
                if self._is_sensitive_key(key):
                    setattr(record, key, '[REDACTED]')
                elif isinstance(value, str):
                    setattr(record, key, self._redact_patterns(value))
                elif isinstance(value, dict):
                    setattr(record, key, self._redact_dict(value))

        # Redact patterns in the message
        if record.msg:
            record.msg = self._redact_patterns(str(record.msg))

        return True

    def _is_sensitive_key(self, key: str) -> bool:
        key_lower = key.lower()
        return any(field in key_lower for field in self.SENSITIVE_FIELDS)

    def _redact_patterns(self, text: str) -> str:
        for pattern, replacement in self.PATTERNS:
            text = pattern.sub(replacement, text)
        return text

    def _redact_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        result = {}
        for key, value in data.items():
            if self._is_sensitive_key(key):
                result[key] = '[REDACTED]'
            elif isinstance(value, str):
                result[key] = self._redact_patterns(value)
            elif isinstance(value, dict):
                result[key] = self._redact_dict(value)
            else:
                result[key] = value
        return result


# Usage
logger = logging.getLogger(__name__)
logger.addFilter(SensitiveDataFilter(['phone_number', 'address']))

# This will be logged with sensitive data redacted
logger.info("User created", extra={
    'email': 'user@example.com',  # Will be redacted
    'password': 'secret123',       # Will show [REDACTED]
    'user_id': 'usr_123'           # Will remain unchanged
})
```

---

## Performance Considerations

### Async Logging for High Throughput

```python
# async_logger.py
import asyncio
import logging
from queue import Queue
from threading import Thread
from typing import Any, Dict

class AsyncLogHandler(logging.Handler):
    """Non-blocking log handler using a queue"""

    def __init__(self, target_handler: logging.Handler):
        super().__init__()
        self.target = target_handler
        self.queue: Queue = Queue()
        self._running = True

        # Start worker thread
        self._thread = Thread(target=self._worker, daemon=True)
        self._thread.start()

    def emit(self, record: logging.LogRecord):
        """Put record in queue (non-blocking)"""
        try:
            self.queue.put_nowait(record)
        except:
            # Queue full, drop the log
            pass

    def _worker(self):
        """Process log records from queue"""
        while self._running or not self.queue.empty():
            try:
                record = self.queue.get(timeout=0.1)
                self.target.emit(record)
            except:
                continue

    def close(self):
        """Flush remaining logs and close"""
        self._running = False
        self._thread.join(timeout=5.0)
        super().close()


# Usage
stream_handler = logging.StreamHandler()
async_handler = AsyncLogHandler(stream_handler)

logger = logging.getLogger()
logger.addHandler(async_handler)
```

### Lazy Evaluation for Expensive Operations

```python
# lazy_logging.py
import logging
from functools import cached_property

class LazyStr:
    """Lazy string evaluation for expensive operations"""

    def __init__(self, func, *args, **kwargs):
        self._func = func
        self._args = args
        self._kwargs = kwargs
        self._value = None

    def __str__(self):
        if self._value is None:
            self._value = str(self._func(*self._args, **self._kwargs))
        return self._value

logger = logging.getLogger(__name__)

def get_expensive_debug_info():
    """Simulates an expensive operation"""
    import time
    time.sleep(1)  # Expensive computation
    return {"detailed": "debug info"}

# Only evaluated if DEBUG level is enabled
logger.debug(
    "Debug info: %s",
    LazyStr(get_expensive_debug_info)
)
```

---

## Complete Example Application

```python
# app.py
import os
import logging
from flask import Flask, request, jsonify, g
from opentelemetry import trace
import structlog
import uuid
import time

# Configure structlog
from structlog_config import setup_structlog
setup_structlog('order-service')

# Initialize OpenTelemetry
from telemetry import init_telemetry
tracer = init_telemetry('order-service')

# Get logger
log = structlog.get_logger()

app = Flask(__name__)

@app.before_request
def setup_request_context():
    """Set up per-request logging context"""
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    g.start_time = time.time()

    # Bind request context to logger
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=g.request_id,
        method=request.method,
        path=request.path,
        client_ip=request.remote_addr
    )

    log.info("Request started")

@app.after_request
def log_response(response):
    """Log request completion"""
    duration_ms = (time.time() - g.start_time) * 1000

    log.info(
        "Request completed",
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2)
    )

    return response

@app.errorhandler(Exception)
def handle_error(error):
    log.exception("Unhandled exception", error_type=type(error).__name__)
    return jsonify({"error": "Internal server error"}), 500

@app.route("/api/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        order_data = request.json

        log.info(
            "Creating order",
            customer_id=order_data.get("customer_id"),
            items_count=len(order_data.get("items", []))
        )

        # Validate order
        with tracer.start_as_current_span("validate_order"):
            try:
                validate_order(order_data)
            except ValueError as e:
                log.warning("Order validation failed", error=str(e))
                return jsonify({"error": str(e)}), 400

        # Process order
        with tracer.start_as_current_span("process_order"):
            order = process_order(order_data)
            span.set_attribute("order.id", order["id"])

        log.info(
            "Order created",
            order_id=order["id"],
            order_total=order["total"]
        )

        return jsonify(order), 201

@app.route("/api/orders/<order_id>")
def get_order(order_id: str):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)

        log.debug("Fetching order", order_id=order_id)

        order = fetch_order(order_id)

        if not order:
            log.warning("Order not found", order_id=order_id)
            return jsonify({"error": "Not found"}), 404

        log.info("Order retrieved", order_id=order_id, order_status=order["status"])

        return jsonify(order)

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

# Helper functions
def validate_order(data):
    if not data.get("items"):
        raise ValueError("Order must have items")
    if not data.get("customer_id"):
        raise ValueError("Customer ID required")

def process_order(data):
    return {
        "id": f"ord_{uuid.uuid4().hex[:8]}",
        "customer_id": data["customer_id"],
        "items": data["items"],
        "total": sum(item.get("price", 0) * item.get("quantity", 1) for item in data["items"]),
        "status": "pending"
    }

def fetch_order(order_id):
    # Simulated database fetch
    return {
        "id": order_id,
        "customer_id": "cust_123",
        "items": [],
        "total": 99.99,
        "status": "completed"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

---

## Best Practices Summary

1. **Always use structured logging** - JSON format enables machine parsing
2. **Include trace correlation** - Connect logs to traces automatically
3. **Use consistent field names** - Follow semantic conventions
4. **Set appropriate log levels** - DEBUG for development, INFO for production
5. **Redact sensitive data** - Never log passwords, tokens, or PII
6. **Include context** - Request ID, user ID, operation type
7. **Log at boundaries** - Entry/exit of services and important operations
8. **Use lazy evaluation** - For expensive debug operations

---

*Ready to centralize your Python application logs? [OneUptime](https://oneuptime.com) provides native OpenTelemetry support with automatic trace correlation, powerful search, and alerting capabilities.*

**Related Reading:**
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [Monitor Logs with OneUptime](https://oneuptime.com/blog/post/2025-10-27-monitor-logs-with-oneuptime/view)
