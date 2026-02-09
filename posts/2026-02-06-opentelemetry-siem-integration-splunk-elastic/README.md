# How to Integrate OpenTelemetry Traces and Logs with Your SIEM Platform (Splunk, Elastic SIEM, Sumo Logic)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SIEM, Splunk, Elastic SIEM

Description: Integrate OpenTelemetry traces and logs with SIEM platforms like Splunk and Elastic SIEM for unified security and observability analysis.

Security teams work in SIEM platforms. Engineering teams work in observability tools. When an incident happens, these two worlds need to connect. OpenTelemetry can bridge this gap by sending enriched traces and logs to your SIEM alongside your observability backend, giving security analysts the application context they need without leaving their tools.

## Why Send OpenTelemetry Data to a SIEM

SIEM platforms excel at correlation, alerting, and compliance reporting. But they typically receive network logs, firewall events, and system logs, not application-level traces. By sending OpenTelemetry data to your SIEM, you add the application layer: which user performed an action, what service handled it, how long it took, and what the outcome was.

## Collector Configuration for Dual Export

The OpenTelemetry Collector is the central piece. Configure it to send data to both your observability backend and your SIEM:

```yaml
# otel-collector-siem.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 512
    timeout: 5s

  # Filter to only send security-relevant spans to SIEM
  filter/security:
    traces:
      include:
        match_type: regexp
        span_names:
          - "security\\..*"
          - "auth\\..*"
          - "api\\.access\\..*"
    logs:
      include:
        match_type: regexp
        bodies:
          - ".*authentication.*"
          - ".*authorization.*"
          - ".*access denied.*"

  # Transform trace data into a format SIEMs understand
  transform/siem:
    trace_statements:
      - context: span
        statements:
          - set(attributes["siem.source"], "opentelemetry")
          - set(attributes["siem.source_type"], "application_trace")

exporters:
  # Primary observability backend
  otlp/observability:
    endpoint: observability-backend:4317

  # Splunk HEC exporter
  splunk_hec/traces:
    token: "${SPLUNK_HEC_TOKEN}"
    endpoint: "https://splunk-hec.example.com:8088/services/collector"
    source: "opentelemetry"
    sourcetype: "otel:traces"
    index: "security_traces"

  splunk_hec/logs:
    token: "${SPLUNK_HEC_TOKEN}"
    endpoint: "https://splunk-hec.example.com:8088/services/collector"
    source: "opentelemetry"
    sourcetype: "otel:logs"
    index: "security_logs"

  # Elasticsearch exporter for Elastic SIEM
  elasticsearch:
    endpoints:
      - "https://elasticsearch.example.com:9200"
    traces_index: "otel-security-traces"
    logs_index: "otel-security-logs"
    user: "${ES_USER}"
    password: "${ES_PASSWORD}"

service:
  pipelines:
    # All traces go to observability backend
    traces/observability:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/observability]

    # Security-filtered traces go to SIEM
    traces/siem:
      receivers: [otlp]
      processors: [filter/security, transform/siem, batch]
      exporters: [splunk_hec/traces]

    # Security logs go to both
    logs/siem:
      receivers: [otlp]
      processors: [filter/security, batch]
      exporters: [splunk_hec/logs, elasticsearch]
```

## Enriching Logs with Trace Context

For SIEM correlation to work, your logs need trace IDs. Here is how to configure structured logging with trace context:

```python
# structured_logging.py
import logging
import json
from opentelemetry import trace

class OTelLogFormatter(logging.Formatter):
    """Log formatter that includes OpenTelemetry trace context."""

    def format(self, record):
        span = trace.get_current_span()
        span_context = span.get_span_context() if span else None

        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "service": "my-service",
        }

        # Add trace context if available
        if span_context and span_context.is_valid:
            log_entry["trace_id"] = format(span_context.trace_id, '032x')
            log_entry["span_id"] = format(span_context.span_id, '016x')
            log_entry["trace_flags"] = span_context.trace_flags

        # Add security-relevant fields
        if hasattr(record, "security_event"):
            log_entry["security"] = record.security_event

        return json.dumps(log_entry)

# Configure the logger
handler = logging.StreamHandler()
handler.setFormatter(OTelLogFormatter())
security_logger = logging.getLogger("security")
security_logger.addHandler(handler)
security_logger.setLevel(logging.INFO)
```

## Emitting Security Events as Structured Logs

```python
# security_events.py
def log_security_event(event_type: str, details: dict):
    """Emit a security event that will be routed to the SIEM."""
    record = security_logger.makeRecord(
        "security", logging.WARNING, "", 0,
        f"Security event: {event_type}", (), None
    )
    record.security_event = {
        "event_type": event_type,
        **details,
    }
    security_logger.handle(record)

# Usage in auth handler
def on_login_failure(username: str, source_ip: str, reason: str):
    log_security_event("auth.login.failed", {
        "username": username,
        "source_ip": source_ip,
        "reason": reason,
    })

def on_permission_denied(user_id: str, resource: str, action: str):
    log_security_event("authz.denied", {
        "user_id": user_id,
        "resource": resource,
        "action": action,
    })
```

## Sumo Logic Integration

For Sumo Logic, use the HTTP source exporter:

```yaml
exporters:
  sumologic:
    endpoint: "https://endpoint.collection.sumologic.com/receiver/v1/http/"
    source_name: "opentelemetry"
    source_category: "security/otel"
    compress_encoding: gzip
```

## SIEM Correlation Rules

Once the data is in your SIEM, create correlation rules that use both traditional security data and OpenTelemetry context. For example, a Splunk search that correlates firewall blocks with application traces:

```
index=security_traces sourcetype="otel:traces"
| join trace_id [search index=firewall action=blocked]
| stats count by security.source_ip, span_name, service.name
```

This gives security analysts the ability to see which application endpoint was being targeted when the firewall blocked a request, providing context that pure network data cannot deliver.

## Key Takeaways

The integration between OpenTelemetry and your SIEM is about giving security teams visibility into the application layer without requiring them to learn a new tool. The Collector handles the routing and filtering so you only send security-relevant data to the SIEM, keeping costs manageable while providing the enriched context that improves incident response.
