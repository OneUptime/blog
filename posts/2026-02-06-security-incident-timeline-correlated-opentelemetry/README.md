# How to Build a Security Incident Timeline from Correlated OpenTelemetry Traces, Logs, and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Incident Response, Correlation, Security

Description: Build a security incident timeline by correlating OpenTelemetry traces, logs, and metrics to reconstruct the full sequence of events during a breach.

When a security incident happens, the first question is always: "What happened, and when?" Reconstructing the timeline of an attack is critical for understanding scope, containing damage, and preventing recurrence. The challenge is that the evidence is scattered across traces, logs, and metrics from different services.

OpenTelemetry solves this by using a common correlation model. Traces, logs, and metrics all share trace IDs, timestamps, and resource attributes. This post shows how to build an incident timeline from these three signal types.

## The Correlation Model

OpenTelemetry provides built-in correlation through:

- **Trace ID** - Links all spans in a distributed transaction.
- **Span ID** - Links log records to the specific span that produced them.
- **Resource attributes** - Links all signals from the same service instance (pod, host, service name).
- **Timestamps** - Every signal has a precise timestamp for ordering.

When you query across all three signal types using these common fields, you can reconstruct what happened across your entire system.

## Ensuring Proper Correlation in Your Instrumentation

First, make sure your application links logs to traces:

```python
import logging
from opentelemetry import trace
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# This automatically injects trace_id and span_id
# into every Python log record
LoggingInstrumentor().instrument(set_logging_format=True)

logger = logging.getLogger("my-service")

# When you log within a traced context, the trace ID
# is automatically attached
def handle_request(request):
    with trace.get_tracer("my-service").start_as_current_span("process_request") as span:
        span.set_attribute("user.id", request.user_id)
        span.set_attribute("http.path", request.path)

        # This log record will automatically include
        # trace_id and span_id
        logger.info(
            "Processing request",
            extra={
                "user.id": request.user_id,
                "http.path": request.path,
                "security.source_ip": request.remote_addr,
            }
        )

        # Any child spans also carry the same trace_id
        result = process_business_logic(request)
        return result
```

## Building the Timeline Query

Here is a SQL-based approach to reconstructing an incident timeline. This assumes your observability backend supports querying across signals (most do, including OneUptime, Grafana, and Elastic):

```sql
-- Security Incident Timeline Builder
-- Replace the parameters with your incident specifics

-- Step 1: Find all traces involving the compromised user
-- during the incident window
WITH incident_traces AS (
  SELECT DISTINCT trace_id
  FROM spans
  WHERE
    attributes['user.id'] = 'compromised-user-123'
    AND start_time BETWEEN '2026-02-05 14:00:00' AND '2026-02-05 18:00:00'
),

-- Step 2: Get all spans from those traces
trace_events AS (
  SELECT
    'trace' AS signal_type,
    s.trace_id,
    s.span_id,
    s.start_time AS timestamp,
    s.span_name AS event_name,
    s.resource_attributes['service.name'] AS service,
    s.attributes['http.method'] AS http_method,
    s.attributes['http.path'] AS http_path,
    s.attributes['http.status_code'] AS status_code,
    s.attributes['authz.decision'] AS authz_decision,
    s.status_code AS span_status,
    s.duration_ms
  FROM spans s
  JOIN incident_traces it ON s.trace_id = it.trace_id
),

-- Step 3: Get all logs from those traces
log_events AS (
  SELECT
    'log' AS signal_type,
    l.trace_id,
    l.span_id,
    l.timestamp,
    l.body AS event_name,
    l.resource_attributes['service.name'] AS service,
    l.attributes['security.event_type'] AS security_event,
    l.attributes['security.source_ip'] AS source_ip,
    l.severity_text AS severity
  FROM logs l
  JOIN incident_traces it ON l.trace_id = it.trace_id
),

-- Step 4: Get metrics anomalies during the incident window
metric_anomalies AS (
  SELECT
    'metric' AS signal_type,
    NULL AS trace_id,
    NULL AS span_id,
    m.timestamp,
    m.metric_name AS event_name,
    m.resource_attributes['service.name'] AS service,
    m.value,
    m.attributes
  FROM metrics m
  WHERE
    m.timestamp BETWEEN '2026-02-05 14:00:00' AND '2026-02-05 18:00:00'
    AND (
      -- Look for anomalous metrics during the window
      (m.metric_name = 'auth.jwt.validations' AND m.attributes['result'] = 'invalid')
      OR (m.metric_name = 'security.large_response.count')
      OR (m.metric_name = 'authz.denials')
      OR (m.metric_name = 'http.server.request.duration' AND m.value > 5000)
    )
)

-- Step 5: Combine and order by timestamp
SELECT * FROM trace_events
UNION ALL
SELECT * FROM log_events
UNION ALL
SELECT * FROM metric_anomalies
ORDER BY timestamp ASC;
```

