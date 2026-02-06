# How to Build a SOC 2 Audit Trail from OpenTelemetry Traces and Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SOC 2, Audit Trail, Compliance

Description: Learn how to build a complete SOC 2 audit trail using OpenTelemetry traces and logs to satisfy auditor requirements.

SOC 2 audits demand that your organization can demonstrate who accessed what, when, and what changes were made. Most teams scramble to piece together audit trails from fragmented log sources right before an audit. If you already have OpenTelemetry instrumented across your services, you are sitting on a goldmine of structured telemetry data that can serve as the backbone of your audit trail.

This guide walks through how to structure your OpenTelemetry traces and logs so they satisfy SOC 2 Trust Services Criteria, specifically CC6.1 (logical access security) and CC7.2 (system monitoring).

## What SOC 2 Auditors Actually Want

Auditors are not looking for raw log dumps. They want evidence that your system records:

- **User identity** for every significant action
- **Timestamps** with consistent timezone handling
- **What changed** including before/after states where applicable
- **Access patterns** showing who accessed sensitive resources
- **Anomaly detection** proving you monitor for unauthorized access

OpenTelemetry gives you the primitives to capture all of this in a structured, queryable format.

## Enriching Spans with Audit-Relevant Attributes

The first step is making sure every span that represents a security-relevant operation carries the right attributes. OpenTelemetry semantic conventions already define many of these, but you will need to add custom attributes for audit-specific fields.

Here is an example of instrumenting an API endpoint that modifies user permissions:

```python
# Python example: Adding audit-relevant attributes to spans
from opentelemetry import trace

tracer = trace.get_tracer("audit-service")

def update_user_role(request, user_id, new_role):
    with tracer.start_as_current_span("user.role.update") as span:
        # Identity attributes - who performed the action
        span.set_attribute("enduser.id", request.authenticated_user.id)
        span.set_attribute("enduser.role", request.authenticated_user.role)
        span.set_attribute("enduser.ip", request.client_ip)

        # Action attributes - what was changed
        span.set_attribute("audit.action", "role_update")
        span.set_attribute("audit.target_user", user_id)
        span.set_attribute("audit.old_value", get_current_role(user_id))
        span.set_attribute("audit.new_value", new_role)
        span.set_attribute("audit.resource_type", "user_permission")

        # Perform the actual update
        result = permission_service.update_role(user_id, new_role)

        span.set_attribute("audit.result", "success" if result else "failure")
        return result
```

Every span now carries enough context for an auditor to reconstruct exactly what happened.

## Configuring the Collector for Audit Log Extraction

You do not want audit data mixed in with your regular observability telemetry. Use the OpenTelemetry Collector to route audit-relevant spans to a dedicated, tamper-evident store.

This collector configuration filters spans with audit attributes and exports them to a separate backend:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Filter processor to identify audit-relevant spans
  filter/audit:
    spans:
      include:
        match_type: regexp
        attributes:
          - key: audit.action
            value: ".*"

  # Add a timestamp in ISO 8601 for auditor readability
  attributes/audit_metadata:
    actions:
      - key: audit.collector_received_at
        action: insert
        value: ""
      - key: audit.pipeline
        value: "soc2-audit-trail"
        action: insert

  # Batch for performance
  batch:
    timeout: 5s
    send_batch_size: 100

exporters:
  # Primary audit store - append-only, tamper-evident
  otlphttp/audit:
    endpoint: https://audit-store.internal:4318
    headers:
      X-Audit-Pipeline: "soc2"

  # Regular observability backend
  otlp/observability:
    endpoint: https://oneuptime.example.com:4317

service:
  pipelines:
    # Audit pipeline - only audit-tagged spans
    traces/audit:
      receivers: [otlp]
      processors: [filter/audit, attributes/audit_metadata, batch]
      exporters: [otlphttp/audit]

    # Regular pipeline - all spans
    traces/default:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/observability]
```

## Structured Audit Logs via the Logs Signal

Traces cover request-level operations, but SOC 2 also requires system-level audit logs for things like service startup, configuration changes, and authentication events. Use the OpenTelemetry Logs SDK to emit structured audit log records.

Here is how to emit a structured audit log when a configuration change is detected:

```python
# Emit structured audit logs for system-level events
import logging
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LogRecord
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Set up the logger provider
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter())
)
set_logger_provider(logger_provider)

logger = logging.getLogger("audit.system")

def on_config_change(old_config, new_config, changed_by):
    logger.info(
        "System configuration changed",
        extra={
            "audit.action": "config_change",
            "audit.changed_by": changed_by,
            "audit.config_keys_modified": list(
                set(new_config.keys()) - set(old_config.keys())
            ),
            "audit.change_source": "admin_api",
            "audit.severity": "high",
        },
    )
```

## Making the Audit Trail Tamper-Evident

SOC 2 requires that audit logs cannot be modified after the fact. A few practical steps:

1. **Write-once storage**: Export audit spans and logs to an append-only data store or an object store with object lock enabled (like S3 with Object Lock).
2. **Hash chaining**: Compute a running hash of audit records so any gap or modification is detectable.
3. **Separate access controls**: The audit store should have different IAM policies than your regular telemetry backend. Engineers should have read access but not write or delete access.

## Querying the Audit Trail During an Audit

When the auditor asks "show me all permission changes in the last 90 days," you can query your audit backend by the `audit.action` attribute:

```sql
-- Example query against a trace-backed audit store
SELECT
    timestamp,
    attributes['enduser.id'] AS actor,
    attributes['audit.target_user'] AS target,
    attributes['audit.old_value'] AS previous_role,
    attributes['audit.new_value'] AS new_role,
    attributes['audit.result'] AS outcome
FROM audit_spans
WHERE attributes['audit.action'] = 'role_update'
    AND timestamp >= NOW() - INTERVAL '90 days'
ORDER BY timestamp DESC;
```

This is the kind of structured, queryable evidence that makes auditors happy.

## Key Takeaways

Building a SOC 2 audit trail on top of OpenTelemetry is not just possible - it is a genuinely good architecture choice. You get structured data, correlation across services via trace IDs, and a pipeline you can version-control and test. The main thing is to be intentional about which attributes you attach and to route audit data to a store with the right access controls and retention policies.

Start by identifying your security-relevant operations, instrument them with audit attributes, configure a dedicated collector pipeline, and point it at tamper-evident storage. Your next SOC 2 audit will go much more smoothly.
