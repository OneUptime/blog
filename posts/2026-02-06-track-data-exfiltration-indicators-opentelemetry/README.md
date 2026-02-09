# How to Track Data Exfiltration Indicators (Unusual Payload Sizes, Off-Hours Access) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Exfiltration, Security, Monitoring

Description: Detect data exfiltration indicators like unusual response payload sizes and off-hours data access patterns using OpenTelemetry metrics and traces.

Data exfiltration often does not look like an obvious attack. Instead of a dramatic breach, it looks like normal API calls that happen to return unusually large payloads, happen at odd hours, or target data export endpoints more frequently than usual. These subtle patterns are hard to catch with traditional security tools, but they stand out in your OpenTelemetry telemetry data if you know what to look for.

This post covers how to instrument your applications to detect the most common data exfiltration indicators.

## Key Indicators to Track

The three main indicators of data exfiltration are:

1. **Unusual response payload sizes** - An attacker querying bulk data through an API will generate larger responses than normal usage.
2. **Off-hours access patterns** - Automated exfiltration scripts often run during nights and weekends when monitoring is lighter.
3. **High-frequency access to data export endpoints** - Repeated calls to endpoints like `/export`, `/download`, or `/api/v1/users` with large `limit` parameters.

## Instrumenting Response Payload Monitoring

Add middleware that tracks response sizes with enough context for anomaly detection:

```python
import time
from flask import Flask, request, g
from opentelemetry import trace, metrics

app = Flask(__name__)
tracer = trace.get_tracer("exfiltration-detector")
meter = metrics.get_meter("exfiltration-detector")

# Histogram of response sizes per endpoint and user
response_size_histogram = meter.create_histogram(
    "http.response.body.size",
    description="Response body size in bytes",
    unit="bytes",
)

# Counter for large response events
large_response_counter = meter.create_counter(
    "security.large_response.count",
    description="Number of responses exceeding the size threshold",
)

# Threshold for what counts as "large" per endpoint
# You should calibrate these based on your actual traffic
ENDPOINT_SIZE_THRESHOLDS = {
    "/api/v1/users": 50_000,        # 50KB
    "/api/v1/orders": 100_000,      # 100KB
    "/api/v1/export": 500_000,      # 500KB
    "default": 200_000,             # 200KB for unlisted endpoints
}

class ResponseSizeTracker:
    """Wraps the WSGI response to capture the actual body size."""

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # Track the total bytes sent in the response
        response_size = [0]

        def tracking_start_response(status, headers, exc_info=None):
            write = start_response(status, headers, exc_info)
            def tracking_write(data):
                response_size[0] += len(data)
                return write(data)
            return tracking_write

        response = self.app(environ, tracking_start_response)

        # After the response is fully sent, record metrics
        total_size = response_size[0]
        for chunk in response:
            total_size += len(chunk)
            yield chunk

        # Record the response size
        path = environ.get("PATH_INFO", "unknown")
        self.record_response_size(path, total_size, environ)

    def record_response_size(self, path, size, environ):
        span = trace.get_current_span()
        user_id = environ.get("HTTP_X_USER_ID", "anonymous")

        span.set_attribute("http.response.body.size", size)
        span.set_attribute("security.user_id", user_id)

        response_size_histogram.record(size, {
            "http.route": path,
            "user.id": user_id,
        })

        # Check against threshold
        threshold = ENDPOINT_SIZE_THRESHOLDS.get(
            path, ENDPOINT_SIZE_THRESHOLDS["default"]
        )

        if size > threshold:
            span.set_attribute("security.large_response", True)
            span.set_attribute("security.size_threshold", threshold)
            span.add_event("large_response_detected", {
                "response_size": str(size),
                "threshold": str(threshold),
                "user_id": user_id,
                "path": path,
            })

            large_response_counter.add(1, {
                "http.route": path,
                "user.id": user_id,
            })

app.wsgi_app = ResponseSizeTracker(app.wsgi_app)
```

## Detecting Off-Hours Access

Track the time of day for data access and flag requests that fall outside normal business hours:

