# How to Send Structured Logs from a Python App to Cloud Logging Using the

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Python, Observability, Monitoring

Description: Learn how to send structured JSON logs from Python applications to Google Cloud Logging using the google-cloud-logging client library for better searchability and analysis.

---

Logging is one of those things that seems simple until you are trying to debug a production issue at 2 AM. Plain text logs are fine for local development, but in production, structured logs make a world of difference. Instead of parsing log strings with regex, you can filter and query structured JSON fields directly in Cloud Logging. The `google-cloud-logging` library for Python makes it easy to send properly structured logs from your application.

## Why Structured Logging Matters

When you log a plain string like "User login failed for user-123", finding it later requires text search. When you log a structured JSON object with fields like `user_id`, `action`, and `result`, you can filter logs in Cloud Logging with precise queries like `jsonPayload.user_id="user-123" AND jsonPayload.action="login"`. That precision saves significant time during incident response.

## Installation

Install the Cloud Logging client library.

```bash
# Install the Cloud Logging Python client

pip install google-cloud-logging
```

## Basic Setup with Python's Standard Logging

The simplest approach is to integrate Cloud Logging with Python's built-in logging module. This way, your existing log statements at the configured level automatically go to Cloud Logging.

```python
import google.cloud.logging
import logging

# Create the Cloud Logging client
client = google.cloud.logging.Client()

# This attaches a Cloud Logging handler to Python's standard logging
# Existing logging.info(), logging.error(), etc. calls at INFO level and higher
# will now go to Cloud Logging
client.setup_logging()

# Use Python's standard logging as usual
logging.info("Application started")
logging.warning("Configuration file not found, using defaults")
logging.error("Failed to connect to database")
```

The `setup_logging()` call installs a Cloud Logging handler on the root logger. From that point on, log calls in your application and child loggers are sent to Cloud Logging when they meet the configured log level.

## Sending Structured Log Entries

To send structured data instead of plain text, pass a dictionary in the `json_fields` extra argument. Cloud Logging will store it as a JSON payload.

```python
import google.cloud.logging
import logging

client = google.cloud.logging.Client()
client.setup_logging()

logger = logging.getLogger("my-app")

# Log a structured payload with json_fields
# This becomes a JSON object in Cloud Logging's jsonPayload field
logger.info(
    "User login completed",
    extra={"json_fields": {
        "action": "user_login",
        "user_id": "user-123",
        "ip_address": "192.168.1.100",
        "method": "oauth2",
        "success": True,
        "response_time_ms": 245,
    }},
)

# Log an error with structured context
logger.error(
    "Payment processing failed",
    extra={"json_fields": {
        "action": "payment_processing",
        "order_id": "ORD-456",
        "error": "insufficient_funds",
        "amount": 99.99,
        "currency": "USD",
        "retry_count": 3,
    }},
)
```

## Using the Cloud Logging Client Directly

For more control over log entries, you can use the Cloud Logging client directly instead of the standard logging integration.

```python
from google.cloud import logging as cloud_logging

client = cloud_logging.Client()

# Get a logger for a specific resource or log name
logger = client.logger("my-application-logs")

# Write a structured log entry with severity and labels
logger.log_struct(
    {
        "event": "order_completed",
        "order_id": "ORD-789",
        "total": 159.99,
        "items_count": 3,
        "payment_method": "credit_card",
    },
    severity="INFO",
    labels={
        "environment": "production",
        "service": "order-service",
        "version": "2.1.0",
    },
)

# Write a warning
logger.log_struct(
    {
        "event": "rate_limit_approaching",
        "current_rate": 950,
        "limit": 1000,
        "window": "1m",
    },
    severity="WARNING",
)

# Write an error with a trace context for correlation
logger.log_struct(
    {
        "event": "database_timeout",
        "query": "SELECT * FROM users WHERE...",
        "timeout_ms": 30000,
        "database": "user-db",
    },
    severity="ERROR",
    trace="projects/my-project/traces/abc123def456",
)
```

## Structured Logging with Custom Formatters

If you want to keep using Python's logging module but need more control over the JSON structure, create a custom formatter.

