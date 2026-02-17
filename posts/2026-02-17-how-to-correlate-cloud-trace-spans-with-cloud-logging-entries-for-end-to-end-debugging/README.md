# How to Correlate Cloud Trace Spans with Cloud Logging Entries for End-to-End Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, Cloud Logging, Debugging, Observability

Description: Learn how to link Cloud Trace spans with Cloud Logging entries to get the full picture during debugging, combining latency data with detailed log context.

---

Traces tell you where time is being spent. Logs tell you what actually happened. When you are debugging a production issue, you usually need both. A trace might show that a database query took 3 seconds, but the log entry tells you it was because a missing index caused a full table scan.

Google Cloud makes it possible to correlate these two data sources through trace context. When done correctly, clicking on a trace in Cloud Trace shows you the related log entries, and clicking on a log entry in Cloud Logging takes you to the associated trace. Let me show you how to set this up properly.

## How Correlation Works

Cloud Logging and Cloud Trace connect through two fields:

1. **trace**: A field on every log entry that contains the trace ID in the format `projects/PROJECT_ID/traces/TRACE_ID`
2. **spanId**: An optional field that links the log entry to a specific span within the trace

When both fields are present, Cloud Console creates clickable links between the Logs Explorer and the Trace Explorer. You can jump from a log entry directly to the trace waterfall, or from a trace span to all associated log entries.

## Automatic Correlation on GCP Services

Some GCP services set the trace context automatically:

- **Cloud Run**: Automatically propagates the `X-Cloud-Trace-Context` header and sets the trace field on logs written to stdout/stderr.
- **App Engine**: Same automatic propagation and log correlation.
- **Cloud Functions**: Trace context is available through the request headers.
- **GKE with Cloud Logging agent**: The agent can be configured to extract trace context.

For Cloud Run, if you write structured logs to stdout as JSON, include the trace and spanId fields and the correlation just works.

```python
# Structured logging on Cloud Run with automatic trace correlation
import json
import sys
import os

def log_with_trace(message, severity="INFO", trace_id=None, span_id=None):
    """Write a structured log entry with trace context."""
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

    entry = {
        "message": message,
        "severity": severity,
    }

    # Add trace context if available
    if trace_id:
        entry["logging.googleapis.com/trace"] = f"projects/{project}/traces/{trace_id}"
    if span_id:
        entry["logging.googleapis.com/spanId"] = span_id

    # Write as JSON to stdout for Cloud Logging to pick up
    print(json.dumps(entry), file=sys.stdout, flush=True)
```

## Setting Up Correlation with OpenTelemetry

When you use OpenTelemetry for tracing, you need to make sure your log entries include the current trace and span IDs. Here is how to set this up in Python using the standard logging module.

This logging handler automatically injects trace context from the active OpenTelemetry span into every log record.

```python
# logging_config.py - Configure Python logging with trace context injection
import logging
import json
import os
from opentelemetry import trace


class TraceContextFilter(logging.Filter):
    """Logging filter that adds trace context to log records."""

    def __init__(self, project_id):
        super().__init__()
        self.project_id = project_id

    def filter(self, record):
        # Get the current span from OpenTelemetry
        span = trace.get_current_span()
        ctx = span.get_span_context()

        if ctx and ctx.trace_id != 0:
            # Format trace ID as a 32-character hex string
            record.trace_id = format(ctx.trace_id, '032x')
            record.span_id = format(ctx.span_id, '016x')
            record.trace_resource = (
                f"projects/{self.project_id}/traces/{record.trace_id}"
            )
        else:
            record.trace_id = ""
            record.span_id = ""
            record.trace_resource = ""

        return True


class StructuredLogHandler(logging.StreamHandler):
    """Handler that outputs JSON-formatted logs for Cloud Logging."""

    def emit(self, record):
        log_entry = {
            "message": record.getMessage(),
            "severity": record.levelname,
            "logging.googleapis.com/trace": getattr(record, 'trace_resource', ''),
            "logging.googleapis.com/spanId": getattr(record, 'span_id', ''),
            "logger": record.name,
        }

        # Include exception info if present
        if record.exc_info:
            log_entry["exception"] = self.format(record)

        print(json.dumps(log_entry), flush=True)
```

Now configure your application to use these.

