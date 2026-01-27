# How to Configure FastAPI Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FastAPI, Python, Logging, Observability, Structured Logging, Uvicorn, OpenTelemetry

Description: Learn how to configure logging in FastAPI applications including structured logging, request logging middleware, and integration with observability tools.

---

> Effective logging is the foundation of observability. In FastAPI applications, proper logging configuration helps you debug issues, track request flows, and maintain visibility into your application's behavior in production.

FastAPI runs on top of Uvicorn (or other ASGI servers), which means logging configuration involves both Python's standard logging module and the ASGI server's access logs. This guide covers everything from basic setup to production-ready structured logging with OpenTelemetry integration.

---

## Python Logging Basics for FastAPI

Python's built-in `logging` module is the foundation for all logging in FastAPI. Understanding it is essential before diving into more advanced configurations.

### Basic Logging Setup

```python
# main.py
import logging
from fastapi import FastAPI

# Configure the root logger with a basic format
# Level DEBUG captures all messages; adjust for production
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Create a logger specific to this module
# Using __name__ creates a hierarchy matching your package structure
logger = logging.getLogger(__name__)

app = FastAPI()

@app.get("/")
async def root():
    # Different log levels for different purposes
    logger.debug("Debug info - verbose details for troubleshooting")
    logger.info("Processing request to root endpoint")
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    logger.info(f"Fetching item with id={item_id}")

    if item_id < 0:
        logger.warning(f"Invalid item_id requested: {item_id}")
        return {"error": "Invalid item ID"}

    return {"item_id": item_id}
```

### Logger Hierarchy

```python
# Understanding logger hierarchy helps with filtering
import logging

# Root logger - catches everything
root_logger = logging.getLogger()

# Application logger - for your code
app_logger = logging.getLogger("myapp")

# Module-specific loggers - more granular control
api_logger = logging.getLogger("myapp.api")
db_logger = logging.getLogger("myapp.database")

# Set different levels for different parts of your application
# This reduces noise while keeping important logs
app_logger.setLevel(logging.INFO)
db_logger.setLevel(logging.WARNING)  # Only warnings and errors from DB layer
```

---

## Configuring Uvicorn Access Logs

Uvicorn provides its own access logging for HTTP requests. Understanding how to configure it gives you control over request-level visibility.

### Uvicorn Logging Configuration

```python
# logging_config.py
import logging

# Uvicorn's default loggers
# "uvicorn" - main uvicorn logger
# "uvicorn.error" - error messages and startup info
# "uvicorn.access" - HTTP access logs

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        # Detailed format for error logs
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        # Compact format for access logs
        "access": {
            "format": '%(asctime)s - %(client_addr)s - "%(request_line)s" %(status_code)s',
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
        "access": {
            "formatter": "access",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["default"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.error": {
            "level": "INFO",
        },
        "uvicorn.access": {
            "handlers": ["access"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
```

### Running Uvicorn with Custom Logging

```bash
# Using the config file
uvicorn main:app --log-config logging_config.yaml

# Or programmatically in Python
python -c "
import uvicorn
from logging_config import LOGGING_CONFIG

uvicorn.run(
    'main:app',
    host='0.0.0.0',
    port=8000,
    log_config=LOGGING_CONFIG
)
"
```

### Disabling Uvicorn Access Logs

Sometimes you want to handle access logging yourself via middleware:

```python
# main.py
import uvicorn

if __name__ == "__main__":
    # Disable default access logs when using custom middleware
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        access_log=False  # Disable default access logging
    )
```

---

## Custom Logging Middleware for Requests

Creating custom middleware gives you full control over what gets logged for each request.

### Basic Request Logging Middleware

```python
# middleware.py
import logging
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("myapp.requests")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs details about each request and response."""

    async def dispatch(self, request: Request, call_next):
        # Capture start time for duration calculation
        start_time = time.perf_counter()

        # Extract request details before processing
        method = request.method
        path = request.url.path
        query = str(request.query_params) if request.query_params else ""
        client_ip = request.client.host if request.client else "unknown"

        # Log incoming request
        logger.info(
            f"Request started: {method} {path}",
            extra={
                "method": method,
                "path": path,
                "query": query,
                "client_ip": client_ip,
            }
        )

        # Process the request
        response = await call_next(request)

        # Calculate request duration in milliseconds
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log completed request with response details
        logger.info(
            f"Request completed: {method} {path} - {response.status_code} ({duration_ms:.2f}ms)",
            extra={
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_ip,
            }
        )

        return response
```

### Adding the Middleware to FastAPI

