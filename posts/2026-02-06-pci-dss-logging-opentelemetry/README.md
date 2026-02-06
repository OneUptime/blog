# How to Use OpenTelemetry to Meet PCI-DSS Logging and Monitoring Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PCI-DSS, Logging, Security Monitoring

Description: Configure OpenTelemetry to satisfy PCI-DSS requirements for logging, monitoring, and audit trails in payment systems.

PCI-DSS v4.0 has specific requirements around logging and monitoring that apply to any system handling cardholder data. Requirements 10.1 through 10.7 spell out exactly what you need: audit trails for access to cardholder data, tamper-evident logs, daily log reviews, and retention for at least 12 months. If you are already running OpenTelemetry in your payment infrastructure, you can map these requirements directly to your telemetry pipeline.

This post walks through the PCI-DSS logging requirements and shows how to configure OpenTelemetry to satisfy each one.

## Mapping PCI-DSS Requirements to OpenTelemetry Capabilities

Here is how the key PCI-DSS Requirement 10 sub-requirements map to OpenTelemetry features:

- **10.2.1** - Audit trails for individual user access to cardholder data: Use trace spans with `enduser.id` attributes
- **10.2.2** - Actions taken by anyone with root or admin privileges: Span attributes tracking elevated privilege usage
- **10.2.4** - Invalid logical access attempts: Log records for authentication failures
- **10.2.5** - Changes to identification and authentication mechanisms: Audit spans for auth config changes
- **10.3** - Record specific fields for each event: OpenTelemetry attributes cover user ID, event type, timestamp, success/failure, origination, and resource identity
- **10.5** - Secure audit trails against modification: Collector routing to append-only storage
- **10.7** - Retain audit trail history for at least 12 months: Retention policies on your backend

## Instrumenting Cardholder Data Access

Every access to cardholder data needs a trace span with the fields PCI-DSS Requirement 10.3 mandates. Here is how to instrument a payment service endpoint:

```python
# Instrument cardholder data access with PCI-DSS required fields
from opentelemetry import trace
from datetime import datetime, timezone

tracer = trace.get_tracer("payment-service")

def get_card_details(request, card_token):
    with tracer.start_as_current_span("cardholder_data.access") as span:
        # PCI-DSS 10.3.1 - User identification
        span.set_attribute("enduser.id", request.user.id)
        span.set_attribute("enduser.role", request.user.role)

        # PCI-DSS 10.3.2 - Type of event
        span.set_attribute("pci.event_type", "cardholder_data_read")

        # PCI-DSS 10.3.3 - Date and time (automatic via span timestamps)

        # PCI-DSS 10.3.4 - Success or failure indication
        try:
            result = vault_service.retrieve(card_token)
            span.set_attribute("pci.outcome", "success")
            # Never put actual card data in span attributes
            span.set_attribute("pci.card_token", card_token)
            span.set_attribute("pci.card_last_four", result.last_four)
            return result
        except PermissionError:
            span.set_attribute("pci.outcome", "failure")
            span.set_attribute("pci.failure_reason", "access_denied")
            raise

        # PCI-DSS 10.3.5 - Origination of event
        span.set_attribute("pci.source_ip", request.client_ip)
        span.set_attribute("pci.source_service", "checkout-api")

        # PCI-DSS 10.3.6 - Identity of affected resource
        span.set_attribute("pci.resource_type", "cardholder_data")
        span.set_attribute("pci.resource_id", card_token)
```

## Logging Authentication Failures (Requirement 10.2.4)

PCI-DSS requires you to log all failed authentication attempts. Use OpenTelemetry's Logs SDK to capture these:

```python
# Log authentication failures with PCI-DSS required context
import logging
from opentelemetry import trace

logger = logging.getLogger("pci.auth")

def authenticate_user(username, password, source_ip):
    result = auth_service.verify(username, password)

    if not result.success:
        # Get the current trace context for correlation
        current_span = trace.get_current_span()
        trace_id = current_span.get_span_context().trace_id

        logger.warning(
            "Authentication failure for user attempting access to CDE",
            extra={
                "pci.event_type": "auth_failure",
                "pci.username": username,
                "pci.source_ip": source_ip,
                "pci.failure_reason": result.reason,
                "pci.cde_zone": "payment-processing",
                "pci.attempt_count": get_recent_attempt_count(username),
                "trace_id": format(trace_id, "032x"),
            },
        )
    return result
```

