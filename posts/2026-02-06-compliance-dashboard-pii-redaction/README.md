# How to Build a Compliance Dashboard That Tracks PII Redaction Effectiveness in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Compliance, PII Redaction, Dashboard

Description: Build a compliance dashboard that measures and tracks PII redaction effectiveness across your OpenTelemetry pipelines.

You have PII redaction configured in your OpenTelemetry pipeline. Great. But how do you know it is actually working? How do you prove to auditors that your redaction rules caught 100% of the PII that flowed through? How do you detect when a new service starts emitting PII in a format your rules do not cover?

This post walks through building a compliance dashboard that continuously monitors the effectiveness of your PII redaction pipeline. The dashboard tracks redaction counts, detects potential PII leaks that slipped through, and provides the metrics your compliance team needs for audit evidence.

## Instrumenting the Redaction Pipeline

The first step is making your redaction processors emit metrics about what they are doing. You need to know:

- How many telemetry records were scanned
- How many contained PII that was redacted
- What types of PII were found (email, SSN, IP address, etc.)
- How many records passed through without any redaction

Create a custom processor that wraps your redaction logic and emits metrics:

```python
# Redaction processor that emits compliance metrics
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
import re
from dataclasses import dataclass

meter = metrics.get_meter("pii-redaction-pipeline")

# Compliance metrics
records_scanned = meter.create_counter(
    "pii.redaction.records_scanned",
    description="Total telemetry records scanned for PII",
)

records_redacted = meter.create_counter(
    "pii.redaction.records_redacted",
    description="Records where PII was found and redacted",
)

pii_instances_found = meter.create_counter(
    "pii.redaction.instances_found",
    description="Individual PII instances detected and redacted",
)

records_clean = meter.create_counter(
    "pii.redaction.records_clean",
    description="Records that contained no PII",
)

@dataclass
class PIIPattern:
    name: str
    regex: re.Pattern
    category: str  # "identifier", "financial", "health", "contact"

PII_PATTERNS = [
    PIIPattern("email", re.compile(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    ), "contact"),
    PIIPattern("ssn", re.compile(
        r"\b\d{3}-\d{2}-\d{4}\b"
    ), "identifier"),
    PIIPattern("credit_card", re.compile(
        r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"
    ), "financial"),
    PIIPattern("phone_us", re.compile(
        r"\b\(\d{3}\)\s?\d{3}-\d{4}\b"
    ), "contact"),
    PIIPattern("ipv4", re.compile(
        r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
    ), "identifier"),
]

REDACTED_MARKER = "[PII-REDACTED]"

def scan_and_redact(value, service_name):
    """Scan a string value for PII, redact it, and emit metrics."""
    if not isinstance(value, str):
        return value

    found_any = False
    for pattern in PII_PATTERNS:
        matches = pattern.regex.findall(value)
        if matches:
            found_any = True
            pii_instances_found.add(
                len(matches),
                {
                    "pii.type": pattern.name,
                    "pii.category": pattern.category,
                    "service.name": service_name,
                },
            )
            value = pattern.regex.sub(REDACTED_MARKER, value)

    return value, found_any


def process_span(span):
    """Process a single span, redacting PII and recording metrics."""
    service = span.resource.attributes.get("service.name", "unknown")
    records_scanned.add(1, {"service.name": service})

    any_pii_found = False
    for key, value in span.attributes.items():
        new_value, had_pii = scan_and_redact(value, service)
        if had_pii:
            any_pii_found = True
            span.attributes[key] = new_value

    if any_pii_found:
        records_redacted.add(1, {"service.name": service})
    else:
        records_clean.add(1, {"service.name": service})
```

## Post-Redaction Validation Scanner

Even with redaction in place, you need a second pass that samples exported telemetry and checks for PII that might have slipped through. Think of this as a quality assurance check on your redaction pipeline.

This scanner runs against your telemetry backend and flags potential leaks:

