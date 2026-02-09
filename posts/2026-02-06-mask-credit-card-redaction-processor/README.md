# How to Mask Credit Card Numbers in OpenTelemetry Span Attributes Using the Redaction Processor Regex Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Redaction Processor, PII, Credit Cards, Data Masking

Description: Use the OpenTelemetry Collector redaction processor with regex patterns to mask credit card numbers in span attributes before export.

If your application handles payment data, there is a real chance that credit card numbers end up in your telemetry. A developer might accidentally log a full card number in a span attribute, or an ORM might include it in a database query attribute. The redaction processor in the OpenTelemetry Collector lets you catch and mask these before they leave your infrastructure.

## The Problem

Consider a payment service that creates spans with attributes like these:

```
payment.card_number: "4532015112830366"
payment.amount: "49.99"
db.statement: "INSERT INTO payments (card_num, amount) VALUES ('4532015112830366', 49.99)"
```

That card number should never reach your observability backend. PCI DSS requires that you protect cardholder data, and your trace storage is almost certainly not PCI-compliant.

## Setting Up the Redaction Processor

The redaction processor is available in the OpenTelemetry Collector Contrib distribution. It works by scanning attribute values against regex patterns and either blocking, masking, or hashing matches.

```yaml
processors:
  redaction/credit-cards:
    # Allow all attribute keys by default
    allow_all_keys: true
    # Define blocked patterns using regex
    blocked_values:
      # Visa card numbers (starts with 4, 13 or 16 digits)
      - "\\b4[0-9]{12}(?:[0-9]{3})?\\b"
      # Mastercard (starts with 51-55 or 2221-2720)
      - "\\b5[1-5][0-9]{14}\\b"
      - "\\b2(?:2[2-9][1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[01][0-9]|720)[0-9]{12}\\b"
      # American Express (starts with 34 or 37)
      - "\\b3[47][0-9]{13}\\b"
      # Discover (starts with 6011, 65, or 644-649)
      - "\\b6(?:011|5[0-9]{2})[0-9]{12}\\b"
```

When the processor finds a match, it replaces the value with `****`.

## Complete Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  redaction/credit-cards:
    allow_all_keys: true
    blocked_values:
      # Match credit card patterns with optional separators
      # Cards with spaces: 4532 0151 1283 0366
      - "\\b4[0-9]{3}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}\\b"
      - "\\b5[1-5][0-9]{2}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}\\b"
      - "\\b3[47][0-9]{2}[\\s-]?[0-9]{6}[\\s-]?[0-9]{5}\\b"
      - "\\b6(?:011|5[0-9]{2})[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}\\b"

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [redaction/credit-cards, batch]
      exporters: [otlp]
```

## Handling Different Card Number Formats

Credit card numbers appear in several formats in practice. Your regex needs to handle all of them:

```
# No separators
4532015112830366

# Space-separated groups
4532 0151 1283 0366

# Dash-separated groups
4532-0151-1283-0366

# Embedded in longer strings
"Processing card 4532015112830366 for order #123"
```

The regex patterns above handle the first three formats. For card numbers embedded in longer strings (like SQL queries), the word boundary `\b` anchors will still match because digits next to non-digit characters form a word boundary.

## Testing Your Redaction Rules

Before deploying to production, test your patterns with the debug exporter:

```yaml
exporters:
  debug:
    verbosity: detailed
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces/test:
      receivers: [otlp]
      processors: [redaction/credit-cards]
      exporters: [debug]
```

Send test spans with known card numbers and verify the debug output shows masked values:

```python
from opentelemetry import trace

tracer = trace.get_tracer("test-redaction")

# Test span with credit card numbers
with tracer.start_as_current_span("test-payment") as span:
    # These should all be redacted
    span.set_attribute("card.visa", "4532015112830366")
    span.set_attribute("card.mastercard", "5425233430109903")
    span.set_attribute("card.amex", "374245455400126")
    span.set_attribute("card.with_spaces", "4532 0151 1283 0366")
    span.set_attribute("db.statement",
        "INSERT INTO payments (card) VALUES ('4532015112830366')")
    # This should NOT be redacted
    span.set_attribute("order.id", "ORD-123456789")
```

## Combining with Key-Based Blocking

For defense in depth, you can also block specific attribute keys that should never contain card data:

```yaml
processors:
  redaction/credit-cards:
    # Only allow specific safe keys
    allowed_keys:
      - "http.method"
      - "http.url"
      - "http.status_code"
      - "service.name"
      - "order.id"
      - "payment.amount"
      - "payment.currency"
    # Keys matching these patterns are blocked entirely
    blocked_keys:
      - ".*card.*number.*"
      - ".*credit.*card.*"
      - ".*pan.*"
      - ".*ccn.*"
    # Value patterns are still checked on allowed keys
    blocked_values:
      - "\\b4[0-9]{12}(?:[0-9]{3})?\\b"
      - "\\b5[1-5][0-9]{14}\\b"
      - "\\b3[47][0-9]{13}\\b"
```

This two-layer approach blocks keys that are obviously card-related and also scans allowed keys for accidental card number inclusion.

## Performance Considerations

Regex matching on every attribute of every span adds CPU overhead. If your Collector handles high throughput, keep your regex patterns as specific as possible and consider placing the redaction processor after a sampling processor to reduce the number of spans that need scanning.

Masking credit card data at the Collector level is a safety net, not a replacement for fixing the application code. When you see redacted values in your traces, treat it as a signal to go fix the instrumentation that is leaking card data in the first place.