## Collector Configuration for PCI-DSS Compliance

The collector configuration needs to handle several PCI-DSS requirements at once: filtering PCI-relevant events, ensuring card numbers never appear in telemetry, and routing to compliant storage.

This configuration covers PCI data scrubbing and audit routing:

```yaml
# otel-collector-pci.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # PCI-DSS 10.5 - Strip any accidental cardholder data from telemetry
  transform/pci_scrub:
    trace_statements:
      - context: span
        statements:
          # Remove anything that looks like a PAN (Primary Account Number)
          - replace_pattern(attributes["db.statement"],
              "[0-9]{13,19}", "[PAN-REDACTED]")
          - replace_pattern(attributes["http.request.body"],
              "[0-9]{13,19}", "[PAN-REDACTED]")
          # Delete attributes that should never exist
          - delete_key(attributes, "card.number")
          - delete_key(attributes, "card.cvv")
          - delete_key(attributes, "card.expiry")
    log_statements:
      - context: log
        statements:
          - replace_pattern(body,
              "[0-9]{13,19}", "[PAN-REDACTED]")

  # Route PCI audit events to dedicated storage
  filter/pci_audit:
    spans:
      include:
        match_type: regexp
        attributes:
          - key: pci.event_type
            value: ".*"

  batch:
    timeout: 5s
    send_batch_size: 200

exporters:
  # PCI audit store with TLS and mutual authentication
  otlphttp/pci_audit:
    endpoint: https://pci-audit-store.internal:4318
    tls:
      cert_file: /etc/ssl/pci/collector.crt
      key_file: /etc/ssl/pci/collector.key
      ca_file: /etc/ssl/pci/ca.crt

  # General observability backend
  otlp/general:
    endpoint: https://oneuptime.example.com:4317

service:
  pipelines:
    traces/pci_audit:
      receivers: [otlp]
      processors: [transform/pci_scrub, filter/pci_audit, batch]
      exporters: [otlphttp/pci_audit]

    traces/general:
      receivers: [otlp]
      processors: [transform/pci_scrub, batch]
      exporters: [otlp/general]

    logs:
      receivers: [otlp]
      processors: [transform/pci_scrub, batch]
      exporters: [otlphttp/pci_audit, otlp/general]
```

## Setting Up Daily Log Reviews (Requirement 10.4)

PCI-DSS requires daily reviews of logs for security events. You can automate the initial triage by querying your telemetry backend for anomalies and generating a daily summary.

A simple daily report query that flags items requiring human review:

```sql
-- Daily PCI log review query
-- Run this as a scheduled job and send results to the security team
SELECT
    DATE(timestamp) AS review_date,
    attributes['pci.event_type'] AS event_type,
    COUNT(*) AS occurrence_count,
    COUNT(DISTINCT attributes['enduser.id']) AS unique_users,
    COUNT(CASE WHEN attributes['pci.outcome'] = 'failure' THEN 1 END) AS failures
FROM audit_spans
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day'
    AND attributes['pci.event_type'] IS NOT NULL
GROUP BY DATE(timestamp), attributes['pci.event_type']
HAVING COUNT(CASE WHEN attributes['pci.outcome'] = 'failure' THEN 1 END) > 0
ORDER BY failures DESC;
```

## Retention Configuration (Requirement 10.7)

PCI-DSS requires at least 12 months of audit trail retention, with at least 3 months immediately available for analysis. Configure your backend storage with tiered retention to satisfy this:

- **Hot tier (0-3 months)**: Full queryable access in your observability platform
- **Warm tier (3-12 months)**: Compressed storage, queryable with slightly higher latency
- **Archive (12+ months)**: Object storage with retrieval capability for investigations

## Summary

PCI-DSS logging requirements are prescriptive, which actually makes them straightforward to implement with OpenTelemetry. The key steps are: instrument cardholder data access points with the required attributes, scrub PANs at the collector level as a safety net, route audit events to tamper-evident storage, and set up automated daily reviews. The structured nature of OpenTelemetry data makes it far easier to satisfy auditors than unstructured syslog ever was.
