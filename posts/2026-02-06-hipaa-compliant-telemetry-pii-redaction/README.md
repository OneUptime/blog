# How to Implement HIPAA-Compliant Telemetry Pipelines with OpenTelemetry PII Redaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HIPAA, PII Redaction, Healthcare

Description: Build HIPAA-compliant OpenTelemetry pipelines that automatically redact PHI from traces, logs, and metrics before export.

If you work in healthcare or handle Protected Health Information (PHI), shipping telemetry data to an observability backend requires careful thought. HIPAA does not ban you from using observability tools, but it does require that PHI is either removed or encrypted before it leaves your controlled environment. OpenTelemetry gives you the pipeline primitives to do exactly that.

This post covers how to configure OpenTelemetry Collectors and SDK-level instrumentation to strip PHI from your telemetry data before it reaches any external backend.

## Where PHI Sneaks Into Telemetry

PHI shows up in telemetry data more often than most teams realize. Common sources include:

- **HTTP span attributes**: URL paths containing patient IDs (`/api/patients/12345/records`)
- **Database spans**: Query text with patient names or SSNs
- **Log messages**: Error logs that dump request bodies containing health records
- **Metric labels**: Cardinality explosions from patient-specific dimensions

The HIPAA Security Rule (45 CFR 164.312) requires technical safeguards for any system that stores or transmits PHI. Your telemetry pipeline is one of those systems.

## SDK-Level Redaction with Span Processors

The best place to redact PHI is at the source, before data ever leaves the application process. You can write a custom SpanProcessor that scrubs sensitive attributes.

Here is a Python example that redacts known PHI attribute patterns:

```python
# Custom SpanProcessor that redacts PHI attributes before export
from opentelemetry.sdk.trace import SpanProcessor
import re

# Patterns that match common PHI fields
PHI_ATTRIBUTE_PATTERNS = [
    re.compile(r"patient[._]id", re.IGNORECASE),
    re.compile(r"patient[._]name", re.IGNORECASE),
    re.compile(r"ssn", re.IGNORECASE),
    re.compile(r"date[._]of[._]birth", re.IGNORECASE),
    re.compile(r"medical[._]record", re.IGNORECASE),
    re.compile(r"diagnosis", re.IGNORECASE),
]

REDACTED = "[REDACTED-PHI]"

class PHIRedactionProcessor(SpanProcessor):
    def on_start(self, span, parent_context=None):
        pass

    def on_end(self, span):
        # SpanProcessor.on_end receives a ReadableSpan,
        # so we redact during on_start or use a custom exporter wrapper.
        pass

    def force_flush(self, timeout_millis=None):
        return True

    def shutdown(self):
        pass


class PHIRedactingExporter:
    """Wraps any SpanExporter to redact PHI before export."""

    def __init__(self, delegate_exporter):
        self._delegate = delegate_exporter

    def export(self, spans):
        redacted_spans = []
        for span in spans:
            # Build a new attributes dict with PHI redacted
            clean_attrs = {}
            for key, value in span.attributes.items():
                if any(p.search(key) for p in PHI_ATTRIBUTE_PATTERNS):
                    clean_attrs[key] = REDACTED
                else:
                    clean_attrs[key] = self._redact_value(value)
            # Create modified span data (implementation depends on your SDK version)
            redacted_spans.append(
                span._replace(attributes=clean_attrs)
            )
        return self._delegate.export(redacted_spans)

    def _redact_value(self, value):
        """Scan string values for SSN and MRN patterns."""
        if isinstance(value, str):
            # Redact SSN patterns (xxx-xx-xxxx)
            value = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", REDACTED, value)
            # Redact MRN patterns (common 8-10 digit format)
            value = re.sub(r"\bMRN\d{8,10}\b", REDACTED, value)
        return value
```

## Collector-Level Redaction with the Transform Processor

For teams that cannot modify application code, the OpenTelemetry Collector's `transform` processor is the next best option. It runs regex replacements on attribute values before export.

