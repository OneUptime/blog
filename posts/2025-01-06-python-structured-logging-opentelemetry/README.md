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

The following code sets up OpenTelemetry for both tracing and logging. It creates resource attributes to identify your service, configures trace and log exporters to send data to an OTLP endpoint, and attaches a logging handler that automatically enriches Python logs with trace context.

```python
# telemetry.py
# Import core logging and OpenTelemetry modules for traces and logs
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

    # Define resource attributes to identify your service in observability backends
    resource = Resource.create({
        "service.name": service_name,  # Unique identifier for your service
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),  # Version from env
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),  # dev/staging/prod
    })

    # Configure the trace provider with OTLP exporter for distributed tracing
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(  # Batches spans for efficient export
            OTLPSpanExporter(
                endpoint=os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/traces"),
                headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}  # Auth token
            )
        )
    )
    trace.set_tracer_provider(trace_provider)  # Register as the global trace provider

    # Configure the log provider with OTLP exporter for centralized logging
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(  # Batches logs for efficient export
            OTLPLogExporter(
                endpoint=os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/logs"),
                headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}  # Auth token
            )
        )
    )
    set_logger_provider(logger_provider)  # Register as the global log provider

    # Create a logging handler that bridges Python logging to OpenTelemetry
    handler = LoggingHandler(
        level=logging.NOTSET,  # Capture all log levels
        logger_provider=logger_provider
    )

    # Attach the OpenTelemetry handler to the root logger
    logging.getLogger().addHandler(handler)

    # Return a tracer for creating spans in your application
    return trace.get_tracer(service_name)
```

---

## Structured Logger Implementation

### Basic Structured Logger

This implementation creates a custom logging formatter that outputs JSON-structured logs. It automatically injects OpenTelemetry trace and span IDs into every log message, enabling you to correlate logs with specific traces when debugging distributed systems.

```python
# structured_logger.py
# Import required modules for logging, JSON serialization, and trace correlation
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
        self.service_name = service_name  # Store service name for log identification

    def format(self, record: logging.LogRecord) -> str:
        # Build the base log structure with essential fields
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",  # ISO 8601 format
            "level": record.levelname.lower(),  # Lowercase for consistency
            "logger": record.name,  # Logger name (usually module path)
            "message": record.getMessage(),  # The actual log message
            "service": self.service_name,  # Service identifier
        }

        # Inject trace context for correlation with distributed traces
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            # Format trace_id as 32-char hex, span_id as 16-char hex
            log_record["trace_id"] = format(ctx.trace_id, "032x")
            log_record["span_id"] = format(ctx.span_id, "016x")

        # Include source location for debugging
        log_record["source"] = {
            "file": record.pathname,  # Full file path
            "line": record.lineno,  # Line number where log was called
            "function": record.funcName  # Function name
        }

        # Capture exception details if an error was logged
        if record.exc_info:
            log_record["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)  # Full stack trace
            }

        # Extract custom fields passed via 'extra' parameter
        extra_fields = {}
        for key, value in record.__dict__.items():
            # Skip standard LogRecord attributes
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'taskName'
            ]:
                extra_fields[key] = value  # Include custom fields

        if extra_fields:
            log_record["attributes"] = extra_fields  # Add custom attributes

        return json.dumps(log_record)  # Serialize to JSON string


def get_logger(name: str, service_name: str = "app") -> logging.Logger:
    """Get a configured structured logger"""
    logger = logging.getLogger(name)

    # Only add handler if logger doesn't already have one (prevents duplicates)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)  # Output to stdout for container logging
        handler.setFormatter(StructuredFormatter(service_name))  # Use JSON formatter
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)  # Capture all log levels

    return logger
```

### Enhanced Logger with Context

The context-aware logger uses Python's contextvars to maintain request-scoped data that is automatically included in all log messages. This eliminates the need to pass context information through every function call, making your code cleaner while ensuring comprehensive logging.

