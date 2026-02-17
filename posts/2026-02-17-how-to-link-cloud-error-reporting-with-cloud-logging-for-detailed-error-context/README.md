# How to Link Cloud Error Reporting with Cloud Logging for Detailed Error Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Error Reporting, Cloud Logging, Debugging, Observability

Description: Learn how to connect Google Cloud Error Reporting with Cloud Logging to get full context around errors, including surrounding log entries and request metadata.

---

When an error shows up in Cloud Error Reporting, you get the exception message and stack trace. That is useful, but often not enough. You need the surrounding context - what HTTP request triggered it, what the user was doing, what happened in the seconds leading up to the failure. That context lives in Cloud Logging.

Linking Error Reporting with Cloud Logging gives you the full picture. Instead of guessing what caused an error, you can jump straight to the relevant log entries and see exactly what happened.

## How the Integration Works

Cloud Error Reporting and Cloud Logging are tightly integrated by default. When your application writes an error log entry to Cloud Logging with a proper stack trace, Error Reporting automatically picks it up and creates or updates an error group.

The connection works in both directions:

- From Error Reporting, you can click through to the original log entry in Cloud Logging
- From Cloud Logging, you can see which log entries have been captured by Error Reporting

This bidirectional linking happens automatically as long as your error logs are formatted correctly.

## Formatting Errors for Proper Linking

The key to getting good linking between Error Reporting and Cloud Logging is properly formatted error entries. Error Reporting looks for specific patterns in log entries.

For structured logging in JSON format, include these fields:

```json
{
  "severity": "ERROR",
  "message": "Something went wrong",
  "stack_trace": "Error: Something went wrong\n    at processRequest (/app/handler.js:42:11)\n    at /app/server.js:15:5",
  "serviceContext": {
    "service": "my-api",
    "version": "1.2.3"
  }
}
```

Here is a Node.js example that writes properly formatted error logs:

```javascript
// Configure structured logging that links Error Reporting with Cloud Logging
const { Logging } = require('@google-cloud/logging');
const logging = new Logging();
const log = logging.log('my-api-errors');

async function logError(err, req) {
  // Build the metadata with proper severity and resource info
  const metadata = {
    resource: {
      type: 'gae_app', // or cloud_run_revision, gce_instance, etc.
      labels: {
        project_id: 'my-gcp-project',
        module_id: 'my-api',
        version_id: '1.2.3'
      }
    },
    severity: 'ERROR'
  };

  // Include the service context so Error Reporting can group properly
  const entry = log.entry(metadata, {
    message: err.message,
    stack_trace: err.stack,
    serviceContext: {
      service: 'my-api',
      version: '1.2.3'
    },
    // Add request context for better debugging
    context: {
      httpRequest: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip
      }
    }
  });

  await log.write(entry);
}
```

## Using the Error Reporting Client Library

The simplest way to get proper linking is to use the Error Reporting client library directly. It handles all the formatting for you.

```python
# Using the Error Reporting client library for automatic Cloud Logging integration
from google.cloud import error_reporting

def setup_error_reporting():
    # Initialize the client with service context
    client = error_reporting.Client(
        service='my-api',
        version='1.2.3',
        project='my-gcp-project'
    )
    return client

def handle_request(request):
    client = setup_error_reporting()
    try:
        # Your application logic here
        result = process_data(request.data)
        return result
    except Exception as e:
        # Report the error - this automatically creates a linked log entry
        client.report_exception(
            http_context=error_reporting.HTTPContext(
                method=request.method,
                url=request.url,
                user_agent=request.user_agent.string,
                remote_ip=request.remote_addr,
                response_status_code=500
            )
        )
        raise
```

When you use the client library, each error reported creates a log entry in Cloud Logging that is automatically linked to the error group in Error Reporting.

## Navigating from Error Reporting to Cloud Logging

Once the linking is in place, navigating between the two services is straightforward.

In the Error Reporting console, click on an error group. On the error detail page, you will see a section labeled "Recent samples." Each sample shows a specific error event. Click the "View logs" link next to any sample, and it will take you directly to the corresponding log entry in Cloud Logging.

