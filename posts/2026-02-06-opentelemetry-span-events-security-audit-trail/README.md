# How to Use OpenTelemetry Span Events to Record Security Audit Trail Entries for Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Audit Trail, Compliance, Security

Description: Use OpenTelemetry span events to build a structured security audit trail that satisfies compliance requirements like SOC 2 and HIPAA.

Compliance frameworks like SOC 2, HIPAA, and PCI DSS require organizations to maintain detailed audit trails of security-relevant actions. Who accessed what data, when, and from where. Traditionally, audit logging is implemented as a separate system with its own SDK, database, and retention policies. But if you are already using OpenTelemetry for observability, you can leverage span events to build your audit trail directly within your existing telemetry pipeline.

## Why Span Events for Audit Trails

Span events are timestamped records attached to a specific span. They inherit the span's trace context, which means every audit entry is automatically correlated with the request that triggered it. You get the "who, what, when, where" of the action plus the full context of how it happened (the trace).

The advantages over a standalone audit log system:

- Audit entries are linked to traces, so you can jump from an audit finding to the full request context.
- No separate SDK or library to maintain.
- Same export pipeline, same retention policies, same query interface.
- Structured attributes make the data machine-queryable.

## Defining an Audit Event Schema

Before writing code, define a consistent schema for your audit events. Here is one that covers most compliance requirements:

```python
# audit_schema.py
# Consistent attribute names for audit events

AUDIT_EVENT_NAME = "audit.action"

# Required fields for every audit event
AUDIT_ATTRS = {
    "audit.action": "",           # e.g., "data.read", "user.create", "config.update"
    "audit.actor.id": "",         # User ID or service account
    "audit.actor.type": "",       # "user", "service", "system"
    "audit.actor.ip": "",         # Source IP address
    "audit.resource.type": "",    # e.g., "patient_record", "api_key", "user_account"
    "audit.resource.id": "",      # Identifier of the affected resource
    "audit.result": "",           # "success", "denied", "error"
    "audit.reason": "",           # Why the action was denied or failed
    "audit.data_classification": "",  # "public", "internal", "confidential", "restricted"
}
```

## Building the Audit Logger

Create a helper class that makes it easy to record audit events with the right attributes:

```python
from opentelemetry import trace
from datetime import datetime, timezone

class AuditLogger:
    """
    Records audit trail entries as OpenTelemetry span events.
    Each entry is attached to the current active span and
    includes all required compliance fields.
    """

    @staticmethod
    def record(action, resource_type, resource_id, result,
               actor_id=None, actor_type="user", actor_ip=None,
               data_classification="internal", reason="", extra_attrs=None):
        """
        Record an audit event on the current span.

        Args:
            action: The action performed (e.g., "data.read")
            resource_type: Type of resource acted upon
            resource_id: ID of the resource
            result: Outcome - "success", "denied", or "error"
            actor_id: Who performed the action
            actor_type: Type of actor - "user", "service", "system"
            actor_ip: IP address of the actor
            data_classification: Data sensitivity level
            reason: Explanation if denied or error
            extra_attrs: Additional attributes specific to this event
        """
        span = trace.get_current_span()
        if not span.is_recording():
            return

        attributes = {
            "audit.action": action,
            "audit.actor.id": actor_id or "unknown",
            "audit.actor.type": actor_type,
            "audit.actor.ip": actor_ip or "unknown",
            "audit.resource.type": resource_type,
            "audit.resource.id": str(resource_id),
            "audit.result": result,
            "audit.reason": reason,
            "audit.data_classification": data_classification,
            "audit.timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if extra_attrs:
            for key, value in extra_attrs.items():
                attributes[f"audit.{key}"] = str(value)

        span.add_event("audit.action", attributes=attributes)

        # Also set span-level attributes for easier querying
        span.set_attribute("audit.has_audit_events", True)
        span.set_attribute(f"audit.last_action", action)
        span.set_attribute(f"audit.last_result", result)
```

