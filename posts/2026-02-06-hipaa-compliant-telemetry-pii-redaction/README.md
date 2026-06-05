# How to Use HIPAA-Compliant Telemetry Pipelines with OpenTelemetry PII Redaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HIPAA, PII Redaction, Healthcare

Description: Build HIPAA-compliant OpenTelemetry pipelines that automatically redact PHI from traces, logs, and metrics before export.

If you work in healthcare or handle Protected Health Information (PHI), shipping telemetry data to an observability backend requires careful thought. HIPAA does not ban you from using observability tools, but it does require appropriate safeguards for electronic PHI, including transmission security and access controls. Removing PHI before export, or encrypting it when encryption is appropriate for your risk assessment, is a strong way to reduce exposure. OpenTelemetry gives you the pipeline primitives to do exactly that.

This post covers how to configure OpenTelemetry Collectors and SDK-level instrumentation to strip PHI from your telemetry data before it reaches any external backend.

## Where PHI Sneaks Into Telemetry

PHI shows up in telemetry data more often than most teams realize. Common sources include:

- **HTTP span attributes**: URL paths containing patient IDs (`/api/patients/12345/records`)
- **Database spans**: Query text with patient names or SSNs
- **Log messages**: Error logs that dump request bodies containing health records
- **Metric labels**: Cardinality explosions from patient-specific dimensions

The HIPAA Security Rule (45 CFR 164.312) requires technical safeguards for any system that stores or transmits PHI. Your telemetry pipeline is one of those systems.

## SDK-Level Redaction with Span Processors

The best place to redact PHI is at the source, before data ever leaves the application process. You can write a custom SpanProcessor that scrubs sensitive attributes set when a span starts, and use the same scrubber whenever your application adds custom attributes.

Here is a Python example that redacts known PHI attribute patterns:

```python
# Custom SpanProcessor that redacts PHI attributes before export

import re
from opentelemetry.sdk.trace import SpanProcessor

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

def redact_value(value):
    """Scan string values for SSN and MRN patterns."""
    if isinstance(value, str):
        # Redact SSN patterns (xxx-xx-xxxx)
        value = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", REDACTED, value)
        # Redact MRN patterns (common 8-10 digit format)
        value = re.sub(r"\bMRN\d{8,10}\b", REDACTED, value)
    return value


def clean_attribute(key, value):
    if any(p.search(key) for p in PHI_ATTRIBUTE_PATTERNS):
        return REDACTED
    return redact_value(value)


class PHIRedactionProcessor(SpanProcessor):
    def on_start(self, span, parent_context=None):
        if not span.is_recording():
            return

        for key, value in dict(span.attributes or {}).items():
            span.set_attribute(key, clean_attribute(key, value))

    def on_end(self, span):
        # on_end receives a ReadableSpan, which is read-only in the Python SDK.
        pass

    def force_flush(self, timeout_millis=None):
        return True

    def shutdown(self):
        pass


def set_safe_attribute(span, key, value):
    """Use this instead of span.set_attribute for application-owned attributes."""
    span.set_attribute(key, clean_attribute(key, value))
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
    error_mode: ignore
    trace_statements:
      # Replace patient IDs in URL paths
      - replace_pattern(span.attributes["url.path"], "/patients/[0-9]+", "/patients/[REDACTED]")
      # Scrub SSN patterns from database query text
      - replace_pattern(span.attributes["db.query.text"], "[0-9]{3}-[0-9]{2}-[0-9]{4}", "[REDACTED-SSN]")
      - replace_pattern(span.attributes["db.statement"], "[0-9]{3}-[0-9]{2}-[0-9]{4}", "[REDACTED-SSN]")
      # Remove specific PHI attributes entirely
      - delete_key(span.attributes, "patient.name")
      - delete_key(span.attributes, "patient.dob")
      - delete_key(span.attributes, "patient.ssn")

    log_statements:
      # Redact PHI from log bodies
      - replace_pattern(log.body, "SSN:\\s*[0-9]{3}-[0-9]{2}-[0-9]{4}", "SSN: [REDACTED]")
      - replace_pattern(log.body, "DOB:\\s*[0-9]{4}-[0-9]{2}-[0-9]{2}", "DOB: [REDACTED]")

  # Enforce an attribute allowlist - only permit known-safe attributes
  transform/allowlist:
    error_mode: ignore
    trace_statements:
      - keep_keys(span.attributes, ["http.method", "http.request.method", "http.status_code", "http.response.status_code", "http.route"])
      - keep_keys(resource.attributes, ["service.name"])
    log_statements:
      - keep_keys(log.attributes, ["http.method", "http.request.method", "http.status_code", "http.response.status_code", "http.route"])
      - keep_keys(resource.attributes, ["service.name"])

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
      processors: [transform/redact_phi, transform/allowlist, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [transform/redact_phi, transform/allowlist, batch]
      exporters: [otlp]
```

## Redacting PHI from URL Paths

One of the most common PHI leaks is patient identifiers embedded in REST API paths. Use the `http.route` attribute instead of `http.url` or `url.path` wherever possible, since the route template (`/patients/{id}/records`) does not contain actual identifiers.

Configure your HTTP instrumentation so Flask can emit route templates:

```python
from flask import Flask
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)

# Flask instrumentation sets the http.route span attribute from the matched route.
FlaskInstrumentor().instrument_app(app)
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