```python
# app.py - Application setup with correlated logging
import logging
from logging_config import TraceContextFilter, StructuredLogHandler

# Configure the root logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Add the trace context filter
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "my-project")
logger.addFilter(TraceContextFilter(project_id))

# Add the structured log handler
handler = StructuredLogHandler()
logger.addHandler(handler)

# Remove the default handler to avoid duplicate logs
logger.handlers = [handler]
```

With this configuration, every log entry your application produces will include the trace and span IDs from the active OpenTelemetry context.

## Node.js Correlation Setup

For Node.js applications, here is the equivalent setup using Winston.

```javascript
// logger.js - Winston logger with trace context injection
const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'my-project';

// Custom format that injects trace context into every log entry
const traceFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    // Add trace fields that Cloud Logging recognizes
    info['logging.googleapis.com/trace'] =
      `projects/${projectId}/traces/${spanContext.traceId}`;
    info['logging.googleapis.com/spanId'] = spanContext.spanId;
  }
  return info;
})();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    traceFormat,
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
```

Use it in your route handlers.

```javascript
// routes/orders.js
const logger = require('../logger');

app.get('/api/orders/:id', async (req, res) => {
  // This log entry will automatically include trace context
  logger.info('Fetching order', { orderId: req.params.id });

  try {
    const order = await orderService.getOrder(req.params.id);
    logger.info('Order fetched successfully', {
      orderId: req.params.id,
      itemCount: order.items.length,
    });
    res.json(order);
  } catch (error) {
    // Error logs are especially useful when correlated with traces
    logger.error('Failed to fetch order', {
      orderId: req.params.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Using the Cloud Logging Library for Direct Correlation

If you prefer using the Google Cloud Logging client library instead of stdout, it has built-in support for trace correlation.

```python
# Using the Cloud Logging client library with trace correlation
from google.cloud import logging as cloud_logging
from opentelemetry import trace

# Set up the Cloud Logging client
client = cloud_logging.Client()
logger = client.logger("my-application")

def log_with_current_trace(message, severity="INFO"):
    """Log a message with the current trace context attached."""
    span = trace.get_current_span()
    ctx = span.get_span_context()

    trace_id = format(ctx.trace_id, '032x') if ctx.trace_id else None
    span_id = format(ctx.span_id, '016x') if ctx.span_id else None
    project = client.project

    logger.log_struct(
        {"message": message},
        severity=severity,
        trace=f"projects/{project}/traces/{trace_id}" if trace_id else None,
        span_id=span_id,
    )
```

## Viewing Correlated Data in the Console

Once correlation is set up, you can navigate between traces and logs in the Cloud Console.

**From Cloud Trace to Logs:**
1. Open a trace in the Trace Explorer
2. Click on a specific span in the waterfall
3. Look for the "Logs" link in the span details panel
4. Click it to jump to the Logs Explorer, pre-filtered to show entries for that span

**From Cloud Logging to Trace:**
1. Find a log entry in the Logs Explorer
2. If the entry has trace context, you will see a "Cloud Trace" link
3. Click it to open the full trace waterfall in Cloud Trace

**Using Logs Explorer with trace grouping:**
You can also group log entries by trace in the Logs Explorer. Toggle "Correlated by trace" in the summary fields, and log entries from the same trace will be grouped together.

## Troubleshooting Correlation Issues

If the links are not showing up, check these common issues:

1. **Wrong trace format**: The trace field must be `projects/PROJECT_ID/traces/TRACE_ID`. Missing the project prefix is a common mistake.

2. **Hex formatting**: Trace IDs must be 32-character lowercase hex strings. Span IDs must be 16-character lowercase hex strings.

3. **Missing project ID**: When running locally or in environments where `GOOGLE_CLOUD_PROJECT` is not set, the trace field will have an empty project.

4. **Log timing**: Log entries and spans must overlap in time. If your log timestamp is outside the span's time range, the correlation will not work.

You can verify the trace field is present by checking a log entry in the Logs Explorer and expanding the JSON to look for the `trace` field.

## Wrapping Up

Correlating traces and logs transforms your debugging workflow. Instead of searching through logs by timestamp and hoping you find the right entries, you can jump directly from a slow span to the exact log messages that explain what happened. Set up the trace context injection once, and you will have this capability for every request your application handles.
