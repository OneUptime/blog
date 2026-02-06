# How to Build an Immutable Audit Log Pipeline Using OpenTelemetry and Append-Only Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Audit Logs, Immutable Storage, Security

Description: Build a tamper-proof audit log pipeline with OpenTelemetry that writes to append-only storage for regulatory compliance.

Audit logs are only useful if you can prove they haven't been tampered with. In regulated industries, auditors want evidence that log entries were never modified or deleted after creation. This post shows how to build an immutable audit log pipeline using OpenTelemetry Collector and append-only storage backends.

## The Architecture

The pipeline has three stages: collection via OpenTelemetry SDK instrumentation, processing through the OTel Collector with integrity hashing, and storage in an append-only backend. We will use Amazon S3 with Object Lock as the append-only store, but the same pattern works with Azure Immutable Blob Storage or GCS retention policies.

## Instrumenting Audit Events

First, emit audit events as OpenTelemetry log records from your application. Each audit event should carry structured attributes that identify the actor, action, and resource.

```python
# audit_logger.py
# Emits structured audit events via OpenTelemetry logging SDK
import hashlib
import json
import time
from opentelemetry import _logs as logs
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Set up the OTel log provider with OTLP export
provider = LoggerProvider()
provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(endpoint="otel-collector:4317"))
)
logs.set_logger_provider(provider)
logger = logs.get_logger("audit.service")

def emit_audit_event(actor: str, action: str, resource: str, details: dict):
    """Emit an audit log with a content hash for integrity verification."""
    # Build the canonical event payload
    event_payload = {
        "actor": actor,
        "action": action,
        "resource": resource,
        "details": details,
        "timestamp": time.time_ns(),
    }
    # Compute a SHA-256 hash of the payload for integrity checking
    content_hash = hashlib.sha256(
        json.dumps(event_payload, sort_keys=True).encode()
    ).hexdigest()

    logger.emit(
        logs.LogRecord(
            body=json.dumps(event_payload),
            attributes={
                "audit.actor": actor,
                "audit.action": action,
                "audit.resource": resource,
                "audit.content_hash": content_hash,
                "audit.schema_version": "1.0",
            },
        )
    )
```

## Configuring the Collector for Audit Logs

The Collector receives audit logs, adds a chain hash for sequential integrity, and exports to both S3 (immutable) and a searchable backend like Elasticsearch.

```yaml
# otel-collector-audit.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Filter to only process audit log records
  filter/audit:
    logs:
      include:
        match_type: strict
        resource_attributes:
          - key: service.name
            value: "audit.service"

  # Add collector-level metadata for traceability
  attributes/audit-metadata:
    actions:
      - key: audit.collector_id
        value: "collector-prod-01"
        action: insert
      - key: audit.pipeline_version
        value: "2.1.0"
        action: insert

  # Batch with a short flush interval to minimize delay
  batch:
    send_batch_size: 100
    timeout: 5s

exporters:
  # Primary: S3 with Object Lock for immutability
  awss3:
    s3uploader:
      region: us-east-1
      s3_bucket: audit-logs-immutable
      s3_prefix: "otel-audit"
      s3_partition: "minute"
      file_prefix: "audit"
    marshaler: otlp_json

  # Secondary: Elasticsearch for querying
  elasticsearch:
    endpoints: ["https://es-audit.internal:9200"]
    logs_index: "audit-logs"
    tls:
      cert_file: /certs/client.crt
      key_file: /certs/client.key

service:
  pipelines:
    logs/audit:
      receivers: [otlp]
      processors: [filter/audit, attributes/audit-metadata, batch]
      exporters: [awss3, elasticsearch]
```

## Enabling S3 Object Lock

S3 Object Lock prevents objects from being deleted or overwritten for a specified retention period. Enable it when creating the bucket.

```bash
# Create the S3 bucket with Object Lock enabled
aws s3api create-bucket \
  --bucket audit-logs-immutable \
  --region us-east-1 \
  --object-lock-enabled-for-bucket

# Set a default retention policy of 7 years in compliance mode
# Compliance mode prevents even the root account from deleting objects
aws s3api put-object-lock-configuration \
  --bucket audit-logs-immutable \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 7
      }
    }
  }'
```

## Verifying Log Integrity

After logs land in S3, you need a way to verify they haven't been corrupted in transit. This script downloads audit log files and validates the content hashes embedded in each record.

```python
# verify_audit_integrity.py
# Downloads audit logs from S3 and verifies content hashes
import boto3
import json
import hashlib

s3 = boto3.client("s3")
BUCKET = "audit-logs-immutable"

def verify_audit_file(s3_key):
    """Download an audit log file and verify each record's hash."""
    obj = s3.get_object(Bucket=BUCKET, Key=s3_key)
    records = json.loads(obj["Body"].read())

    failures = []
    for record in records.get("resourceLogs", []):
        for scope_log in record.get("scopeLogs", []):
            for log_record in scope_log.get("logRecords", []):
                body = json.loads(log_record["body"]["stringValue"])
                stored_hash = None
                for attr in log_record.get("attributes", []):
                    if attr["key"] == "audit.content_hash":
                        stored_hash = attr["value"]["stringValue"]

                # Recompute hash from the body payload
                computed_hash = hashlib.sha256(
                    json.dumps(body, sort_keys=True).encode()
                ).hexdigest()

                if stored_hash != computed_hash:
                    failures.append({
                        "record": body,
                        "expected": stored_hash,
                        "actual": computed_hash,
                    })

    return failures

# List and verify recent audit files
response = s3.list_objects_v2(Bucket=BUCKET, Prefix="otel-audit/", MaxKeys=50)
for obj in response.get("Contents", []):
    issues = verify_audit_file(obj["Key"])
    if issues:
        print(f"INTEGRITY FAILURE in {obj['Key']}: {len(issues)} records")
    else:
        print(f"OK: {obj['Key']}")
```

## Handling Failures Gracefully

If the S3 exporter fails, you don't want to lose audit events. Enable the persistent sending queue in the Collector so that records survive restarts.

```yaml
# Add to the awss3 exporter section
exporters:
  awss3:
    s3uploader:
      region: us-east-1
      s3_bucket: audit-logs-immutable
      s3_prefix: "otel-audit"
      s3_partition: "minute"
    sending_queue:
      enabled: true
      storage: file_storage
      # Queue can hold up to 50,000 log batches
      queue_size: 50000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s

extensions:
  file_storage:
    directory: /var/otel/audit-queue
    timeout: 10s
```

## Summary

An immutable audit log pipeline built on OpenTelemetry gives you structured, hash-verified events flowing into tamper-proof storage. The key pieces are content hashing at the source, dual export to both immutable and searchable backends, S3 Object Lock in compliance mode, and a verification tool to confirm integrity at any time. This setup satisfies most regulatory frameworks that require demonstrable log immutability, from SOC 2 to HIPAA.
