# How to Add Structured Logging to FastAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, Logging, Observability, JSON Logging

Description: Learn how to implement structured logging in FastAPI using structlog or python-json-logger for better observability and log aggregation.

---

If you've ever tried to debug a production issue by grepping through megabytes of plain text logs, you know the pain. Traditional logging gives you lines like `INFO: User logged in` - which tells you almost nothing when you're trying to figure out why that specific user on that specific server had a problem.

Structured logging solves this by outputting logs as JSON objects with consistent fields. Instead of guessing what happened, you get machine-parseable data that log aggregators like Elasticsearch, Datadog, or Loki can actually query.

## Why Structured Logging Matters

Here's the difference between traditional and structured logs:

```
# Traditional log
2026-02-02 10:15:23 INFO User logged in

# Structured log
{"timestamp": "2026-02-02T10:15:23Z", "level": "info", "event": "user_logged_in", "user_id": 42, "ip": "192.168.1.1", "request_id": "abc-123"}
```

With structured logs, you can filter by user_id, correlate requests using request_id, and aggregate metrics across your entire fleet. That's the foundation of good observability.

## Setting Up structlog with FastAPI

structlog is the go-to library for structured logging in Python. It's flexible, fast, and plays well with async code.

First, install the dependencies:

```bash
pip install structlog fastapi uvicorn
```

Now let's configure structlog to output JSON in production and pretty-printed logs during development:

```python
# logging_config.py
import structlog
import logging
import sys

def configure_logging(json_logs: bool = True, log_level: str = "INFO"):
    """
    Configure structlog for FastAPI.

    Args:
        json_logs: If True, output JSON. If False, output colored console logs.
        log_level: The minimum log level to output.
    """

    # Shared processors that run for every log entry
    shared_processors = [
        # Add log level to the event dict
        structlog.stdlib.add_log_level,
        # Add timestamp in ISO format
        structlog.processors.TimeStamper(fmt="iso"),
        # If the log call includes exc_info, render the exception
        structlog.processors.format_exc_info,
    ]

    if json_logs:
        # Production: output JSON logs
        renderer = structlog.processors.JSONRenderer()
    else:
        # Development: pretty colored output
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=shared_processors + [
            # Prepare event dict for the final renderer
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure the standard library logging to use structlog
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processor=renderer,
            foreign_pre_chain=shared_processors,
        )
    )

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(log_level)
```

## Log Levels Reference

Here's a quick reference for when to use each log level:

| Level | When to Use | Example |
|-------|-------------|---------|
| DEBUG | Detailed info for debugging | Variable values, function entry/exit |
| INFO | General operational events | User logged in, job started |
| WARNING | Something unexpected but handled | Retry attempt, deprecated API used |
| ERROR | Something failed but app continues | Failed to send email, API timeout |
| CRITICAL | App is about to crash | Database connection lost, out of memory |

## Adding Request Context with Middleware

The real power of structured logging comes from adding context to every log entry. Let's create middleware that adds a correlation ID to track requests across your system:

```python
# middleware.py
import uuid
import time
from contextvars import ContextVar
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

# Context variable to store request-specific data
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

def get_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_var.get()

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that adds request context to all logs."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate a unique ID for this request
        # Check if one was passed in headers (for distributed tracing)
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store in context variable so loggers can access it
        request_id_var.set(request_id)

        # Create a logger bound with request context
        logger = structlog.get_logger().bind(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else None,
        )

        start_time = time.perf_counter()

        # Log the incoming request
        logger.info("request_started")

        try:
            response = await call_next(request)

            # Calculate request duration
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Log the completed request with response info
            logger.info(
                "request_completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )

            # Add request ID to response headers for client-side correlation
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.exception(
                "request_failed",
                duration_ms=round(duration_ms, 2),
                error=str(e),
            )
            raise
```

## Putting It All Together

Here's a complete FastAPI application with structured logging:

```python
# main.py
from fastapi import FastAPI, HTTPException
import structlog
from logging_config import configure_logging
from middleware import LoggingMiddleware, get_request_id

# Configure logging before creating the app
# Set json_logs=False for development to get readable output
configure_logging(json_logs=True, log_level="INFO")

app = FastAPI(title="Structured Logging Demo")

# Add the logging middleware
app.add_middleware(LoggingMiddleware)

# Get a logger instance
logger = structlog.get_logger()

@app.get("/")
async def root():
    # The request context is automatically available
    logger.info("processing_root_request", extra_data="some value")
    return {"message": "Hello World", "request_id": get_request_id()}

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    # Bind additional context for this specific operation
    log = logger.bind(user_id=user_id)

    log.info("fetching_user")

    # Simulate some business logic
    if user_id == 0:
        log.warning("invalid_user_id_requested")
        raise HTTPException(status_code=404, detail="User not found")

    log.info("user_fetched_successfully")
    return {"user_id": user_id, "name": f"User {user_id}"}

@app.get("/error")
async def trigger_error():
    logger.error("intentional_error_triggered", reason="testing")
    raise HTTPException(status_code=500, detail="Something went wrong")
```

## Alternative: Using python-json-logger

If you prefer a lighter setup, python-json-logger works with Python's built-in logging:

```python
# json_logging_simple.py
import logging
from pythonjsonlogger import jsonlogger

def setup_json_logging():
    """Simple JSON logging setup using python-json-logger."""

    # Create a handler that outputs to stdout
    handler = logging.StreamHandler()

    # Configure JSON format with custom fields
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
        datefmt="%Y-%m-%dT%H:%M:%SZ"
    )

    handler.setFormatter(formatter)

    # Apply to root logger
    logging.root.handlers = [handler]
    logging.root.setLevel(logging.INFO)

# Usage
setup_json_logging()
logger = logging.getLogger(__name__)
logger.info("User action", extra={"user_id": 42, "action": "login"})
```

## Integrating with Log Aggregators

Once your logs are structured, sending them to aggregators is straightforward. Most tools can ingest JSON logs directly from stdout.

For Docker deployments, the default JSON logging driver captures stdout and you can ship logs using Fluentd, Filebeat, or the provider's agent.

For Kubernetes, the standard pattern is logging to stdout and using a DaemonSet (like Fluentd or Promtail) to collect and forward logs.

Here's an example Fluentd configuration snippet:

```yaml
# fluent.conf snippet for FastAPI JSON logs
<source>
  @type tail
  path /var/log/containers/*fastapi*.log
  pos_file /var/log/fastapi.log.pos
  tag fastapi
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S%z
  </parse>
</source>
```

## Best Practices

1. **Always include a correlation ID** - This lets you trace requests across multiple services
2. **Log at the right level** - Don't spam INFO with debug data
3. **Keep events machine-parseable** - Use snake_case event names like `user_created`, not sentences
4. **Include relevant context** - User IDs, resource IDs, and timing information are invaluable
5. **Don't log sensitive data** - Passwords, tokens, and PII should never appear in logs

Structured logging takes a bit more setup than print statements, but when you're tracking down a bug at 2 AM, you'll be glad every log entry has the context you need.