```python
# main.py
from fastapi import FastAPI
from middleware import RequestLoggingMiddleware

app = FastAPI()

# Add middleware - order matters, first added is outermost
app.add_middleware(RequestLoggingMiddleware)

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

### Middleware with Exception Handling

```python
# middleware.py
import logging
import time
import traceback
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("myapp.requests")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware with comprehensive error logging."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Log level based on status code
            if response.status_code >= 500:
                logger.error(
                    f"Server error: {method} {path} - {response.status_code}"
                )
            elif response.status_code >= 400:
                logger.warning(
                    f"Client error: {method} {path} - {response.status_code}"
                )
            else:
                logger.info(
                    f"Success: {method} {path} - {response.status_code} ({duration_ms:.2f}ms)"
                )

            return response

        except Exception as e:
            # Log unhandled exceptions with full traceback
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.exception(
                f"Unhandled exception: {method} {path} - {type(e).__name__}: {str(e)}",
                extra={
                    "method": method,
                    "path": path,
                    "duration_ms": round(duration_ms, 2),
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "traceback": traceback.format_exc(),
                }
            )

            # Return a generic error response
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
```

---

## Structured JSON Logging

Structured logging outputs logs as JSON, making them easier to parse, search, and analyze in log management systems.

### Using python-json-logger

```bash
pip install python-json-logger
```

```python
# logging_config.py
import logging
from pythonjsonlogger import jsonlogger

def setup_json_logging():
    """Configure structured JSON logging for the application."""

    # Create a custom formatter that includes extra fields
    class CustomJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)

            # Add standard fields to every log entry
            log_record["timestamp"] = record.created
            log_record["level"] = record.levelname
            log_record["logger"] = record.name

            # Add location info for debugging
            log_record["module"] = record.module
            log_record["function"] = record.funcName
            log_record["line"] = record.lineno

    # Configure the formatter with desired fields
    formatter = CustomJsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s"
    )

    # Set up handler with JSON formatter
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers = []  # Clear existing handlers
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    return root_logger
```

### Using the JSON Logger

```python
# main.py
from fastapi import FastAPI
from logging_config import setup_json_logging

# Initialize JSON logging before creating the app
logger = setup_json_logging()

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    # Extra fields are included in the JSON output
    logger.info(
        "Fetching user",
        extra={
            "user_id": user_id,
            "action": "user_fetch",
            "service": "user-api"
        }
    )
    return {"user_id": user_id, "name": "John Doe"}
```

Output:
```json
{
  "timestamp": 1706371200.123,
  "level": "INFO",
  "logger": "__main__",
  "message": "Fetching user",
  "user_id": 123,
  "action": "user_fetch",
  "service": "user-api",
  "module": "main",
  "function": "get_user",
  "line": 15
}
```

---

## Adding Request IDs and Correlation

Request IDs enable tracing a single request across multiple log entries and services.

### Request ID Middleware with Context Variables

```python
# context.py
import contextvars
import uuid

# Context variable for request ID - thread-safe and async-safe
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)

def get_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_ctx.get()

def set_request_id(request_id: str) -> None:
    """Set the request ID in context."""
    request_id_ctx.set(request_id)

def generate_request_id() -> str:
    """Generate a new unique request ID."""
    return str(uuid.uuid4())
```

```python
# middleware.py
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from context import get_request_id, set_request_id, generate_request_id

