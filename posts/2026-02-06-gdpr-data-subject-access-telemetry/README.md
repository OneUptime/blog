# How to Implement GDPR Data Subject Access Requests for Telemetry Data in OpenTelemetry Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GDPR, Data Privacy, Compliance

Description: Implement GDPR data subject access and deletion requests for telemetry data flowing through OpenTelemetry pipelines.

Under GDPR, data subjects have the right to request all personal data your organization holds about them (Article 15) and the right to request deletion of that data (Article 17). Most teams handle these requests for their application databases but completely forget about telemetry data. If your OpenTelemetry traces and logs contain user identifiers, email addresses, or IP addresses, that telemetry data falls under GDPR scope.

This guide covers how to design your OpenTelemetry pipeline so you can actually fulfill Data Subject Access Requests (DSARs) and deletion requests for telemetry data.

## The Problem: Telemetry Data as Personal Data

GDPR defines personal data broadly. Any information that can identify a natural person counts. In a typical OpenTelemetry setup, the following attributes are personal data:

- `enduser.id` mapped to a real person
- IP addresses in `net.peer.ip` or `http.client_ip`
- Email addresses appearing in span attributes or log messages
- Session tokens or cookies that can be linked back to users

If you cannot find and extract (or delete) all telemetry records for a specific user, you have a GDPR compliance gap.

## Strategy 1: Pseudonymize at Ingestion

The simplest approach is to pseudonymize personal data before it enters your telemetry pipeline. Replace direct identifiers with pseudonymous tokens and maintain a separate, access-controlled mapping table.

Here is a Python span processor that pseudonymizes user identifiers:

```python
# Pseudonymize user identifiers in spans before export
import hashlib
import hmac
from opentelemetry.sdk.trace.export import SpanExporter

# This secret should come from a secrets manager, not hardcoded
PSEUDONYM_SECRET = get_secret("telemetry-pseudonym-key")

# Attributes that contain personal data
PERSONAL_ATTRIBUTES = [
    "enduser.id",
    "enduser.email",
    "user.email",
    "http.client_ip",
    "net.peer.ip",
]

def pseudonymize(value):
    """Create a consistent pseudonym for a personal data value.
    Same input always produces the same output, which is critical
    for being able to search telemetry by pseudonymized ID later."""
    return hmac.new(
        PSEUDONYM_SECRET.encode(),
        str(value).encode(),
        hashlib.sha256
    ).hexdigest()[:16]

class PseudonymizingExporter:
    """Wraps a SpanExporter to pseudonymize personal data."""

    def __init__(self, delegate, mapping_store):
        self._delegate = delegate
        self._mapping = mapping_store  # Stores real_value -> pseudonym

    def export(self, spans):
        for span in spans:
            for attr_key in PERSONAL_ATTRIBUTES:
                if attr_key in span.attributes:
                    original = span.attributes[attr_key]
                    pseudo = pseudonymize(original)
                    # Store the mapping for DSAR lookups
                    self._mapping.store(original, pseudo, attr_key)
                    span.attributes[attr_key] = pseudo
        return self._delegate.export(spans)
```

## Strategy 2: Tag and Index for Retrieval

If pseudonymization is not feasible for your use case (some teams need real user IDs for debugging), you need to ensure telemetry data is tagged and indexed so you can retrieve all records for a specific user.

Configure your collector to add consistent indexing attributes:

```yaml
# otel-collector-gdpr.yaml - Add indexing attributes for DSAR support
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Ensure all personal data attributes use canonical names
  # so you can search across services consistently
  attributes/normalize_pii:
    actions:
      # Normalize various user ID attribute names to a single key
      - key: gdpr.data_subject_id
        from_attribute: enduser.id
        action: upsert
      - key: gdpr.data_subject_id
        from_attribute: user.id
        action: upsert
      # Tag with data category for easier DSAR processing
      - key: gdpr.contains_personal_data
        value: "true"
        action: upsert
      # Tag with retention category
      - key: gdpr.retention_category
        value: "personal_telemetry"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: https://oneuptime.example.com:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/normalize_pii, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [attributes/normalize_pii, batch]
      exporters: [otlp]
```

## Building the DSAR Fulfillment Query

When a DSAR comes in, you need to find all telemetry records associated with a data subject. With the normalized `gdpr.data_subject_id` attribute, this becomes a straightforward query.

Here is an example query to extract all telemetry data for a specific user:

```sql
-- DSAR data extraction query
-- Returns all traces and logs associated with a data subject
-- Export results as JSON for inclusion in the DSAR response

-- Step 1: Find all trace IDs involving this user
WITH user_traces AS (
    SELECT DISTINCT trace_id
    FROM spans
    WHERE attributes['gdpr.data_subject_id'] = 'user-12345'
)

-- Step 2: Get complete traces (including spans without the user attribute,
-- since they may be part of the same request flow)
SELECT
    s.trace_id,
    s.span_id,
    s.name AS operation,
    s.start_time,
    s.end_time,
    s.attributes
FROM spans s
INNER JOIN user_traces ut ON s.trace_id = ut.trace_id
ORDER BY s.start_time;
```

## Implementing Right to Erasure (Article 17)

Deletion is harder than retrieval. Most telemetry backends are not designed for targeted record deletion. You have a few options:

1. **Pseudonymize, then destroy the key**: If you used the pseudonymization approach, deleting the mapping entry for a user effectively anonymizes all their telemetry data. Without the mapping, the pseudonymized data can no longer be linked to a person.

2. **TTL-based retention**: Set aggressive retention periods on personal telemetry data. If you keep telemetry for 30 days, you can respond to deletion requests by confirming the data will be purged within 30 days. GDPR allows reasonable timeframes.

3. **Selective deletion API**: Some backends support deletion by attribute. Build an automation script:

```python
# DSAR deletion automation script
import requests

def delete_user_telemetry(user_id, backend_url, api_key):
    """Delete all telemetry data for a specific data subject."""

    # Step 1: Invalidate the pseudonym mapping
    mapping_store.delete_mapping(user_id)

    # Step 2: If backend supports deletion, issue delete requests
    response = requests.post(
        f"{backend_url}/api/v1/delete",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "filter": {
                "attribute": "gdpr.data_subject_id",
                "value": user_id,
            },
            "signals": ["traces", "logs"],
        },
    )

    # Step 3: Log the DSAR fulfillment for compliance records
    # (This log itself should not contain the user's personal data)
    audit_logger.info(
        "DSAR deletion completed",
        extra={
            "dsar.type": "erasure",
            "dsar.request_id": generate_dsar_id(),
            "dsar.signals_deleted": ["traces", "logs"],
            "dsar.status": "completed" if response.ok else "partial",
        },
    )
    return response.ok
```

## Keeping a DSAR Processing Record

GDPR requires you to document how you handle DSARs. Use OpenTelemetry itself to trace your DSAR processing workflow so you have an audit trail of compliance actions taken.

## Key Points

GDPR compliance for telemetry data is not optional if your spans and logs contain personal data. The cleanest approach is pseudonymization at the SDK level with a controlled mapping table. If that is not possible, normalize your personal data attributes and index them so you can run DSAR queries efficiently. For deletion, either destroy pseudonym mappings or use TTL-based retention with a clear policy. Whichever approach you choose, document it and test it before a DSAR actually arrives.