```python
from datetime import datetime, timezone
import pytz

# Define business hours for your organization
BUSINESS_TZ = pytz.timezone("America/New_York")
BUSINESS_HOURS_START = 7   # 7 AM
BUSINESS_HOURS_END = 20    # 8 PM
BUSINESS_DAYS = {0, 1, 2, 3, 4}  # Monday through Friday

off_hours_counter = meter.create_counter(
    "security.off_hours_access.count",
    description="Data access events outside business hours",
)

def check_off_hours_access(endpoint, user_id):
    """
    Check if the current request is happening outside
    normal business hours and record it as a security signal.
    """
    now = datetime.now(BUSINESS_TZ)
    is_business_hours = (
        now.weekday() in BUSINESS_DAYS
        and BUSINESS_HOURS_START <= now.hour < BUSINESS_HOURS_END
    )

    span = trace.get_current_span()
    span.set_attribute("security.is_business_hours", is_business_hours)
    span.set_attribute("security.local_hour", now.hour)
    span.set_attribute("security.day_of_week", now.strftime("%A"))

    if not is_business_hours:
        span.add_event("off_hours_data_access", {
            "user_id": user_id,
            "endpoint": endpoint,
            "local_time": now.isoformat(),
            "day_of_week": now.strftime("%A"),
        })

        off_hours_counter.add(1, {
            "http.route": endpoint,
            "user.id": user_id,
            "day_of_week": now.strftime("%A"),
        })

    return is_business_hours
```

## Monitoring Export Endpoint Frequency

Track how often users hit data export or bulk query endpoints:

```python
export_endpoint_counter = meter.create_counter(
    "security.export_endpoint.requests",
    description="Requests to data export endpoints",
)

# Endpoints that return bulk data
EXPORT_ENDPOINTS = {
    "/api/v1/export",
    "/api/v1/download",
    "/api/v1/reports/generate",
}

# Also watch for high limit parameters on list endpoints
LIST_ENDPOINTS = {
    "/api/v1/users",
    "/api/v1/orders",
    "/api/v1/customers",
}

@app.before_request
def track_export_access():
    path = request.path
    user_id = request.headers.get("X-User-ID", "anonymous")

    if path in EXPORT_ENDPOINTS:
        export_endpoint_counter.add(1, {
            "http.route": path,
            "user.id": user_id,
        })

        check_off_hours_access(path, user_id)

    if path in LIST_ENDPOINTS:
        # Check for unusually high limit parameters
        limit = request.args.get("limit", "20")
        try:
            limit_int = int(limit)
        except ValueError:
            limit_int = 20

        span = trace.get_current_span()
        span.set_attribute("query.limit", limit_int)

        if limit_int > 1000:
            span.set_attribute("security.high_limit_query", True)
            span.add_event("high_limit_query", {
                "limit": str(limit_int),
                "user_id": user_id,
                "endpoint": path,
            })

            export_endpoint_counter.add(1, {
                "http.route": path,
                "user.id": user_id,
                "query.type": "high_limit",
            })
```

## Alert Rules

Combine these signals into alerts:

```yaml
groups:
  - name: data-exfiltration
    rules:
      # User downloading unusually large amounts of data
      - alert: LargeDataDownload
        expr: |
          sum by (user_id) (
            increase(security_large_response_count_total[1h])
          ) > 10
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "User {{ $labels.user_id }} triggered 10+ large response alerts in 1 hour"

      # Off-hours data export access
      - alert: OffHoursExportAccess
        expr: |
          sum by (user_id) (
            rate(security_off_hours_access_count_total[30m])
          ) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Off-hours data access detected for user {{ $labels.user_id }}"

      # Sudden spike in export endpoint usage
      - alert: ExportEndpointSpike
        expr: |
          sum by (user_id) (
            rate(security_export_endpoint_requests_total[10m])
          ) > 3 * sum by (user_id) (
            rate(security_export_endpoint_requests_total[24h])
          )
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Export endpoint usage spike for user {{ $labels.user_id }}"
```

## Summary

Data exfiltration leaves traces in your telemetry data. By monitoring response payload sizes, time-of-day access patterns, and export endpoint frequency with OpenTelemetry, you can detect the subtle patterns that indicate someone is extracting data from your system. The key is establishing baselines for what normal looks like and alerting when behavior deviates. None of these signals are definitive on their own, but when multiple indicators fire together for the same user, that warrants immediate investigation.
