# How to Write Structured JSON Logs to Cloud Logging from Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Structured Logging, JSON, Application Development

Description: Learn how to write structured JSON logs from your application code that Cloud Logging automatically parses into searchable, filterable fields.

---

If your application writes plain text log messages, Cloud Logging stores them as opaque strings that are hard to search and filter. But if you write logs as structured JSON, Cloud Logging automatically parses the JSON fields and makes them individually searchable. This means you can filter logs by any field in your JSON - error codes, user IDs, request durations, or any custom field you include.

In this post, I will show you how to write structured logs from several popular programming languages and how to use special fields that Cloud Logging recognizes.

## How Cloud Logging Handles Structured Logs

When your application writes a JSON object to stdout or stderr, Cloud Logging does two things:

1. It parses the JSON into the `jsonPayload` field of the log entry
2. It recognizes certain special fields and maps them to the log entry's top-level properties

For example, if your JSON includes a `severity` field, Cloud Logging uses it as the log entry's severity level instead of defaulting to `DEFAULT`.

## Special Fields Cloud Logging Recognizes

These fields in your JSON get special treatment:

| JSON Field | Cloud Logging Field | Description |
|------------|-------------------|-------------|
| `severity` | severity | Log level (DEBUG, INFO, WARNING, ERROR, etc.) |
| `message` | textPayload or jsonPayload.message | The main log message |
| `time` or `timestamp` | timestamp | Log entry timestamp |
| `httpRequest` | httpRequest | HTTP request details |
| `logging.googleapis.com/trace` | trace | Trace ID for distributed tracing |
| `logging.googleapis.com/spanId` | spanId | Span ID within a trace |
| `logging.googleapis.com/labels` | labels | Custom labels for the log entry |
| `logging.googleapis.com/sourceLocation` | sourceLocation | Source file, line, and function |

## Python Examples

### Basic Structured Logging

The simplest approach is to use Python's built-in `logging` module with a JSON formatter:

```python
# Configure Python's logging module to output JSON to stdout
import json
import logging
import sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "time": self.formatTime(record),
            "logging.googleapis.com/sourceLocation": {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName
            }
        }
        # Include any extra fields passed to the logger
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        return json.dumps(log_entry)

# Set up the logger
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage
logger.info("User login successful", extra={"extra_fields": {
    "user_id": "12345",
    "login_method": "oauth",
    "ip_address": "192.168.1.1"
}})
```

### Using the google-cloud-logging Library

Google provides an official library that handles the formatting for you:

```python
# Using the google-cloud-logging library for automatic structured logging
import google.cloud.logging
import logging

# Set up the client - integrates with Python's logging module
client = google.cloud.logging.Client()
client.setup_logging()

logger = logging.getLogger(__name__)

# Simple log message
logger.info("Application started")

# Structured log with extra fields
logger.info("Order processed", extra={
    "json_fields": {
        "order_id": "ORD-98765",
        "total_amount": 149.99,
        "items_count": 3,
        "customer_id": "CUST-12345"
    }
})
```

### Flask Application Example

```python
# Structured logging in a Flask application
import json
import logging
import sys
from flask import Flask, request, g
import time

app = Flask(__name__)

class CloudLoggingFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "time": self.formatTime(record),
        }
        # Add request context if available
        if hasattr(record, 'request_info'):
            log_entry["httpRequest"] = record.request_info
        if hasattr(record, 'custom_fields'):
            log_entry.update(record.custom_fields)
        return json.dumps(log_entry)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(CloudLoggingFormatter())
logger = logging.getLogger("app")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

@app.before_request
def start_timer():
    g.start_time = time.time()

@app.after_request
def log_request(response):
    duration = time.time() - g.start_time
    logger.info("Request completed", extra={
        "request_info": {
            "requestMethod": request.method,
            "requestUrl": request.url,
            "status": response.status_code,
            "latency": f"{duration:.3f}s",
            "userAgent": request.user_agent.string,
            "remoteIp": request.remote_addr
        },
        "custom_fields": {
            "duration_ms": round(duration * 1000, 2),
            "path": request.path,
        }
    })
    return response
```

