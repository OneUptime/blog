# How to Implement a Data Masking Pipeline That Redacts PII from Traces, Metrics, and Logs in a Single Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Masking, PII, Redaction, Compliance

Description: Build a unified data masking pipeline in the OpenTelemetry Collector that redacts PII from traces, metrics, and logs using multiple processors.

Building a single Collector configuration that handles PII redaction across all three signal types is the cleanest way to enforce data privacy policies. Instead of scattering PII scrubbing logic across your application code, you centralize it in the Collector pipeline where it can be audited, tested, and updated in one place.

This post walks through building a comprehensive data masking pipeline.

## Pipeline Architecture

The masking pipeline uses a combination of processors in a specific order:

1. **Attributes processor** - removes or hashes known PII attribute keys
2. **Redaction processor** - catches PII in attribute values using regex
3. **Transform processor** - scrubs PII from log bodies and metric descriptions using OTTL

```
Receiver --> Attributes Processor --> Redaction Processor --> Transform Processor --> Batch --> Exporter
```

## Step 1: Attribute Key-Based Masking

Start with the attributes processor to handle known PII fields. This is the cheapest operation since it matches on key names without regex:

```yaml
processors:
  attributes/remove-pii-keys:
    actions:
      # Hash user identifiers (keep correlation, hide identity)
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
      # Delete attributes that should never be exported
      - key: user.password
        action: delete
      - key: user.ssn
        action: delete
      - key: user.credit_card
        action: delete
      - key: user.date_of_birth
        action: delete
      # Mask IP addresses by hashing
      - key: client.address
        action: hash
      - key: http.client_ip
        action: hash
```

## Step 2: Value-Based Redaction

Next, the redaction processor scans all remaining attribute values for PII patterns:

```yaml
processors:
  redaction/pii-values:
    allow_all_keys: true
    blocked_values:
      # Social Security Numbers (US)
      - "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
      # Credit card numbers (major brands)
      - "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b"
      # Email addresses
      - "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"
      # Phone numbers (various formats)
      - "\\+?[0-9]{1,3}[\\s.-]?\\(?[0-9]{3}\\)?[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}"
```

## Step 3: Log Body Scrubbing with OTTL

The redaction processor does not touch log bodies. Use the transform processor with OTTL for that:

```yaml
processors:
  transform/scrub-log-bodies:
    log_statements:
      - context: log
        statements:
          # Scrub email addresses from log body
          - replace_pattern(body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL]")
          # Scrub SSNs from log body
          - replace_pattern(body, "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b", "[SSN]")
          # Scrub credit cards from log body
          - replace_pattern(body, "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\\b", "[CARD]")
          # Scrub phone numbers from log body
          - replace_pattern(body, "\\+?[0-9]{1,3}[\\s.-]?\\(?[0-9]{3}\\)?[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}", "[PHONE]")
```

## Step 4: Metric Label Masking

Metrics can also carry PII in their attribute labels. Use OTTL to scrub metric attributes:

```yaml
processors:
  transform/scrub-metrics:
    metric_statements:
      - context: datapoint
        statements:
          # Hash user-identifying labels on metrics
          - set(attributes["user.id"], SHA256(attributes["user.id"])) where attributes["user.id"] != nil
          - set(attributes["customer.email"], SHA256(attributes["customer.email"])) where attributes["customer.email"] != nil
```

## Complete Configuration

Putting it all together:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  # Layer 1: Key-based attribute handling
  attributes/remove-pii-keys:
    actions:
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
      - key: user.password
        action: delete
      - key: user.ssn
        action: delete

  # Layer 2: Value-based regex scanning for traces and logs
  redaction/pii-values:
    allow_all_keys: true
    blocked_values:
      - "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
      - "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b"
      - "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"

  # Layer 3: OTTL-based body and field scrubbing
  transform/scrub-logs:
    log_statements:
      - context: log
        statements:
          - replace_pattern(body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL]")
          - replace_pattern(body, "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b", "[SSN]")

  transform/scrub-metrics:
    metric_statements:
      - context: datapoint
        statements:
          - set(attributes["user.id"], SHA256(attributes["user.id"])) where attributes["user.id"] != nil

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/remove-pii-keys, redaction/pii-values, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [attributes/remove-pii-keys, transform/scrub-metrics, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [attributes/remove-pii-keys, redaction/pii-values, transform/scrub-logs, batch]
      exporters: [otlp]
```

## Monitoring the Masking Pipeline

Add the Collector's internal telemetry to track how many values are being redacted:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: "0.0.0.0:8888"
```

The redaction processor emits metrics about blocked values. Monitor `otelcol_processor_redaction_blocked_values_total` to understand how much PII is flowing through your system. A sudden spike might indicate a new service that needs better instrumentation practices.

## Processor Ordering Matters

The order of processors in the pipeline is significant. Put the attributes processor first because it operates on keys (fast, no regex). Then the redaction processor for value scanning. Finally, the transform processor for body/field manipulation. This ordering minimizes the amount of data that needs regex evaluation.

A centralized masking pipeline like this ensures that no matter which service sends telemetry, PII gets caught before it reaches your backend. Combine it with automated testing to verify that new PII patterns are covered.