```python
# context_logger.py
# Use contextvars for thread-safe, request-scoped logging context
import logging
from contextvars import ContextVar
from typing import Any, Dict, Optional
from opentelemetry import trace

# Thread-safe context variable for request-scoped logging data
_log_context: ContextVar[Dict[str, Any]] = ContextVar('log_context', default={})

class ContextLogger:
    """Logger that automatically includes context data"""

    def __init__(self, name: str):
        self._logger = logging.getLogger(name)  # Wrap the standard logger

    @staticmethod
    def set_context(**kwargs):
        """Set context values for the current request"""
        current = _log_context.get().copy()  # Get current context (copy to avoid mutation)
        current.update(kwargs)  # Merge in new values
        _log_context.set(current)  # Update the context variable

    @staticmethod
    def clear_context():
        """Clear the current context - call at end of request"""
        _log_context.set({})  # Reset to empty dict

    @staticmethod
    def get_context() -> Dict[str, Any]:
        """Get current context as a copy"""
        return _log_context.get().copy()

    def _get_trace_context(self) -> Dict[str, str]:
        """Extract trace context from current OpenTelemetry span"""
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            return {
                "trace_id": format(ctx.trace_id, "032x"),  # 32-char hex
                "span_id": format(ctx.span_id, "016x")  # 16-char hex
            }
        return {}  # Return empty if no active span

    def _log(self, level: int, message: str, **kwargs):
        """Internal logging method that merges all context sources"""
        # Combine: request context + trace context + explicit kwargs
        extra = {
            **_log_context.get(),  # Request-scoped context
            **self._get_trace_context(),  # OpenTelemetry trace IDs
            **kwargs  # Additional fields passed to log call
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

This example demonstrates how to integrate structured logging with Flask using middleware hooks. The before_request hook sets up logging context at the start of each request, and the after_request hook logs the request completion with timing information.

```python
# flask_logging.py
# Flask integration with structured logging and request context
from flask import Flask, request, g
from context_logger import ContextLogger, get_context_logger
from structured_logger import get_logger, StructuredFormatter
import logging
import uuid
import time

app = Flask(__name__)

# Configure structured logging with context support
logger = get_context_logger(__name__)

# Configure Flask's built-in logger with structured JSON output
handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter("flask-api"))
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

@app.before_request
def before_request():
    """Set up request context for logging - runs before every request"""
    g.start_time = time.time()  # Track request duration
    # Use existing request ID or generate a new UUID for tracing
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

    # Set logging context that will be included in all subsequent logs
    ContextLogger.set_context(
        request_id=g.request_id,  # Unique identifier for this request
        method=request.method,  # HTTP method (GET, POST, etc.)
        path=request.path,  # URL path
        remote_addr=request.remote_addr,  # Client IP address
        user_agent=request.headers.get('User-Agent', 'unknown')  # Browser/client info
    )

    logger.info("Request started")  # Log request initiation

@app.after_request
def after_request(response):
    """Log request completion with timing - runs after every request"""
    duration_ms = (time.time() - g.start_time) * 1000  # Calculate duration

    # Log response details for monitoring and debugging
    logger.info(
        "Request completed",
        status_code=response.status_code,  # HTTP status code
        duration_ms=round(duration_ms, 2),  # Response time in milliseconds
        response_size=response.content_length or 0  # Response body size
    )

    # Clean up context to prevent leakage between requests
    ContextLogger.clear_context()

    return response

@app.errorhandler(Exception)
def handle_error(error):
    """Global exception handler - logs all unhandled errors"""
    logger.exception(
        "Unhandled exception",
        error_type=type(error).__name__,  # Exception class name
        error_message=str(error)  # Error message
    )
    return {"error": "Internal server error"}, 500

@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.json

    # Log intent with relevant business data (email for debugging)
    logger.info("Creating user", user_email=data.get("email"))

    try:
        user = create_user_in_db(data)  # Database operation
        logger.info("User created", user_id=user["id"])  # Log success with user ID
        return {"user": user}, 201
    except ValueError as e:
        # Log validation failures as warnings (expected errors)
        logger.warning("Invalid user data", error=str(e))
        return {"error": str(e)}, 400