## Node.js Examples

### Basic JSON Logging

```javascript
// Simple structured logging to stdout for Cloud Logging
function log(severity, message, fields = {}) {
  const entry = {
    severity: severity,
    message: message,
    time: new Date().toISOString(),
    ...fields
  };
  console.log(JSON.stringify(entry));
}

// Usage examples
log('INFO', 'Server started', { port: 8080 });
log('ERROR', 'Database connection failed', {
  error_code: 'ECONNREFUSED',
  host: 'db.example.com',
  retry_count: 3
});
```

### Using Winston

```javascript
// Structured logging with Winston for Cloud Logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      // Map Winston levels to Cloud Logging severity
      const severityMap = {
        error: 'ERROR',
        warn: 'WARNING',
        info: 'INFO',
        debug: 'DEBUG'
      };

      const entry = {
        severity: severityMap[level] || 'DEFAULT',
        message: message,
        time: timestamp,
        ...meta
      };

      return JSON.stringify(entry);
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Usage
logger.info('Order created', {
  order_id: 'ORD-12345',
  customer_id: 'CUST-67890',
  total: 299.99
});

logger.error('Payment failed', {
  order_id: 'ORD-12345',
  error_code: 'CARD_DECLINED',
  payment_method: 'credit_card'
});
```

## Go Examples

```go
// Structured JSON logging in Go for Cloud Logging
package main

import (
    "encoding/json"
    "fmt"
    "os"
    "time"
)

// LogEntry represents a structured log entry
type LogEntry struct {
    Severity string                 `json:"severity"`
    Message  string                 `json:"message"`
    Time     string                 `json:"time"`
    Fields   map[string]interface{} `json:"omitempty"`
}

func logJSON(severity, message string, fields map[string]interface{}) {
    entry := map[string]interface{}{
        "severity": severity,
        "message":  message,
        "time":     time.Now().Format(time.RFC3339Nano),
    }
    // Merge custom fields into the entry
    for k, v := range fields {
        entry[k] = v
    }
    data, _ := json.Marshal(entry)
    fmt.Fprintln(os.Stdout, string(data))
}

func main() {
    logJSON("INFO", "Application started", map[string]interface{}{
        "version": "1.2.3",
        "port":    8080,
    })

    logJSON("ERROR", "Failed to process request", map[string]interface{}{
        "request_id": "req-abc123",
        "error":      "timeout after 30s",
        "endpoint":   "/api/orders",
    })
}
```

## Correlating Logs with Traces

If you use Cloud Trace, include the trace context in your logs. This lets you click on a trace and see all related log entries:

```python
# Include trace context in structured logs for correlation
import json
import logging
import sys

def get_trace_context(request):
    """Extract trace context from the incoming request header."""
    trace_header = request.headers.get('X-Cloud-Trace-Context', '')
    if trace_header:
        trace_id = trace_header.split('/')[0]
        project_id = 'my-project'
        return f"projects/{project_id}/traces/{trace_id}"
    return None

class TracingFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "time": self.formatTime(record),
        }
        # Add trace context if available
        if hasattr(record, 'trace'):
            entry["logging.googleapis.com/trace"] = record.trace
        if hasattr(record, 'span_id'):
            entry["logging.googleapis.com/spanId"] = record.span_id
        return json.dumps(entry)
```

## Querying Structured Logs

Once your logs are structured, you can filter on any JSON field in Cloud Logging:

```
# Find logs for a specific user
jsonPayload.user_id="12345"

# Find logs with high latency
jsonPayload.duration_ms>1000

# Find failed payments
jsonPayload.error_code="CARD_DECLINED"

# Combine multiple field filters
jsonPayload.order_id="ORD-12345" AND severity>=ERROR
```

## Wrapping Up

Structured JSON logging is one of the highest-impact changes you can make to your application's observability. It transforms your logs from opaque text strings into searchable, filterable data. The investment is small - mostly just changing your log format to JSON and including relevant context fields. The payoff is enormous - faster debugging, easier monitoring, and the ability to build log-based metrics and alerts on any field in your application logs. Start by adding structured logging to your next deployment and expand from there.