## Using the Audit Logger in Your Application

Here is how you would use this in a healthcare application that needs HIPAA-compliant audit trails:

```python
from flask import Flask, request, g
from audit_logger import AuditLogger

app = Flask(__name__)
tracer = trace.get_tracer("patient-records-service")

@app.route("/api/patients/<patient_id>", methods=["GET"])
def get_patient(patient_id):
    with tracer.start_as_current_span("get_patient") as span:
        user = g.current_user

        # Check authorization before accessing the record
        if not user.has_permission("patient:read", patient_id):
            AuditLogger.record(
                action="patient_record.read",
                resource_type="patient_record",
                resource_id=patient_id,
                result="denied",
                actor_id=user.id,
                actor_ip=request.remote_addr,
                data_classification="restricted",
                reason="insufficient_permissions",
                extra_attrs={
                    "required_permission": "patient:read",
                    "user_roles": ",".join(user.roles),
                }
            )
            return {"error": "Access denied"}, 403

        # Fetch the patient record
        patient = db.get_patient(patient_id)

        # Record successful access
        AuditLogger.record(
            action="patient_record.read",
            resource_type="patient_record",
            resource_id=patient_id,
            result="success",
            actor_id=user.id,
            actor_ip=request.remote_addr,
            data_classification="restricted",
            extra_attrs={
                "fields_accessed": "name,dob,diagnosis,medications",
            }
        )

        return patient.to_dict()


@app.route("/api/patients/<patient_id>", methods=["PUT"])
def update_patient(patient_id):
    with tracer.start_as_current_span("update_patient") as span:
        user = g.current_user
        changes = request.json

        # Record what fields are being modified
        AuditLogger.record(
            action="patient_record.update",
            resource_type="patient_record",
            resource_id=patient_id,
            result="success",
            actor_id=user.id,
            actor_ip=request.remote_addr,
            data_classification="restricted",
            extra_attrs={
                "fields_modified": ",".join(changes.keys()),
                "modification_reason": changes.get("reason", "not_provided"),
            }
        )

        db.update_patient(patient_id, changes)
        return {"status": "updated"}
```

## Collector Configuration for Audit Retention

Compliance often requires longer retention for audit data. Use the Collector to route audit events to a separate storage backend with appropriate retention:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Filter spans that contain audit events
  filter/audit:
    traces:
      include:
        match_type: strict
        attributes:
          - key: audit.has_audit_events
            value: true

exporters:
  # Regular observability backend (30-day retention)
  otlp/observability:
    endpoint: "https://otel-backend:4317"

  # Long-term audit storage (7-year retention for compliance)
  otlp/audit:
    endpoint: "https://audit-storage:4317"

service:
  pipelines:
    traces/all:
      receivers: [otlp]
      exporters: [otlp/observability]
    traces/audit:
      receivers: [otlp]
      processors: [filter/audit]
      exporters: [otlp/audit, otlp/observability]
```

## Querying for Compliance Reports

Generate compliance reports by querying your audit events:

```sql
-- All access to restricted data in the last 30 days
SELECT
  events.attributes['audit.actor.id'] AS actor,
  events.attributes['audit.action'] AS action,
  events.attributes['audit.resource.type'] AS resource_type,
  events.attributes['audit.resource.id'] AS resource_id,
  events.attributes['audit.result'] AS result,
  events.timestamp
FROM span_events events
WHERE
  events.name = 'audit.action'
  AND events.attributes['audit.data_classification'] = 'restricted'
  AND events.timestamp > NOW() - INTERVAL '30 days'
ORDER BY events.timestamp DESC;
```

## Summary

OpenTelemetry span events provide a natural way to implement audit trails that are automatically correlated with your application traces. Instead of maintaining a separate audit logging system, you get structured, queryable audit data that flows through your existing telemetry pipeline. The key is defining a consistent schema for your audit attributes and using the Collector to route audit data to long-term storage that meets your compliance retention requirements.