```python
# Post-redaction PII leak scanner
# Run this as a scheduled job every hour against sampled telemetry
import re
from datetime import datetime, timedelta

leak_detected = meter.create_counter(
    "pii.redaction.leaks_detected",
    description="Potential PII instances that bypassed redaction",
)

scan_runs = meter.create_counter(
    "pii.redaction.scan_runs",
    description="Number of validation scan executions",
)

# Additional patterns that might indicate PII leaks
# These are broader than the redaction patterns to catch edge cases
LEAK_PATTERNS = [
    ("email_like", re.compile(r"\w+@\w+\.\w{2,}")),
    ("ssn_no_dashes", re.compile(r"\b\d{9}\b")),
    ("phone_intl", re.compile(r"\+\d{10,15}")),
    ("name_prefix", re.compile(
        r"\b(Mr|Mrs|Ms|Dr)\.\s+[A-Z][a-z]+"
    )),
]

def validate_exported_telemetry(backend_client, sample_size=1000):
    """Sample recent telemetry and scan for PII leaks."""
    scan_runs.add(1)

    # Query a sample of recent spans from the backend
    spans = backend_client.query_spans(
        start_time=datetime.utcnow() - timedelta(hours=1),
        limit=sample_size,
    )

    leaks = []
    for span in spans:
        for key, value in span.attributes.items():
            if not isinstance(value, str):
                continue
            # Skip the redaction marker itself
            if "[PII-REDACTED]" in value:
                continue

            for pattern_name, pattern in LEAK_PATTERNS:
                if pattern.search(value):
                    leaks.append({
                        "span_id": span.span_id,
                        "attribute": key,
                        "pattern": pattern_name,
                        "service": span.resource["service.name"],
                    })
                    leak_detected.add(1, {
                        "pii.pattern": pattern_name,
                        "service.name": span.resource["service.name"],
                        "attribute.key": key,
                    })

    return leaks
```

## Dashboard Queries

With the metrics flowing, build your compliance dashboard. Here are the key panels and their queries.

These PromQL queries power the dashboard panels:

```yaml
# Grafana dashboard panel queries (PromQL)

# Panel 1: Redaction Rate (should be close to 0% for a well-instrumented system)
# Shows what percentage of records contained PII
panel_redaction_rate: |
  rate(pii_redaction_records_redacted_total[5m])
  /
  rate(pii_redaction_records_scanned_total[5m])
  * 100

# Panel 2: PII Instances by Type (stacked bar chart)
# Shows which types of PII are being caught
panel_pii_by_type: |
  sum by (pii_type) (
    rate(pii_redaction_instances_found_total[1h])
  )

# Panel 3: PII by Service (table)
# Identifies which services are emitting the most PII
panel_pii_by_service: |
  topk(10,
    sum by (service_name) (
      increase(pii_redaction_instances_found_total[24h])
    )
  )

# Panel 4: Leak Detection Alerts (should always be 0)
# Any value above 0 requires immediate investigation
panel_leak_count: |
  sum(increase(pii_redaction_leaks_detected_total[1h]))

# Panel 5: Leak Detection by Pattern
# Shows what type of PII is slipping through
panel_leaks_by_pattern: |
  sum by (pii_pattern, service_name) (
    increase(pii_redaction_leaks_detected_total[24h])
  )

# Panel 6: Scan Coverage
# Percentage of total telemetry that was scanned
panel_scan_coverage: |
  rate(pii_redaction_records_scanned_total[5m])
  /
  rate(otelcol_receiver_accepted_spans_total[5m])
  * 100
```

## Alert Rules

Set up alerts that fire when the redaction pipeline is not performing as expected:

```yaml
# Prometheus alerting rules for PII redaction compliance
groups:
  - name: pii_redaction_compliance
    rules:
      # Alert if PII leaks are detected in the validation scan
      - alert: PIILeakDetected
        expr: increase(pii_redaction_leaks_detected_total[1h]) > 0
        for: 0m
        labels:
          severity: critical
          compliance: true
        annotations:
          summary: "PII detected in post-redaction validation scan"
          description: >
            {{ $value }} potential PII instances found in
            exported telemetry. Immediate investigation required.

      # Alert if redaction rate spikes (a service is leaking more PII)
      - alert: PIIRedactionRateSpike
        expr: >
          rate(pii_redaction_records_redacted_total[15m])
          / rate(pii_redaction_records_scanned_total[15m])
          > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PII redaction rate above 10% for 10 minutes"
          description: >
            More than 10% of telemetry records contain PII.
            A service may have changed its instrumentation.

      # Alert if the scanner stops running
      - alert: PIIScannerNotRunning
        expr: >
          increase(pii_redaction_scan_runs_total[2h]) == 0
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "PII validation scanner has not run in 2 hours"
```

## Generating Audit Evidence

When auditors ask for proof that your PII redaction is working, export the dashboard data as a report. The key metrics to include in your compliance evidence package are:

- Total records scanned over the audit period
- Total PII instances detected and redacted, by type
- Leak detection scan results (ideally showing zero leaks)
- Response time and resolution for any leak alerts that fired

This dashboard turns PII redaction from a "trust us, it works" situation into a measurable, auditable control with continuous monitoring. That is the difference between passing and failing a compliance review.