logger = logging.getLogger("myapp")

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware that assigns and propagates request IDs."""

    async def dispatch(self, request: Request, call_next):
        # Check for incoming request ID header (for distributed tracing)
        request_id = request.headers.get("X-Request-ID")

        # Generate new ID if not provided
        if not request_id:
            request_id = generate_request_id()

        # Store in context for access throughout request lifecycle
        set_request_id(request_id)

        # Process request
        response = await call_next(request)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response
```

### Custom Log Filter for Request ID

```python
# logging_config.py
import logging
from context import get_request_id

class RequestIDFilter(logging.Filter):
    """Filter that adds request_id to all log records."""

    def filter(self, record):
        # Add request_id attribute to every log record
        record.request_id = get_request_id() or "no-request-id"
        return True

def setup_logging_with_request_id():
    """Configure logging with automatic request ID injection."""

    # Create formatter that includes request_id
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - "
        "[%(request_id)s] - %(message)s"
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(RequestIDFilter())

    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
```

### Complete Example with Request ID

```python
# main.py
import logging
from fastapi import FastAPI, Depends, Request
from middleware import RequestIDMiddleware
from logging_config import setup_logging_with_request_id
from context import get_request_id

# Initialize logging
setup_logging_with_request_id()
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(RequestIDMiddleware)

# Dependency to get request ID in route handlers
async def get_current_request_id(request: Request) -> str:
    return get_request_id()

@app.get("/orders/{order_id}")
async def get_order(
    order_id: int,
    request_id: str = Depends(get_current_request_id)
):
    # Request ID is automatically included in logs via filter
    logger.info(f"Fetching order {order_id}")

    # Simulate calling another service
    logger.info(f"Querying database for order {order_id}")

    return {
        "order_id": order_id,
        "request_id": request_id,
        "status": "completed"
    }
```

---

## Log Levels and Filtering

Proper log level usage helps you control verbosity and quickly identify issues.

### Log Level Guidelines

```python
import logging

logger = logging.getLogger(__name__)

def demonstrate_log_levels():
    # DEBUG - Detailed information for diagnosing problems
    # Use for: Variable values, function entry/exit, loop iterations
    logger.debug("Processing item 5 of 100")
    logger.debug(f"Cache lookup for key: user_123")

    # INFO - General operational messages
    # Use for: Request handling, task completion, configuration loading
    logger.info("Application started on port 8000")
    logger.info("User registration completed successfully")

    # WARNING - Something unexpected but not an error
    # Use for: Deprecated features, retry attempts, approaching limits
    logger.warning("API rate limit at 80% capacity")
    logger.warning("Using default value for missing config")

    # ERROR - Something failed but application continues
    # Use for: Failed operations, caught exceptions, invalid data
    logger.error("Failed to send email notification")
    logger.error(f"Database query failed: {error}")

    # CRITICAL - Application may not be able to continue
    # Use for: System failures, data corruption, security issues
    logger.critical("Database connection pool exhausted")
    logger.critical("Unable to read configuration file")
```

### Environment-Based Log Levels

```python
# config.py
import os
import logging

def get_log_level() -> int:
    """Get log level from environment with sensible defaults."""

    env = os.getenv("ENVIRONMENT", "development")
    level_name = os.getenv("LOG_LEVEL", "").upper()

    # Explicit LOG_LEVEL takes precedence
    if level_name:
        return getattr(logging, level_name, logging.INFO)

    # Default levels based on environment
    env_defaults = {
        "development": logging.DEBUG,
        "staging": logging.INFO,
        "production": logging.WARNING,
    }

    return env_defaults.get(env, logging.INFO)

def configure_logging():
    """Configure logging based on environment."""

    level = get_log_level()

    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
```

### Filtering Logs by Logger Name

```python
# logging_config.py
import logging

def setup_filtered_logging():
    """Configure logging with different levels for different components."""

    # Configure specific loggers with their own levels
    logger_configs = {
        "myapp": logging.DEBUG,           # Your application - verbose
        "myapp.database": logging.INFO,   # Database operations
        "myapp.api": logging.DEBUG,       # API handlers
        "uvicorn": logging.INFO,          # Web server
        "sqlalchemy": logging.WARNING,    # ORM - only warnings
        "httpx": logging.WARNING,         # HTTP client
    }

    for logger_name, level in logger_configs.items():
        logging.getLogger(logger_name).setLevel(level)
```

---

## Using structlog for Better Logging

structlog provides a more Pythonic API for structured logging with powerful features like processors and context binding.

### Installation and Setup

```bash
pip install structlog
```

```python
# logging_config.py
import logging
import structlog
from structlog.stdlib import LoggerFactory

def setup_structlog():
    """Configure structlog with processors for structured output."""

    # Configure structlog processors
    # Processors transform log entries in order
    structlog.configure(
        processors=[
            # Add log level to event dict
            structlog.stdlib.add_log_level,
            # Add logger name
            structlog.stdlib.add_logger_name,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso"),
            # Add stack info for exceptions
            structlog.processors.StackInfoRenderer(),
            # Format exceptions nicely
            structlog.processors.format_exc_info,
            # Render as JSON for production
            structlog.processors.JSONRenderer()
        ],
        # Use stdlib logger factory for compatibility
        logger_factory=LoggerFactory(),
        # Cache loggers for performance
        cache_logger_on_first_use=True,
    )

    # Also configure stdlib logging for third-party libraries
    logging.basicConfig(
        format="%(message)s",
        level=logging.INFO,
    )
```

### Using structlog in FastAPI

```python
# main.py
import structlog
from fastapi import FastAPI, Request
from logging_config import setup_structlog

# Initialize structlog
setup_structlog()

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int, request: Request):
    # Get a bound logger with context
    logger = structlog.get_logger()

    # Bind context that will appear in all subsequent logs
    logger = logger.bind(
        user_id=user_id,
        client_ip=request.client.host,
        endpoint="/users/{user_id}"
    )

    logger.info("fetching_user")

    # Simulate database lookup
    user = {"id": user_id, "name": "John Doe"}

    logger.info("user_found", user_name=user["name"])

    return user
```

### Context-Bound Logging with structlog

```python
# services.py
import structlog

logger = structlog.get_logger()

class OrderService:
    def __init__(self):
        # Create a logger bound to this service
        self.logger = logger.bind(service="order_service")

    async def create_order(self, user_id: int, items: list):
        # Bind order-specific context
        log = self.logger.bind(
            user_id=user_id,
            item_count=len(items),
            operation="create_order"
        )

        log.info("order_creation_started")

        try:
            # Validate items
            log.debug("validating_items")
            total = self._calculate_total(items)

            # Create order
            order_id = await self._save_order(user_id, items, total)

            log.info(
                "order_created",
                order_id=order_id,
                total=total
            )

            return {"order_id": order_id, "total": total}

        except ValueError as e:
            log.warning("order_validation_failed", error=str(e))
            raise
        except Exception as e:
            log.exception("order_creation_failed")
            raise
```

---

## Logging with OpenTelemetry Integration

OpenTelemetry provides a unified approach to logging, tracing, and metrics. Integrating logs with traces enables powerful correlation.

### Installation

```bash
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp \
            opentelemetry-instrumentation-fastapi \
            opentelemetry-instrumentation-logging
```

### Complete OpenTelemetry Logging Setup

```python
# otel_config.py
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.logging import LoggingInstrumentor

def setup_opentelemetry(service_name: str, otlp_endpoint: str):
    """Configure OpenTelemetry with logging integration."""

    # Create resource identifying this service
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
    })

    # Set up tracing
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Instrument logging to include trace context
    # This adds trace_id and span_id to all log records
    LoggingInstrumentor().instrument(set_logging_format=True)

    return trace.get_tracer(service_name)
```

### FastAPI with OpenTelemetry Logging

```python
# main.py
import logging
import os
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from otel_config import setup_opentelemetry

# Configure OpenTelemetry
SERVICE_NAME = os.getenv("SERVICE_NAME", "fastapi-app")
OTLP_ENDPOINT = os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp")

tracer = setup_opentelemetry(SERVICE_NAME, OTLP_ENDPOINT)
logger = logging.getLogger(__name__)

app = FastAPI()

# Instrument FastAPI for automatic tracing
FastAPIInstrumentor.instrument_app(app)

@app.get("/orders/{order_id}")
async def get_order(order_id: int):
    # Logs automatically include trace_id and span_id
    logger.info(f"Fetching order {order_id}")

    # Create a custom span for database operation
    with tracer.start_as_current_span("database.query") as span:
        span.set_attribute("db.operation", "SELECT")
        span.set_attribute("order.id", order_id)

        # Log within span context
        logger.info("Querying database for order")

        # Simulate database query
        order = {"id": order_id, "status": "completed"}

    logger.info(f"Order {order_id} retrieved successfully")

    return order
```

### Correlated JSON Logs with Trace Context

```python
# logging_config.py
import logging
from pythonjsonlogger import jsonlogger
from opentelemetry import trace

class OTelJsonFormatter(jsonlogger.JsonFormatter):
    """JSON formatter that includes OpenTelemetry trace context."""

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Add basic fields
        log_record["timestamp"] = record.created
        log_record["level"] = record.levelname
        log_record["logger"] = record.name

        # Add trace context if available
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            log_record["trace_id"] = format(ctx.trace_id, "032x")
            log_record["span_id"] = format(ctx.span_id, "016x")
        else:
            log_record["trace_id"] = None
            log_record["span_id"] = None

def setup_otel_json_logging():
    """Configure JSON logging with OpenTelemetry context."""

    formatter = OTelJsonFormatter()
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = []
    root.addHandler(handler)
    root.setLevel(logging.INFO)
```

---

## Async Logging Considerations

FastAPI is async-first, and logging in async contexts requires attention to avoid blocking the event loop.

### The Problem with Synchronous Logging

```python
# Synchronous file logging can block the event loop
import logging

# This handler writes to disk synchronously - BAD for async
file_handler = logging.FileHandler("app.log")  # Blocking I/O!
```

### Using QueueHandler for Non-Blocking Logging

```python
# async_logging.py
import logging
from logging.handlers import QueueHandler, QueueListener
import queue

def setup_async_logging():
    """Configure non-blocking logging using a queue."""

    # Create a queue to buffer log records
    log_queue = queue.Queue(-1)  # No limit on size

    # QueueHandler sends records to the queue instead of processing them
    queue_handler = QueueHandler(log_queue)

    # Actual handlers that process records in a separate thread
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )

    file_handler = logging.FileHandler("app.log")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )

    # QueueListener processes records from the queue in a background thread
    listener = QueueListener(
        log_queue,
        console_handler,
        file_handler,
        respect_handler_level=True
    )

    # Configure root logger with queue handler
    root = logging.getLogger()
    root.handlers = []
    root.addHandler(queue_handler)
    root.setLevel(logging.DEBUG)

    # Start the listener thread
    listener.start()

    return listener  # Return listener to stop it on shutdown
```

### Using with FastAPI Lifecycle

```python
# main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from async_logging import setup_async_logging

listener = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: configure async logging
    global listener
    listener = setup_async_logging()
    logging.info("Application starting with async logging")

    yield

    # Shutdown: stop the queue listener
    logging.info("Application shutting down")
    if listener:
        listener.stop()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def root():
    logger = logging.getLogger(__name__)
    # This log call returns immediately without blocking
    logger.info("Handling request - non-blocking!")
    return {"message": "Hello"}
```

### Async-Safe structlog Configuration

```python
# structlog_async.py
import structlog
import logging
from logging.handlers import QueueHandler, QueueListener
import queue

def setup_async_structlog():
    """Configure structlog with async-safe output."""

    # Set up queue-based logging
    log_queue = queue.Queue(-1)

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))

    listener = QueueListener(log_queue, handler)
    listener.start()

    queue_handler = QueueHandler(log_queue)

    logging.root.handlers = []
    logging.root.addHandler(queue_handler)
    logging.root.setLevel(logging.INFO)

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    return listener
```

---

## Best Practices Summary

### Configuration Best Practices

1. **Use environment variables for configuration** - Never hardcode log levels or endpoints
2. **Configure logging at startup** - Before creating the FastAPI app
3. **Use JSON format in production** - Easier to parse and search
4. **Separate access logs from application logs** - Different purposes, different handling

### Logging Content Best Practices

1. **Include request IDs** - Essential for tracing requests across logs
2. **Log at appropriate levels** - DEBUG for development, WARNING+ for production
3. **Avoid logging sensitive data** - No passwords, tokens, or PII
4. **Include context** - user_id, order_id, operation names

### Performance Best Practices

1. **Use async-safe handlers** - QueueHandler for file logging
2. **Batch exports** - Use BatchSpanProcessor for OpenTelemetry
3. **Set appropriate log levels** - Reduce volume in production
4. **Sample in high-traffic scenarios** - Not every request needs full logging

### Code Example: Production-Ready Configuration

```python
# production_logging.py
import os
import logging
from logging.handlers import QueueHandler, QueueListener
import queue
from pythonjsonlogger import jsonlogger

def setup_production_logging():
    """Production-ready logging configuration."""

    # Environment-based configuration
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    service_name = os.getenv("SERVICE_NAME", "fastapi-app")

    # JSON formatter with service context
    class ServiceJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)
            log_record["service"] = service_name
            log_record["level"] = record.levelname
            log_record["timestamp"] = record.created

    # Async-safe queue setup
    log_queue = queue.Queue(-1)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ServiceJsonFormatter())

    listener = QueueListener(log_queue, console_handler)
    listener.start()

    # Configure root logger
    queue_handler = QueueHandler(log_queue)
    root = logging.getLogger()
    root.handlers = []
    root.addHandler(queue_handler)
    root.setLevel(getattr(logging, log_level))

    # Reduce noise from libraries
    for noisy_logger in ["httpx", "httpcore", "uvicorn.access"]:
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)

    return listener
```

---

## Conclusion

Proper logging configuration is essential for maintaining visibility into your FastAPI applications. Start with Python's standard logging for simplicity, add structured JSON output for production, and integrate with OpenTelemetry for full observability.

Key takeaways:
- Configure both Uvicorn and application logging
- Use middleware for consistent request logging
- Add request IDs for correlation
- Use JSON format and structured logging in production
- Consider async implications for high-performance apps
- Integrate with OpenTelemetry for unified observability

---

*Need comprehensive observability for your FastAPI applications? [OneUptime](https://oneuptime.com) provides unified logging, tracing, and metrics with native OpenTelemetry support. Correlate logs with traces and set up alerts - all in one platform. Get started with our free tier today.*