@app.route("/api/users/<user_id>")
def get_user(user_id):
    # Debug level for routine operations (won't appear in production)
    logger.debug("Fetching user", user_id=user_id)

    user = get_user_from_db(user_id)
    if not user:
        # Log missing resources as warnings for monitoring 404 rates
        logger.warning("User not found", user_id=user_id)
        return {"error": "Not found"}, 404

    return {"user": user}
```

### FastAPI Integration

FastAPI integration uses middleware for request logging along with OpenTelemetry spans for distributed tracing. This approach automatically captures request metadata and timing for every endpoint while maintaining trace correlation.

```python
# fastapi_logging.py
# FastAPI integration with structured logging and OpenTelemetry tracing
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from context_logger import ContextLogger, get_context_logger
from opentelemetry import trace
import time
import uuid

app = FastAPI()
logger = get_context_logger(__name__)  # Context-aware structured logger
tracer = trace.get_tracer(__name__)  # OpenTelemetry tracer for spans

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request logging with context - wraps all requests"""

    async def dispatch(self, request: Request, call_next):
        # Generate or extract request ID for distributed tracing
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        start_time = time.time()  # Start timing

        # Set logging context for all logs during this request
        ContextLogger.set_context(
            request_id=request_id,  # Correlation ID
            method=request.method,  # HTTP method
            path=request.url.path,  # Endpoint path
            client_ip=request.client.host if request.client else 'unknown'  # Client IP
        )

        # Log request start with query parameters for debugging
        logger.info("Request started", query_params=dict(request.query_params))

        try:
            response = await call_next(request)  # Process the actual request

            # Calculate and log response timing
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "Request completed",
                status_code=response.status_code,  # HTTP response status
                duration_ms=round(duration_ms, 2)  # Response time
            )

            # Add request ID to response for client-side tracing
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            # Log unhandled exceptions with full stack trace
            logger.exception(
                "Request failed",
                error_type=type(e).__name__  # Exception class
            )
            raise  # Re-raise to let FastAPI handle the error
        finally:
            # Always clean up context, even on exceptions
            ContextLogger.clear_context()

# Register middleware with the FastAPI application
app.add_middleware(LoggingMiddleware)

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    # Create a span for this operation - automatically linked to parent trace
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)  # Add order ID to span for filtering

        logger.debug("Fetching order", order_id=order_id)  # Debug level for routine ops

        order = await fetch_order(order_id)  # Database lookup

        if not order:
            # Log as warning - not an error but worth monitoring
            logger.warning("Order not found", order_id=order_id)
            return {"error": "Not found"}, 404

        # Log successful retrieval with business-relevant data
        logger.info(
            "Order retrieved",
            order_id=order_id,
            order_status=order["status"],  # Current order status
            order_total=order["total"]  # Order value for analytics
        )

        return order

@app.post("/api/orders")
async def create_order(order_data: dict):
    # Create a span for the entire order creation flow
    with tracer.start_as_current_span("create_order") as span:
        # Log order creation attempt with key business data
        logger.info(
            "Creating order",
            items_count=len(order_data.get("items", [])),  # Number of items
            customer_id=order_data.get("customer_id")  # Customer for support queries
        )

        try:
            order = await process_order(order_data)  # Business logic

            # Add order ID to span after creation for trace filtering
            span.set_attribute("order.id", order["id"])

            # Log successful creation with key metrics
            logger.info(
                "Order created",
                order_id=order["id"],
                order_total=order["total"]  # Order value
            )

            return order

        except ValueError as e:
            # Log validation failures as errors with context
            logger.error(
                "Order validation failed",
                error=str(e),  # Validation error message
                customer_id=order_data.get("customer_id")  # For support debugging
            )
            return {"error": str(e)}, 400
```

---

## Python Standard Library Integration

### Using structlog for Better Ergonomics

Structlog provides a more ergonomic API for structured logging compared to the standard library. It uses a processor pipeline that transforms log events, making it easy to add trace context, timestamps, and custom processing.

```bash
pip install structlog
```

```python
# structlog_config.py
# Configure structlog with OpenTelemetry trace correlation
import structlog
import logging
from opentelemetry import trace
from datetime import datetime

def add_trace_context(logger, method_name, event_dict):
    """Processor to add OpenTelemetry trace context to every log event"""
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        ctx = span.get_span_context()
        # Add trace and span IDs for correlation
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict  # Always return event_dict in processors

def add_timestamp(logger, method_name, event_dict):
    """Processor to add ISO 8601 timestamp to every log event"""
    event_dict["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return event_dict

# Configure structlog with a chain of processors
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,  # Respect log levels
        structlog.stdlib.add_logger_name,  # Add logger name
        structlog.stdlib.add_log_level,  # Add level (info, error, etc.)
        structlog.stdlib.PositionalArgumentsFormatter(),  # Handle %s style formatting
        add_timestamp,  # Custom: Add ISO timestamp
        add_trace_context,  # Custom: Add OpenTelemetry trace IDs
        structlog.processors.StackInfoRenderer(),  # Render stack traces
        structlog.processors.format_exc_info,  # Format exception info
        structlog.processors.UnicodeDecoder(),  # Handle unicode
        structlog.processors.JSONRenderer()  # Output as JSON
    ],
    context_class=dict,  # Use dict for context storage
    logger_factory=structlog.stdlib.LoggerFactory(),  # Bridge to stdlib logging
    wrapper_class=structlog.stdlib.BoundLogger,  # Enable bound loggers
    cache_logger_on_first_use=True,  # Cache for performance
)

# Get a structlog logger instance
log = structlog.get_logger()

def process_payment(payment_id: str, amount: float):
    # Log with keyword arguments - cleaner than format strings
    log.info(
        "Processing payment",
        payment_id=payment_id,  # Include payment ID for tracing
        amount=amount,  # Amount for analytics
        currency="USD"  # Currency for filtering
    )

    try:
        result = charge_card(payment_id, amount)  # External payment call
        # Log success with transaction details
        log.info(
            "Payment successful",
            payment_id=payment_id,
            transaction_id=result["transaction_id"]  # External reference
        )
        return result
    except PaymentError as e:
        # Log failure with error details for debugging
        log.error(
            "Payment failed",
            payment_id=payment_id,
            error_code=e.code,  # Payment provider error code
            error_message=str(e)  # Human-readable error
        )
        raise
```

### Integrating with python-json-logger

The python-json-logger library is a lightweight alternative that extends the standard library formatter. It provides JSON output while maintaining compatibility with existing logging configuration patterns.

```bash
pip install python-json-logger
```

```python
# json_logger_config.py
# Lightweight JSON logging using python-json-logger with trace correlation
import logging
from pythonjsonlogger import jsonlogger
from opentelemetry import trace
from datetime import datetime

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """JSON formatter with trace correlation - extends python-json-logger"""

    def __init__(self, *args, **kwargs):
        # Extract custom service_name before passing to parent
        self.service_name = kwargs.pop('service_name', 'app')
        super().__init__(*args, **kwargs)

    def add_fields(self, log_record, record, message_dict):
        """Override to add custom fields to every log record"""
        super().add_fields(log_record, record, message_dict)

        # Add ISO 8601 timestamp for consistent time formatting
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'

        # Add service name for multi-service environments
        log_record['service'] = self.service_name

        # Normalize log level to lowercase for consistency
        log_record['level'] = record.levelname.lower()

        # Inject OpenTelemetry trace context for correlation
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            log_record['trace_id'] = format(ctx.trace_id, '032x')  # 32-char hex
            log_record['span_id'] = format(ctx.span_id, '016x')  # 16-char hex

        # Add source location for debugging
        log_record['source'] = {
            'file': record.pathname,  # Full file path
            'line': record.lineno,  # Line number
            'function': record.funcName  # Function name
        }

def setup_json_logging(service_name: str = 'app', level: int = logging.INFO):
    """Configure JSON logging for the entire application"""

    # Create formatter with custom format string
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',  # Fields to include
        service_name=service_name
    )

    # Create handler for stdout (container-friendly)
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    # Configure root logger (affects all loggers in application)
    root_logger = logging.getLogger()
    root_logger.handlers = []  # Clear existing handlers
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    return root_logger

# Usage example
setup_json_logging('payment-service')  # Initialize once at startup
logger = logging.getLogger(__name__)

# Use 'extra' dict to add custom fields to log messages
logger.info("Payment processed", extra={
    'payment_id': 'pay_123',  # Custom field: payment identifier
    'amount': 99.99,  # Custom field: payment amount
    'currency': 'USD'  # Custom field: currency code
})
```

---

## Log Levels and When to Use Them

Understanding when to use each log level is crucial for effective debugging and monitoring. This example demonstrates the appropriate use cases for each level, from verbose debugging information to critical system failures.

```python
# logging_levels.py
# Demonstration of appropriate log level usage
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

This filter automatically redacts sensitive information before it reaches your log storage. It uses both field name matching and regex patterns to identify and mask sensitive data like passwords, API keys, and credit card numbers.

```python
# secure_logger.py
# Automatic sensitive data redaction for secure logging
import re
import logging
from typing import Any, Dict, List, Set

class SensitiveDataFilter(logging.Filter):
    """Filter to redact sensitive data from logs before they're written"""

    # Set of field names that should always be redacted
    SENSITIVE_FIELDS: Set[str] = {
        'password', 'secret', 'token', 'api_key', 'apikey',
        'authorization', 'auth', 'credential', 'private_key',
        'credit_card', 'card_number', 'cvv', 'ssn', 'social_security'
    }

    # Regex patterns for sensitive data that might appear in values
    PATTERNS = [
        # Email addresses - keep domain, mask local part
        (re.compile(r'([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)'), r'\1***@\2'),
        # Credit card numbers - keep first/last 4 digits
        (re.compile(r'\b(\d{4})\d{8,12}(\d{4})\b'), r'\1********\2'),
        # Stripe-style API keys - redact the key portion
        (re.compile(r'(sk_live_|pk_live_|sk_test_|pk_test_)\w+'), r'\1***REDACTED***'),
    ]

    def __init__(self, additional_fields: List[str] = None):
        super().__init__()
        # Allow extending the sensitive fields list
        if additional_fields:
            self.SENSITIVE_FIELDS.update(additional_fields)

    def filter(self, record: logging.LogRecord) -> bool:
        """Process log record and redact sensitive data"""
        # Scan all attributes on the log record
        if hasattr(record, '__dict__'):
            for key, value in list(record.__dict__.items()):
                if self._is_sensitive_key(key):
                    setattr(record, key, '[REDACTED]')  # Redact by field name
                elif isinstance(value, str):
                    setattr(record, key, self._redact_patterns(value))  # Apply regex
                elif isinstance(value, dict):
                    setattr(record, key, self._redact_dict(value))  # Recurse into dicts

        # Also redact patterns in the main log message
        if record.msg:
            record.msg = self._redact_patterns(str(record.msg))

        return True  # Always allow the log record through (after redaction)

    def _is_sensitive_key(self, key: str) -> bool:
        """Check if a field name indicates sensitive data"""
        key_lower = key.lower()
        return any(field in key_lower for field in self.SENSITIVE_FIELDS)

    def _redact_patterns(self, text: str) -> str:
        """Apply regex patterns to redact sensitive data in text"""
        for pattern, replacement in self.PATTERNS:
            text = pattern.sub(replacement, text)
        return text

    def _redact_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively redact sensitive data in dictionaries"""
        result = {}
        for key, value in data.items():
            if self._is_sensitive_key(key):
                result[key] = '[REDACTED]'  # Field name matches
            elif isinstance(value, str):
                result[key] = self._redact_patterns(value)  # Apply regex
            elif isinstance(value, dict):
                result[key] = self._redact_dict(value)  # Recurse
            else:
                result[key] = value  # Keep non-string values as-is
        return result


# Usage: Add filter to logger with optional custom fields
logger = logging.getLogger(__name__)
logger.addFilter(SensitiveDataFilter(['phone_number', 'address']))  # Add custom sensitive fields

# Demonstration of redaction in action
logger.info("User created", extra={
    'email': 'user@example.com',  # Will be partially redacted (user***@example.com)
    'password': 'secret123',       # Will show [REDACTED]
    'user_id': 'usr_123'           # Will remain unchanged (not sensitive)
})
```

---

## Performance Considerations

### Async Logging for High Throughput

For high-throughput applications, synchronous logging can become a bottleneck. This async handler uses a background thread and queue to decouple log emission from log processing, ensuring logging never blocks your main application.

```python
# async_logger.py
# Non-blocking async log handler for high-throughput applications
import asyncio
import logging
from queue import Queue
from threading import Thread
from typing import Any, Dict

class AsyncLogHandler(logging.Handler):
    """Non-blocking log handler that processes logs in a background thread"""

    def __init__(self, target_handler: logging.Handler):
        super().__init__()
        self.target = target_handler  # The actual handler that does the work
        self.queue: Queue = Queue()  # Thread-safe queue for log records
        self._running = True  # Control flag for worker thread

        # Start background worker thread (daemon=True for clean shutdown)
        self._thread = Thread(target=self._worker, daemon=True)
        self._thread.start()

    def emit(self, record: logging.LogRecord):
        """Queue log record for async processing - never blocks"""
        try:
            self.queue.put_nowait(record)  # Non-blocking put
        except:
            # Queue full - drop the log rather than block
            # In production, you might want to track dropped logs
            pass

    def _worker(self):
        """Background thread that processes queued log records"""
        while self._running or not self.queue.empty():
            try:
                # Get record with timeout to allow checking _running flag
                record = self.queue.get(timeout=0.1)
                self.target.emit(record)  # Forward to actual handler
            except:
                continue  # Timeout or other exception, loop again

    def close(self):
        """Graceful shutdown - flush remaining logs and stop worker"""
        self._running = False  # Signal worker to stop
        self._thread.join(timeout=5.0)  # Wait for worker to finish
        super().close()


# Usage: Wrap any handler with AsyncLogHandler for non-blocking logs
stream_handler = logging.StreamHandler()  # The target handler
async_handler = AsyncLogHandler(stream_handler)  # Async wrapper

logger = logging.getLogger()
logger.addHandler(async_handler)  # Now all logs are async
```

### Lazy Evaluation for Expensive Operations

When logging at DEBUG level includes expensive operations (like serializing large objects or making API calls), lazy evaluation ensures the cost is only paid when the log level is actually enabled. This prevents performance overhead in production where DEBUG is typically disabled.

```python
# lazy_logging.py
# Lazy string evaluation to avoid expensive operations when log level is disabled
import logging
from functools import cached_property

class LazyStr:
    """Wrapper that defers function execution until string conversion"""

    def __init__(self, func, *args, **kwargs):
        self._func = func  # Function to call
        self._args = args  # Positional arguments
        self._kwargs = kwargs  # Keyword arguments
        self._value = None  # Cached result

    def __str__(self):
        """Only executed when the string is actually needed"""
        if self._value is None:
            # Call the expensive function only now
            self._value = str(self._func(*self._args, **self._kwargs))
        return self._value  # Return cached value on subsequent calls

logger = logging.getLogger(__name__)

def get_expensive_debug_info():
    """Simulates an expensive operation - API call, serialization, etc."""
    import time
    time.sleep(1)  # Simulates expensive computation
    return {"detailed": "debug info"}

# The function is NOT called if DEBUG logging is disabled
# Only evaluated when logger.debug() actually formats the message
logger.debug(
    "Debug info: %s",
    LazyStr(get_expensive_debug_info)  # Deferred until needed
)
```

---

## Complete Example Application

This complete example brings together all the concepts covered in this guide: structured logging with structlog, OpenTelemetry trace correlation, Flask middleware for request context, and proper error handling. Use this as a template for building observable Python applications.

```python
# app.py
# Complete example: Flask app with structured logging and OpenTelemetry
import os
import logging
from flask import Flask, request, jsonify, g
from opentelemetry import trace
import structlog
import uuid
import time

# Configure structlog for JSON output with processors
from structlog_config import setup_structlog
setup_structlog('order-service')  # Initialize once at startup

# Initialize OpenTelemetry tracing
from telemetry import init_telemetry
tracer = init_telemetry('order-service')  # Get tracer for creating spans

# Get a structlog logger instance
log = structlog.get_logger()

app = Flask(__name__)

@app.before_request
def setup_request_context():
    """Set up per-request logging context - runs before every request"""
    # Generate or extract request ID for distributed tracing
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    g.start_time = time.time()  # Start timing for duration tracking

    # Reset and bind context vars for this request
    structlog.contextvars.clear_contextvars()  # Clear previous request context
    structlog.contextvars.bind_contextvars(
        request_id=g.request_id,  # Unique request identifier
        method=request.method,  # HTTP method
        path=request.path,  # URL path
        client_ip=request.remote_addr  # Client IP address
    )

    log.info("Request started")  # Log with bound context

@app.after_request
def log_response(response):
    """Log request completion with duration - runs after every request"""
    duration_ms = (time.time() - g.start_time) * 1000  # Calculate duration

    # Log completion with status and timing
    log.info(
        "Request completed",
        status_code=response.status_code,  # HTTP status
        duration_ms=round(duration_ms, 2)  # Response time
    )

    return response

@app.errorhandler(Exception)
def handle_error(error):
    """Global exception handler - logs all unhandled errors"""
    log.exception("Unhandled exception", error_type=type(error).__name__)
    return jsonify({"error": "Internal server error"}), 500

@app.route("/api/orders", methods=["POST"])
def create_order():
    # Create parent span for entire order creation flow
    with tracer.start_as_current_span("create_order") as span:
        order_data = request.json

        # Log order creation intent with business context
        log.info(
            "Creating order",
            customer_id=order_data.get("customer_id"),
            items_count=len(order_data.get("items", []))
        )

        # Nested span for validation step
        with tracer.start_as_current_span("validate_order"):
            try:
                validate_order(order_data)  # Validate input
            except ValueError as e:
                log.warning("Order validation failed", error=str(e))
                return jsonify({"error": str(e)}), 400

        # Nested span for processing step
        with tracer.start_as_current_span("process_order"):
            order = process_order(order_data)  # Create order
            span.set_attribute("order.id", order["id"])  # Add to span

        # Log successful creation with key details
        log.info(
            "Order created",
            order_id=order["id"],
            order_total=order["total"]
        )

        return jsonify(order), 201

@app.route("/api/orders/<order_id>")
def get_order(order_id: str):
    # Create span for this operation
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)  # Tag span with order ID

        log.debug("Fetching order", order_id=order_id)  # Debug level

        order = fetch_order(order_id)  # Database lookup

        if not order:
            log.warning("Order not found", order_id=order_id)  # Log missing
            return jsonify({"error": "Not found"}), 404

        log.info("Order retrieved", order_id=order_id, order_status=order["status"])

        return jsonify(order)

@app.route("/health")
def health():
    """Health check endpoint - no logging needed"""
    return jsonify({"status": "healthy"})

# Helper functions for order processing
def validate_order(data):
    """Validate order data - raises ValueError on invalid input"""
    if not data.get("items"):
        raise ValueError("Order must have items")
    if not data.get("customer_id"):
        raise ValueError("Customer ID required")

def process_order(data):
    """Process order and return order object"""
    return {
        "id": f"ord_{uuid.uuid4().hex[:8]}",  # Generate unique ID
        "customer_id": data["customer_id"],
        "items": data["items"],
        "total": sum(item.get("price", 0) * item.get("quantity", 1) for item in data["items"]),
        "status": "pending"  # Initial status
    }

def fetch_order(order_id):
    """Fetch order from database (simulated)"""
    return {
        "id": order_id,
        "customer_id": "cust_123",
        "items": [],
        "total": 99.99,
        "status": "completed"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)  # Start Flask development server
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
