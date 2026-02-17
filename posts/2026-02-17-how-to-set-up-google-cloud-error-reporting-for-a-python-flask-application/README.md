# How to Set Up Google Cloud Error Reporting for a Python Flask Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Error Reporting, Python, Flask, Monitoring

Description: A complete guide to integrating Google Cloud Error Reporting with a Python Flask application for automatic error grouping, tracking, and alerting on production exceptions.

---

When your Flask application throws an exception in production, you need to know about it fast. But scrolling through logs looking for stack traces is not a viable approach when your service handles thousands of requests per hour. Google Cloud Error Reporting automatically groups, deduplicates, and tracks errors, giving you a clear view of what is breaking and how often.

Error Reporting works by analyzing stack traces from your application. It groups identical errors together, tracks their frequency over time, and alerts you when new errors appear or existing ones spike. Setting it up for a Flask application takes about 10 minutes.

## How Error Reporting Works

Error Reporting collects errors from two sources:

1. **Cloud Logging**: Any log entry with severity ERROR or higher that contains a stack trace is automatically picked up by Error Reporting.
2. **Error Reporting API**: You can report errors directly using the client library.

For Flask applications, the most practical approach combines both: use Cloud Logging for automatic error capture and the client library for more control when needed.

## Step 1: Install Dependencies

```bash
# Install the Google Cloud error reporting and logging libraries
pip install google-cloud-error-reporting google-cloud-logging flask
```

## Step 2: Basic Setup with Cloud Logging

The simplest approach is to use Cloud Logging's integration with Flask. When your app logs an error with a stack trace, Error Reporting picks it up automatically.

```python
# app.py - Flask app with Cloud Logging integration
import google.cloud.logging
import logging
from flask import Flask, jsonify, request

# Set up Cloud Logging - this redirects Python logging to Cloud Logging
client = google.cloud.logging.Client()
client.setup_logging()

app = Flask(__name__)
logger = logging.getLogger(__name__)


@app.route('/api/users/<user_id>')
def get_user(user_id):
    try:
        user = fetch_user_from_db(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user)
    except Exception as e:
        # This logs the exception with a full stack trace
        # Error Reporting automatically picks it up
        logger.exception(f"Failed to fetch user {user_id}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        order_data = request.json
        validate_order(order_data)
        order = save_order(order_data)
        return jsonify(order), 201
    except ValueError as e:
        # Client errors - log as warning, not error
        logger.warning(f"Invalid order data: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        # Server errors - log as error with stack trace
        logger.exception("Failed to create order")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

The key function is `logger.exception()`. It logs the current exception with its full stack trace at ERROR level. Error Reporting uses the stack trace to group related errors together.

## Step 3: Using the Error Reporting Client Library

For more control over error reporting, use the dedicated client library. This lets you add custom context and report errors without logging them.

```python
# error_handler.py - Custom error reporting with context
from google.cloud import error_reporting
from flask import request
import traceback

# Initialize the Error Reporting client
error_client = error_reporting.Client()


def report_error(exception, context=None):
    """Report an error to Google Cloud Error Reporting with request context."""
    # Build the HTTP context from the Flask request
    http_context = error_reporting.HTTPContext(
        method=request.method,
        url=request.url,
        user_agent=request.headers.get('User-Agent', ''),
        referrer=request.headers.get('Referer', ''),
        response_status_code=500,
        remote_ip=request.remote_addr,
    )

    # Report the exception with HTTP context
    error_client.report_exception(
        http_context=http_context,
        user=context.get('user_id') if context else None,
    )
```

## Step 4: Set Up a Global Error Handler

Flask's error handlers let you catch all unhandled exceptions in one place. This is the most reliable way to ensure every error gets reported.

```python
# app.py - Complete Flask app with global error handling
import google.cloud.logging
import logging
from google.cloud import error_reporting
from flask import Flask, jsonify, request, g
import traceback

# Initialize Cloud Logging
logging_client = google.cloud.logging.Client()
logging_client.setup_logging()

# Initialize Error Reporting
error_client = error_reporting.Client()

app = Flask(__name__)
logger = logging.getLogger(__name__)


@app.before_request
def before_request():
    """Store request start time and context."""
    import time
    g.start_time = time.time()


@app.errorhandler(Exception)
def handle_exception(e):
    """Global error handler - catches all unhandled exceptions."""
    # Log the error with full stack trace
    logger.exception(f"Unhandled exception in {request.method} {request.path}")

    # Report to Error Reporting with HTTP context
    http_context = error_reporting.HTTPContext(
        method=request.method,
        url=request.url,
        user_agent=request.headers.get('User-Agent', ''),
        response_status_code=500,
        remote_ip=request.remote_addr,
    )
    error_client.report_exception(http_context=http_context)

    # Return a generic error response
    return jsonify({
        "error": "Internal server error",
        "request_id": request.headers.get('X-Request-Id', 'unknown'),
    }), 500