Cloud Logging will open with a filter that shows the exact log entry, plus surrounding entries from the same request or time window. This is where the real debugging value lies - you can see what happened before and after the error.

## Building Correlated Log Views

To get the most out of the Error Reporting and Cloud Logging integration, use trace IDs to correlate all log entries for a single request.

```python
# Add trace context to all log entries for request correlation
import flask
from google.cloud import logging as cloud_logging

app = flask.Flask(__name__)
logging_client = cloud_logging.Client()
logger = logging_client.logger('my-api')

@app.before_request
def add_trace_context():
    # Extract the trace ID from the incoming request header
    trace_header = flask.request.headers.get('X-Cloud-Trace-Context', '')
    if trace_header:
        # Parse the trace ID from the header format: TRACE_ID/SPAN_ID;o=OPTIONS
        trace_id = trace_header.split('/')[0]
        flask.g.trace_id = f"projects/my-gcp-project/traces/{trace_id}"
    else:
        flask.g.trace_id = None

def log_with_trace(message, severity='INFO'):
    # Write a log entry with trace correlation
    logger.log_struct(
        {
            'message': message,
            'serviceContext': {
                'service': 'my-api',
                'version': '1.2.3'
            }
        },
        severity=severity,
        trace=flask.g.trace_id  # This links all logs from the same request
    )
```

With trace IDs in place, when you click through from Error Reporting to Cloud Logging, you can then filter by the trace ID to see every log entry from that specific request. This gives you a complete timeline of what happened.

## Querying Linked Errors in Cloud Logging

You can also search for error entries directly in Cloud Logging using filters:

```bash
# Find all error log entries that Error Reporting has captured
gcloud logging read 'severity=ERROR AND protoPayload.serviceContext.service="my-api"' \
  --project=my-gcp-project \
  --limit=50 \
  --format='table(timestamp, protoPayload.status, protoPayload.line.logMessage)'
```

For more advanced queries, use the Cloud Logging query language in the Console:

```
resource.type="cloud_run_revision"
severity=ERROR
jsonPayload.serviceContext.service="my-api"
timestamp>="2026-02-17T00:00:00Z"
```

## Setting Up Log-Based Metrics for Error Tracking

You can create log-based metrics that count error occurrences and use them for dashboards and alerts. This complements Error Reporting by giving you aggregate views.

```bash
# Create a log-based metric that counts errors by service
gcloud logging metrics create error-count-by-service \
  --description="Count of errors grouped by service" \
  --log-filter='severity=ERROR AND jsonPayload.serviceContext.service!=""' \
  --project=my-gcp-project
```

These metrics show up in Cloud Monitoring where you can build dashboards and set up alerting policies.

## Common Issues with Linking

If Error Reporting is not picking up your errors from Cloud Logging, check these common issues:

**Missing stack trace.** Error Reporting requires a stack trace to create an error group. If you are logging error messages without stack traces, they will appear in Cloud Logging but not in Error Reporting.

**Wrong severity level.** Only log entries with severity ERROR or higher are processed by Error Reporting. If you are logging errors at WARNING level, they will not show up.

**Missing service context.** Without the `serviceContext` field, Error Reporting cannot properly group errors by service and version. Always include it.

**Incorrect resource type.** The resource type in your log entry metadata must match your actual infrastructure. Using the wrong type can prevent Error Reporting from linking properly.

## Best Practices

Keep these practices in mind for reliable Error Reporting and Cloud Logging integration:

1. Always include stack traces in error logs. Use the full stack trace, not just the error message.
2. Set the `serviceContext` field consistently across all services with matching service names and version strings.
3. Use trace IDs to correlate log entries across a request lifecycle.
4. Log contextual information like request parameters and user IDs alongside errors, but be careful not to log sensitive data.
5. Use structured logging instead of plain text for better searchability in Cloud Logging.

## Wrapping Up

The integration between Cloud Error Reporting and Cloud Logging is one of the most practical debugging tools on GCP. Error Reporting tells you what went wrong, and Cloud Logging tells you why. By formatting your errors correctly and using trace correlation, you can go from an error alert to a root cause diagnosis in minutes instead of hours.