```python
import logging
import json
import datetime
import google.cloud.logging

class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON for Cloud Logging."""

    def format(self, record):
        # Build the base log structure
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        # Include any extra fields passed to the logger
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)

        # Include exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)

# Set up the handler with our custom formatter
handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter())

logger = logging.getLogger("structured-app")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# When running on Cloud Run or GKE, stdout and stderr logs are automatically
# picked up by Google Cloud's integrated logging
logger.info("Processing request", extra={"extra_fields": {
    "request_id": "req-abc-123",
    "method": "POST",
    "path": "/api/orders",
}})
```

## Logging in Cloud Run

When your application runs on Cloud Run, there is a simpler approach. Cloud Run automatically captures anything written to stdout/stderr and sends it to Cloud Logging. If the output is valid JSON, Cloud Logging parses it as structured logs.

```python
import json
import sys

def log_structured(severity, message, **kwargs):
    """Write a structured JSON log entry to stdout for Cloud Run."""
    entry = {
        "severity": severity,
        "message": message,
        **kwargs,
    }
    # Cloud Run's integrated logging picks up JSON from stdout
    print(json.dumps(entry), file=sys.stdout, flush=True)

# Usage in your application
log_structured("INFO", "Request received",
    request_id="req-123",
    path="/api/users",
    method="GET",
)

log_structured("ERROR", "Database connection failed",
    database="users-db",
    error_code="ETIMEDOUT",
    retry_in_seconds=5,
)
```

This approach works because Cloud Run's integrated logging recognizes JSON output and maps the `severity` field to Cloud Logging's severity levels.

## Correlating Logs with Traces

When you have a request that touches multiple services, you want to see all related logs together. Cloud Logging supports trace correlation.

```python
import google.cloud.logging
import logging

client = google.cloud.logging.Client()
client.setup_logging()

logger = logging.getLogger("traced-app")

def handle_request(request):
    """Process a request with trace correlation."""
    # Extract the trace header from the incoming request
    trace_header = request.headers.get("X-Cloud-Trace-Context", "")
    trace_id = trace_header.split("/")[0] if trace_header else None

    # Build the full trace resource name
    trace = f"projects/{client.project}/traces/{trace_id}" if trace_id else None

    # All logs with the same trace ID will be grouped together in Cloud Logging
    logger.info(
        "Request started",
        extra={"json_fields": {
            "action": "request_start",
            "path": request.path,
            "method": request.method,
        }, "trace": trace},
    )

    # ... process the request ...

    logger.info(
        "Request completed",
        extra={"json_fields": {
            "action": "request_complete",
            "status": 200,
            "response_time_ms": 150,
        }, "trace": trace},
    )
```

## Querying Structured Logs

Once your logs are in Cloud Logging, you can query them using the Logs Explorer or the API.

```python
from google.cloud import logging as cloud_logging

client = cloud_logging.Client()

# Query for specific structured log fields
# This filter finds failed login attempts since the specified timestamp
filter_str = (
    'jsonPayload.action="user_login" '
    'AND jsonPayload.success=false '
    'AND severity="WARNING" '
    'AND timestamp >= "2024-01-15T10:00:00Z"'
)

# List matching log entries
entries = client.list_entries(filter_=filter_str, max_results=50)

for entry in entries:
    payload = entry.payload
    print(f"Failed login: user={payload.get('user_id')}, "
          f"ip={payload.get('ip_address')}, "
          f"time={entry.timestamp}")
```

## Log-Based Metrics

You can create metrics from your structured logs without changing application code. This is powerful for creating custom dashboards and alerts.

```python
from google.cloud import logging as cloud_logging

client = cloud_logging.Client()

# Create a counter metric based on log entries
# This counts every log entry matching the filter
metric = client.metric(
    "failed_logins",
    filter_='jsonPayload.action="user_login" AND jsonPayload.success=false',
    description="Count of failed login attempts",
)

if not metric.exists():
    metric.create()
    print("Created log-based metric: failed_logins")
```

## Monitoring with OneUptime

Structured logs are critical for debugging, but you also need alerting when things go wrong. OneUptime (https://oneuptime.com) can monitor your application endpoints and notify you when errors spike, giving you a head start on investigating issues through your structured logs in Cloud Logging.

## Wrapping Up

Structured logging is a small investment that pays off enormously in production. Use JSON payloads instead of plain strings, include relevant context like request IDs and user IDs in every log entry, set appropriate severity levels, and correlate logs across services using trace IDs. Whether you use the `google-cloud-logging` library directly or just write JSON to stdout on Cloud Run, the end result is the same: searchable, filterable logs that make production debugging significantly easier.
