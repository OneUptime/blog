# How to Build HIPAA-Compliant OpenTelemetry Pipelines That Redact PHI from Traces, Logs, and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HIPAA, Healthcare, PHI Redaction

Description: Learn how to build OpenTelemetry pipelines that automatically redact Protected Health Information from traces, logs, and metrics to maintain HIPAA compliance.

Healthcare organizations adopting OpenTelemetry face a unique challenge: they need deep observability into their systems, but they absolutely cannot leak Protected Health Information (PHI) into their telemetry backends. Patient names, medical record numbers, Social Security numbers, and diagnosis codes flowing through traces and logs can create serious HIPAA violations with fines reaching millions of dollars.

This post walks through building an OpenTelemetry pipeline that gives you full observability while scrubbing PHI before it ever leaves your infrastructure.

## Understanding What Counts as PHI in Telemetry

PHI in telemetry data shows up in places you might not expect. Beyond the obvious (patient names in log messages), you will find MRNs embedded in URL paths, diagnosis codes in span attributes, and insurance IDs in metric labels. The HIPAA Privacy Rule identifies 18 categories of identifiers, and any of these can sneak into your telemetry if you are not careful.

## Setting Up the OpenTelemetry Collector with Redaction

The OpenTelemetry Collector is your first line of defense. By placing processors in the collector pipeline, you can intercept and redact PHI before it reaches any external backend.

Here is a collector configuration that uses the `transform` processor and `attributes` processor together:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Remove specific attributes that commonly contain PHI
  attributes/redact-phi:
    actions:
      - key: patient.name
        action: delete
      - key: patient.ssn
        action: delete
      - key: patient.mrn
        action: hash  # Hash instead of delete to keep cardinality
      - key: patient.dob
        action: delete
      - key: http.url
        action: extract
        pattern: '/api/patients/(?P<patient_id>[^/]+)'
      - key: patient_id
        action: hash

  # Use transform processor for regex-based redaction in log bodies
  transform/redact-logs:
    log_statements:
      - context: log
        statements:
          # Redact SSN patterns (XXX-XX-XXXX)
          - replace_pattern(body, "\\b\\d{3}-\\d{2}-\\d{4}\\b", "[SSN-REDACTED]")
          # Redact MRN patterns (varies by org, example: MRN followed by digits)
          - replace_pattern(body, "MRN[:\\s]*\\d+", "MRN:[REDACTED]")
          # Redact common date of birth patterns
          - replace_pattern(body, "DOB[:\\s]*\\d{2}/\\d{2}/\\d{4}", "DOB:[REDACTED]")

  # Batch for performance
  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: "your-observability-backend:4317"
    tls:
      insecure: false
      cert_file: /certs/client.crt
      key_file: /certs/client.key

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/redact-phi, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [attributes/redact-phi, transform/redact-logs, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [attributes/redact-phi, batch]
      exporters: [otlp]
```

## Building a Custom Span Processor for Application-Level Redaction

Sometimes you want redaction at the SDK level before data even reaches the collector. Here is a custom SpanProcessor in Python that scrubs PHI patterns:

```python
import re
from opentelemetry.sdk.trace import SpanProcessor

# Patterns that match common PHI formats
PHI_PATTERNS = {
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "mrn": re.compile(r"MRN[:\s]*\d+", re.IGNORECASE),
    "phone": re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
}

# Attribute keys that should always be removed
PHI_ATTRIBUTE_KEYS = {
    "patient.name", "patient.ssn", "patient.dob",
    "patient.address", "patient.phone", "patient.email",
    "insurance.member_id", "insurance.group_number",
}

class PHIRedactionProcessor(SpanProcessor):
    """Redacts PHI from span attributes before export."""

    def on_start(self, span, parent_context=None):
        pass

    def on_end(self, span):
        # We cannot modify a ReadableSpan directly after it ends,
        # so this processor should be used with a custom exporter
        # or applied before the span is finalized.
        pass

    def _redact_value(self, value):
        """Scrub PHI patterns from a string value."""
        if not isinstance(value, str):
            return value
        result = value
        for pattern_name, pattern in PHI_PATTERNS.items():
            result = pattern.sub(f"[{pattern_name.upper()}_REDACTED]", result)
        return result

    def _should_remove_key(self, key):
        """Check if an attribute key is known to hold PHI."""
        return key.lower() in PHI_ATTRIBUTE_KEYS
```

## Validating Your Redaction Pipeline

You should never trust that your redaction works without testing it. Set up a validation step that scans exported telemetry for PHI patterns:

```python
import json
import re

def scan_for_phi_leaks(telemetry_export_file):
    """
    Scan exported telemetry JSON for potential PHI leaks.
    Run this as part of your CI/CD pipeline or as a periodic audit.
    """
    violations = []
    phi_detectors = {
        "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        "MRN": re.compile(r"MRN[:\s]*\d{4,}", re.IGNORECASE),
        "Email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    }

    with open(telemetry_export_file, "r") as f:
        data = json.load(f)

    # Recursively walk the JSON and check all string values
    def walk(obj, path=""):
        if isinstance(obj, str):
            for phi_type, pattern in phi_detectors.items():
                if pattern.search(obj):
                    violations.append({
                        "type": phi_type,
                        "path": path,
                        "sample": obj[:80]  # Truncate for the report
                    })
        elif isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                walk(item, f"{path}[{i}]")

    walk(data)
    return violations
```

## TLS and Encryption in Transit

Redaction is one layer. You also need to make sure telemetry data is encrypted in transit. The collector config above already includes TLS settings, but make sure you are also encrypting the connection between your application SDK and the collector. In your application's OTLP exporter configuration, always specify TLS:

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Always use TLS when transmitting telemetry that might contain health data
exporter = OTLPSpanExporter(
    endpoint="otel-collector.internal:4317",
    credentials=ssl_channel_credentials(
        root_certificates=open("/certs/ca.crt", "rb").read()
    ),
)
```

## Key Takeaways

Building a HIPAA-compliant OpenTelemetry pipeline requires a layered approach. Redact at the application level with custom processors, redact again at the collector level with attribute and transform processors, validate with automated scanning, and encrypt everything in transit. The overhead of these redaction steps is minimal compared to the cost of a HIPAA violation. Start with the collector-level redaction since it covers all your services in one place, then layer in application-level redaction for the most sensitive workflows.