This configuration redacts PHI from span and log attributes at the collector level:

```yaml
# otel-collector-hipaa.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Redact known PHI attributes
  transform/redact_phi:
    trace_statements:
      - context: span
        statements:
          # Replace patient IDs in URL paths
          - replace_pattern(attributes["url.path"],
              "/patients/[0-9]+",
              "/patients/[REDACTED]")
          # Scrub SSN patterns from all string attributes
          - replace_pattern(attributes["db.statement"],
              "[0-9]{3}-[0-9]{2}-[0-9]{4}",
              "[REDACTED-SSN]")
          # Remove specific PHI attributes entirely
          - delete_key(attributes, "patient.name")
          - delete_key(attributes, "patient.dob")
          - delete_key(attributes, "patient.ssn")

    log_statements:
      - context: log
        statements:
          # Redact PHI from log bodies
          - replace_pattern(body,
              "SSN:\\s*[0-9]{3}-[0-9]{2}-[0-9]{4}",
              "SSN: [REDACTED]")
          - replace_pattern(body,
              "DOB:\\s*[0-9]{4}-[0-9]{2}-[0-9]{2}",
              "DOB: [REDACTED]")

  # Enforce an attribute allowlist - only permit known-safe attributes
  attributes/allowlist:
    actions:
      - key: http.method
        action: update
      - key: http.status_code
        action: update
      - key: service.name
        action: update
      # Everything not explicitly listed gets dropped
      # by using the filter processor downstream

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: https://oneuptime.example.com:4317
    tls:
      cert_file: /etc/ssl/certs/collector.crt
      key_file: /etc/ssl/private/collector.key

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/redact_phi, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [transform/redact_phi, batch]
      exporters: [otlp]
```

## Redacting PHI from URL Paths

One of the most common PHI leaks is patient identifiers embedded in REST API paths. Use the `http.route` attribute instead of `http.url` or `url.path` wherever possible, since the route template (`/patients/{id}/records`) does not contain actual identifiers.

Configure your HTTP instrumentation to prefer route templates:

```python
# Configure Flask instrumentation to use route templates
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# The url_filter hook lets you clean URLs before they become span attributes
def sanitize_url(url):
    """Replace path segments that look like IDs with placeholders."""
    import re
    # Replace numeric path segments
    return re.sub(r"/\d+", "/{id}", url)

FlaskInstrumentor().instrument(
    url_filter=sanitize_url,
)
```

## Validating That Redaction Actually Works

Trust but verify. Set up a validation step that samples exported telemetry and scans for PHI patterns that should have been redacted.

A simple validation script you can run as a cron job or CI check:

```python
# Validation script to scan exported telemetry for PHI leaks
import json
import re
import sys

PHI_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "SSN"),
    (re.compile(r"\bMRN\d{8,10}\b"), "Medical Record Number"),
    (re.compile(r"\b\d{4}-\d{2}-\d{2}\b.*(?:birth|dob)", re.I), "Date of Birth"),
]

def scan_for_phi(telemetry_file):
    violations = []
    with open(telemetry_file) as f:
        for line_num, line in enumerate(f, 1):
            for pattern, phi_type in PHI_PATTERNS:
                if pattern.search(line):
                    violations.append(
                        f"Line {line_num}: Possible {phi_type} detected"
                    )
    return violations

if __name__ == "__main__":
    violations = scan_for_phi(sys.argv[1])
    if violations:
        print(f"FAIL: {len(violations)} potential PHI leaks found")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)
    print("PASS: No PHI patterns detected in telemetry sample")
```

## Wrapping Up

HIPAA compliance in your telemetry pipeline comes down to three principles: redact at the source when possible, enforce redaction at the collector as a safety net, and validate continuously. OpenTelemetry's layered architecture of SDKs, processors, and collectors gives you multiple points to enforce PHI removal. The key is to treat your telemetry pipeline as a PHI-handling system and apply the same controls you would to any other data flow in a healthcare environment.