@app.errorhandler(404)
def handle_not_found(e):
    """Handle 404 errors without reporting them as exceptions."""
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(400)
def handle_bad_request(e):
    """Handle 400 errors without reporting them as exceptions."""
    return jsonify({"error": str(e)}), 400


# Application routes
@app.route('/api/data')
def get_data():
    data = fetch_data()  # If this throws, handle_exception catches it
    return jsonify(data)


@app.route('/api/process', methods=['POST'])
def process_data():
    payload = request.json
    if not payload:
        return jsonify({"error": "Request body required"}), 400

    result = process(payload)  # If this throws, handle_exception catches it
    return jsonify(result)


@app.route('/health')
def health():
    return jsonify({"status": "healthy"})
```

## Step 5: Add Custom Error Context

Error Reporting can include custom context that helps with debugging. Add user information, request metadata, or business context.

```python
# middleware.py - Add context to error reports
from flask import request, g
from google.cloud import error_reporting

error_client = error_reporting.Client()


def report_with_context(exception):
    """Report an error with rich context information."""
    # Build context from the current request
    context = {
        "user_id": getattr(g, 'user_id', 'anonymous'),
        "endpoint": request.endpoint,
        "query_params": dict(request.args),
        "request_id": request.headers.get('X-Request-Id', 'none'),
    }

    http_context = error_reporting.HTTPContext(
        method=request.method,
        url=request.url,
        user_agent=request.headers.get('User-Agent', ''),
        response_status_code=500,
        remote_ip=request.remote_addr,
    )

    # Log the error with context for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.error(
        f"Error in {context['endpoint']}: {str(exception)}",
        extra={
            "json_fields": context
        }
    )

    # Report to Error Reporting
    error_client.report_exception(
        http_context=http_context,
        user=context.get('user_id'),
    )
```

## Step 6: Deploy to App Engine or Cloud Run

### App Engine

For App Engine, Error Reporting works out of the box. Any uncaught exception that produces a stack trace in the logs is automatically captured.

```yaml
# app.yaml
runtime: python311
entrypoint: gunicorn -b :$PORT app:app --workers 2
```

### Cloud Run

For Cloud Run, make sure structured logging is enabled so Error Reporting can parse the stack traces.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app", "--workers", "2"]
```

```bash
# Deploy to Cloud Run
gcloud run deploy my-flask-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## Step 7: Set Up Notifications

Error Reporting can notify you when new errors appear or when error rates spike.

In the Cloud Console, go to **Error Reporting** and:

1. Click on the notification settings (bell icon)
2. Choose notification channels (email, Slack via Cloud Monitoring, PagerDuty)
3. Configure when to notify: new errors only, or also when error rates increase

You can also set up notifications through Cloud Monitoring alert policies:

```bash
# Alert when error count exceeds threshold
gcloud monitoring policies create \
  --display-name="Flask App Error Rate" \
  --condition-display-name="Error count above 50 per minute" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="logging.googleapis.com/log_entry_count" AND metric.labels.severity="ERROR"' \
  --condition-threshold-value=50 \
  --condition-threshold-duration=60s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_RATE"}'
```

## Step 8: Using the Error Reporting Dashboard

The Error Reporting dashboard in the Cloud Console shows:

- **Error groups**: Each unique error (same stack trace pattern) is a group
- **Occurrence count**: How many times each error has occurred
- **Affected users**: If you set user context, how many unique users hit the error
- **First/last seen**: When the error first appeared and most recently occurred
- **Status**: Open, acknowledged, resolved, or muted

### Resolution Workflow

1. New error appears in Error Reporting
2. Team gets notified
3. Someone clicks on the error to see the full stack trace and HTTP context
4. They mark it as "acknowledged" while investigating
5. They fix the code and deploy
6. Once the error stops recurring, they mark it as "resolved"
7. If it reappears, Error Reporting reopens it automatically

## Best Practices

1. **Do not report client errors as exceptions**: 400-level responses are not bugs in your code. Log them as warnings, not errors. Otherwise, Error Reporting gets noisy with validation failures and bad requests.

2. **Include request context**: Always include the HTTP context (method, URL, user agent) so you can reproduce the issue.

3. **Use structured logging**: JSON-formatted logs with severity levels help Error Reporting parse and group errors correctly.

4. **Set meaningful service names**: If you run multiple Flask services, give each one a distinct service name so errors are grouped per service.

5. **Test error reporting**: Deliberately trigger an error in staging and verify it shows up in the Error Reporting dashboard.

## Wrapping Up

Google Cloud Error Reporting transforms exception handling from a reactive log-tailing exercise into a proactive error management system. Set up the global error handler, add HTTP context for debugging, configure notifications for new errors, and use the dashboard to track resolution. The setup takes 10 minutes and immediately improves how your team handles production errors.
