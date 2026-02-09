# How to Configure Cascading Redaction Rules (Block, Hash, Mask) for Different Sensitivity Levels in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Redaction, Data Classification, Sensitivity Levels, Collector

Description: Set up cascading redaction rules in the OpenTelemetry Collector that apply different actions based on data sensitivity classification.

Not all sensitive data deserves the same treatment. A credit card number should be completely blocked. A user ID should be hashed so you can still correlate data. An IP address might just need partial masking. By setting up cascading redaction rules with different actions per sensitivity level, you get a nuanced approach to data protection.

## Sensitivity Classification

Before configuring the Collector, define your sensitivity levels:

- **Critical**: Must be completely removed (passwords, SSNs, credit cards)
- **High**: Must be hashed for correlation without exposure (user IDs, email addresses)
- **Medium**: Must be partially masked (IP addresses, phone numbers)
- **Low**: Safe to pass through (HTTP methods, status codes, service names)

## Implementing Cascading Rules

The Collector does not have a single processor that handles all these actions. Instead, chain multiple processors, each handling one sensitivity level:

```yaml
processors:
  # Level 1: CRITICAL - Complete removal
  attributes/block-critical:
    actions:
      - key: user.password
        action: delete
      - key: user.ssn
        action: delete
      - key: user.credit_card
        action: delete
      - key: db.connection_string
        action: delete
      - key: auth.token
        action: delete
      - key: api.secret
        action: delete

  # Level 2: HIGH - Hash for correlation
  attributes/hash-high:
    actions:
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
      - key: customer.account_number
        action: hash
      - key: session.id
        action: hash

  # Level 3: MEDIUM - Pattern-based masking via OTTL
  transform/mask-medium:
    trace_statements:
      - context: span
        statements:
          # Mask IP addresses: 192.168.1.100 -> 192.168.x.x
          - replace_pattern(attributes["net.peer.ip"], "([0-9]+\\.[0-9]+)\\.[0-9]+\\.[0-9]+", "$$1.x.x") where attributes["net.peer.ip"] != nil
          - replace_pattern(attributes["client.address"], "([0-9]+\\.[0-9]+)\\.[0-9]+\\.[0-9]+", "$$1.x.x") where attributes["client.address"] != nil
          # Mask phone numbers: keep area code, mask the rest
          - replace_pattern(attributes["user.phone"], "(\\+?[0-9]{1,3}[\\s.-]?\\(?[0-9]{3}\\)?)[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}", "$$1-XXX-XXXX") where attributes["user.phone"] != nil

  # Level 4: Catch-all regex scan for anything missed
  redaction/safety-net:
    allow_all_keys: true
    blocked_values:
      # SSN patterns that might appear in values
      - "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
      # Credit card patterns
      - "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b"
```

## Complete Configuration with All Levels

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # CRITICAL: Delete entirely
  attributes/block-critical:
    actions:
      - key: user.password
        action: delete
      - key: user.ssn
        action: delete
      - key: user.credit_card
        action: delete
      - key: db.connection_string
        action: delete
      - key: auth.token
        action: delete

  # HIGH: Hash with SHA-256
  attributes/hash-high:
    actions:
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
      - key: customer.account_number
        action: hash

  # MEDIUM: Partial masking with OTTL
  transform/mask-medium:
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["net.peer.ip"], "([0-9]+\\.[0-9]+)\\.[0-9]+\\.[0-9]+", "$$1.x.x") where attributes["net.peer.ip"] != nil
          - replace_pattern(attributes["client.address"], "([0-9]+\\.[0-9]+)\\.[0-9]+\\.[0-9]+", "$$1.x.x") where attributes["client.address"] != nil
    log_statements:
      - context: log
        statements:
          # Mask emails in log bodies: show domain only
          - replace_pattern(body, "[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})", "[MASKED]@$$1")
          # Mask IPs in log bodies
          - replace_pattern(body, "([0-9]+\\.[0-9]+)\\.[0-9]+\\.[0-9]+", "$$1.x.x")

  # SAFETY NET: Regex catch-all
  redaction/safety-net:
    allow_all_keys: true
    blocked_values:
      - "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
      - "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\\b"

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/block-critical, attributes/hash-high, transform/mask-medium, redaction/safety-net, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [attributes/block-critical, attributes/hash-high, transform/mask-medium, redaction/safety-net, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [attributes/block-critical, attributes/hash-high, batch]
      exporters: [otlp]
```

## Processing Order Matters

The cascade order is intentional:

1. **Block first** - remove the most dangerous data immediately so no downstream processor can accidentally leak it
2. **Hash second** - convert high-sensitivity identifiers to hashes while they still have their original values
3. **Mask third** - apply partial masking to medium-sensitivity data
4. **Safety net last** - catch anything the explicit rules missed

If you reverse the order (hash before block), you might hash a value that should have been deleted entirely. Keeping the strictest action first ensures correctness.

## Documenting Your Classification

Maintain a data classification document alongside your Collector config:

```yaml
# data-classification.yaml (documentation only, not a Collector config)
classifications:
  critical:
    description: "Must be completely removed"
    action: delete
    attributes:
      - user.password
      - user.ssn
      - user.credit_card
  high:
    description: "Hashed for correlation"
    action: hash
    attributes:
      - user.id
      - user.email
  medium:
    description: "Partially masked"
    action: mask
    attributes:
      - net.peer.ip
      - client.address
```

This document serves as the source of truth for your security team and makes it clear why each attribute gets the treatment it does.

## Automated Testing

Write integration tests that send known test data through the pipeline and verify the output:

```python
# Test that critical data is completely removed
def test_critical_data_blocked():
    span = create_test_span({"user.password": "secret123"})
    processed = send_through_pipeline(span)
    assert "user.password" not in processed.attributes

# Test that high-sensitivity data is hashed
def test_high_data_hashed():
    span = create_test_span({"user.id": "john@example.com"})
    processed = send_through_pipeline(span)
    assert processed.attributes["user.id"] != "john@example.com"
    assert len(processed.attributes["user.id"]) == 64  # SHA-256 hex length
```

Cascading redaction rules give you fine-grained control over how different types of sensitive data are handled. The layered approach ensures that each piece of data receives appropriate treatment based on its sensitivity classification.