## Automated Timeline Generation

Build a Python script that generates the timeline automatically:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class TimelineEntry:
    timestamp: datetime
    signal_type: str       # "trace", "log", "metric"
    service: str
    event: str
    severity: str          # "info", "warning", "critical"
    trace_id: Optional[str]
    details: dict

class IncidentTimelineBuilder:
    """
    Builds a unified security incident timeline from
    correlated OpenTelemetry traces, logs, and metrics.
    """

    def __init__(self, backend_client):
        self.client = backend_client
        self.entries = []

    def build_timeline(self, start_time, end_time, filters):
        """
        Query all three signal types and merge them
        into a single ordered timeline.
        """
        # Gather traces
        traces = self.client.query_traces(
            start_time=start_time,
            end_time=end_time,
            filters=filters,
        )
        for span in traces:
            severity = self.classify_span_severity(span)
            self.entries.append(TimelineEntry(
                timestamp=span.start_time,
                signal_type="trace",
                service=span.resource_attrs.get("service.name", "unknown"),
                event=f"{span.attrs.get('http.method', '')} "
                      f"{span.attrs.get('http.path', span.name)}",
                severity=severity,
                trace_id=span.trace_id,
                details={
                    "span_name": span.name,
                    "status_code": span.attrs.get("http.status_code"),
                    "authz_decision": span.attrs.get("authz.decision"),
                    "duration_ms": span.duration_ms,
                    "user_id": span.attrs.get("user.id"),
                },
            ))

        # Gather logs
        logs = self.client.query_logs(
            start_time=start_time,
            end_time=end_time,
            filters=filters,
        )
        for log in logs:
            self.entries.append(TimelineEntry(
                timestamp=log.timestamp,
                signal_type="log",
                service=log.resource_attrs.get("service.name", "unknown"),
                event=log.body,
                severity=self.map_log_severity(log.severity),
                trace_id=log.trace_id,
                details=log.attributes,
            ))

        # Gather anomalous metrics
        metric_anomalies = self.client.query_metrics(
            start_time=start_time,
            end_time=end_time,
            metric_names=[
                "auth.jwt.validations",
                "authz.denials",
                "security.large_response.count",
            ],
        )
        for m in metric_anomalies:
            self.entries.append(TimelineEntry(
                timestamp=m.timestamp,
                signal_type="metric",
                service=m.resource_attrs.get("service.name", "unknown"),
                event=f"Metric spike: {m.name} = {m.value}",
                severity="warning",
                trace_id=None,
                details={"metric_name": m.name, "value": m.value},
            ))

        # Sort by timestamp
        self.entries.sort(key=lambda e: e.timestamp)
        return self.entries

    def classify_span_severity(self, span):
        if span.attrs.get("authz.decision") == "deny":
            return "warning"
        if span.status_code == "ERROR":
            return "critical"
        if span.attrs.get("http.status_code", 200) >= 400:
            return "warning"
        return "info"

    def map_log_severity(self, severity):
        mapping = {
            "ERROR": "critical",
            "WARN": "warning",
            "WARNING": "warning",
            "INFO": "info",
        }
        return mapping.get(severity, "info")

    def render_markdown(self):
        """Render the timeline as a markdown report."""
        lines = ["# Security Incident Timeline\n"]
        current_service = None

        for entry in self.entries:
            timestamp_str = entry.timestamp.strftime("%H:%M:%S.%f")[:-3]
            icon = {
                "info": "[INFO]",
                "warning": "[WARN]",
                "critical": "[CRIT]",
            }[entry.severity]

            line = (
                f"| {timestamp_str} | {icon} | "
                f"{entry.service} | {entry.signal_type} | "
                f"{entry.event} |"
            )
            lines.append(line)

        return "\n".join(lines)
```

## Using the Timeline Builder

```python
builder = IncidentTimelineBuilder(backend_client)

timeline = builder.build_timeline(
    start_time="2026-02-05T14:00:00Z",
    end_time="2026-02-05T18:00:00Z",
    filters={
        "user.id": "compromised-user-123",
    },
)

# Generate the report
report = builder.render_markdown()
print(report)
```

## Summary

A security incident timeline is only as good as the data it is built from. When your traces, logs, and metrics all flow through OpenTelemetry with proper correlation (trace IDs, span IDs, resource attributes), building the timeline becomes a query problem rather than a data collection problem. The unified correlation model means you can see the complete sequence of events across all your services, from the initial suspicious activity through the full chain of actions, all ordered by timestamp and linked by trace context.
