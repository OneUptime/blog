# How to Instrument PCI DSS-Compliant Payment Processing with OpenTelemetry While

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PCI DSS, Payment Processing, Data Redaction

Description: Instrument payment processing flows with OpenTelemetry while maintaining PCI DSS compliance by redacting cardholder data from traces and logs.

PCI DSS is clear: cardholder data must be protected wherever it exists. That includes your observability data. If your traces or logs contain full card numbers, CVVs, or other sensitive payment details, you are out of compliance. But you still need visibility into your payment processing pipeline. This post shows how to instrument payment flows with OpenTelemetry while ensuring cardholder data never leaks into your telemetry.

## The Problem

When you instrument a payment service with OpenTelemetry, it is tempting to log request and response payloads for debugging. But payment requests contain PANs (Primary Account Numbers), expiration dates, and sometimes CVVs. If these end up in your span attributes or log bodies, you have a PCI DSS violation that could cost your organization millions in fines and reputational damage.

## Building a Redaction Layer

The first step is to create a redaction exporter wrapper that strips sensitive data before it leaves your application.

```python
# pci_redaction.py

import re
from opentelemetry.sdk.trace import Event, ReadableSpan
from opentelemetry.sdk.trace.export import SpanExporter

# Patterns that match cardholder data
PAN_PATTERN = re.compile(r'\b(?:\d{4}[\s-]?){3}\d{4}\b')

# Attribute names that should never contain raw cardholder data
SENSITIVE_ATTRIBUTES = {
    'card.number', 'card.pan', 'card.cvv', 'card.cvc',
    'card.expiry', 'card.expiration', 'payment.card_number',
    'http.request.body', 'http.response.body',
}

def mask_pan(pan: str) -> str:
    """Mask a PAN, keeping only the last 4 digits (PCI DSS allows this)."""
    digits = re.sub(r'[\s-]', '', pan)
    if len(digits) >= 13:
        return '*' * (len(digits) - 4) + digits[-4:]
    return '****'

def redact_string(value: str) -> str:
    """Redact any cardholder data patterns found in a string."""
    result = PAN_PATTERN.sub(lambda m: mask_pan(m.group()), value)
    return result

def redact_attributes(attributes):
    """Return a redacted copy of an attributes mapping."""
    redacted = {}
    for key, value in dict(attributes or {}).items():
        if key.lower() in SENSITIVE_ATTRIBUTES:
            redacted[key] = "[REDACTED-PCI]"
        elif isinstance(value, str):
            redacted[key] = redact_string(value)
        else:
            redacted[key] = value
    return redacted

def redact_event(event: Event) -> Event:
    """Return a redacted copy of a span event."""
    return Event(
        name=event.name,
        attributes=redact_attributes(event.attributes),
        timestamp=event.timestamp,
    )

def redact_span(span: ReadableSpan) -> ReadableSpan:
    """Return a redacted copy of a completed span."""
    return ReadableSpan(
        name=span.name,
        context=span.context,
        parent=span.parent,
        resource=span.resource,
        attributes=redact_attributes(span.attributes),
        events=[redact_event(event) for event in span.events],
        links=span.links,
        kind=span.kind,
        instrumentation_info=span.instrumentation_info,
        status=span.status,
        start_time=span.start_time,
        end_time=span.end_time,
        instrumentation_scope=span.instrumentation_scope,
    )

class PCIRedactingExporter(SpanExporter):
    """Span exporter wrapper that redacts cardholder data before export."""

    def __init__(self, exporter: SpanExporter):
        self._exporter = exporter

    def export(self, spans):
        return self._exporter.export(tuple(redact_span(span) for span in spans))

    def shutdown(self):
        self._exporter.shutdown()

    def force_flush(self, timeout_millis=None):
        return self._exporter.force_flush(timeout_millis)
```

## Configuring the Tracer with Redaction

Wire the redacting exporter wrapper into your tracer provider so it runs before telemetry leaves the process.

```python
# tracing_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from pci_redaction import PCIRedactingExporter

def setup_pci_compliant_tracing():
    provider = TracerProvider()

    redacting_exporter = PCIRedactingExporter(
        OTLPSpanExporter(endpoint="otel-collector:4317")
    )

    # The batch processor exports spans to the collector
    batch_processor = BatchSpanProcessor(redacting_exporter)

    # Redaction happens in the exporter wrapper before spans leave the process
    provider.add_span_processor(batch_processor)

    trace.set_tracer_provider(provider)
    return trace.get_tracer("payment.processing")
```

## Instrumenting the Payment Flow Safely

Now we can instrument the payment processing pipeline, being intentional about what data we capture.

```python
# payment_service.py
tracer = setup_pci_compliant_tracing()

def process_payment(payment_request):
    with tracer.start_as_current_span("payment.process") as span:
        # Safe attributes - these are fine to capture
        span.set_attribute("payment.merchant_id", payment_request.merchant_id)
        span.set_attribute("payment.amount", payment_request.amount)
        span.set_attribute("payment.currency", payment_request.currency)
        span.set_attribute("payment.method", "card")

        # Capture only the BIN (first 6 digits) and last 4 - PCI allows this
        span.set_attribute("payment.card_bin", payment_request.card_number[:6])
        span.set_attribute("payment.card_last4", payment_request.card_number[-4:])
        span.set_attribute("payment.card_brand", detect_card_brand(payment_request.card_number))

        # NEVER set the full card number as an attribute
        # The redaction exporter is a safety net, not the primary control

        # Step 1: Tokenize the card
        with tracer.start_as_current_span("payment.tokenize") as token_span:
            token = tokenization_service.tokenize(payment_request.card_number)
            token_span.set_attribute("payment.token_id", token.id)
            # From this point forward, we only use the token

        # Step 2: Fraud screening
        with tracer.start_as_current_span("payment.fraud_check") as fraud_span:
            fraud_result = fraud_service.check(token, payment_request)
            fraud_span.set_attribute("payment.fraud.score", fraud_result.score)
            fraud_span.set_attribute("payment.fraud.decision", fraud_result.decision)
            fraud_span.set_attribute("payment.fraud.rules_triggered",
                str(fraud_result.triggered_rules))

            if fraud_result.decision == "decline":
                span.set_attribute("payment.outcome", "fraud_declined")
                return PaymentResult(status="declined", reason="fraud")

        # Step 3: Authorization with the card network
        with tracer.start_as_current_span("payment.authorize") as auth_span:
            auth_result = acquirer.authorize(token, payment_request.amount)
            auth_span.set_attribute("payment.auth.code", auth_result.auth_code)
            auth_span.set_attribute("payment.auth.response_code", auth_result.response_code)
            auth_span.set_attribute("payment.auth.network", auth_result.network)
            auth_span.set_attribute("payment.auth.issuer_response", auth_result.issuer_response)

        # Step 4: Record the transaction
        with tracer.start_as_current_span("payment.record") as record_span:
            txn = transaction_store.create(
                token=token,
                amount=payment_request.amount,
                auth_code=auth_result.auth_code,
                merchant_id=payment_request.merchant_id
            )
            record_span.set_attribute("payment.transaction_id", txn.id)

        span.set_attribute("payment.outcome", "approved")
        span.set_attribute("payment.transaction_id", txn.id)
        return PaymentResult(status="approved", transaction_id=txn.id)
```

## Handling Log Redaction

Traces are not the only concern. OpenTelemetry logs also need redaction.

```python
# pci_log_processor.py
from opentelemetry.sdk._logs import LogRecordProcessor
from pci_redaction import redact_attributes, redact_string

class PCILogRedactionProcessor(LogRecordProcessor):
    """Redact cardholder data from OpenTelemetry log records."""

    def __init__(self, next_processor):
        self._next = next_processor

    def on_emit(self, log_record):
        record = log_record.log_record

        # Redact the log body
        if isinstance(record.body, str):
            record.body = redact_string(record.body)

        # Redact log attributes
        if record.attributes:
            redacted = redact_attributes(record.attributes)
            record.attributes.clear()
            record.attributes.update(redacted)

        self._next.on_emit(log_record)

    def shutdown(self):
        self._next.shutdown()

    def force_flush(self, timeout_millis=30000):
        return self._next.force_flush(timeout_millis)
```

## Testing Your Redaction

Never trust redaction without testing it. Write tests that intentionally send cardholder data through the pipeline and verify it gets scrubbed.

```python
# test_redaction.py
def test_pan_redaction_in_span_attributes():
    """Verify that PANs are redacted from span attributes."""
    span = create_test_span()
    span.set_attribute("debug.request", "card=4111111111111111&amount=100")

    redacted_span = redact_span(span)

    # The full PAN should not appear anywhere
    assert "4111111111111111" not in str(redacted_span.attributes)
    # The last 4 should still be visible
    assert "1111" in redacted_span.attributes["debug.request"]

def test_cvv_not_in_attributes():
    """Verify that CVVs marked as sensitive are fully redacted."""
    span = create_test_span()
    span.set_attribute("card.cvv", "123")

    redacted_span = redact_span(span)

    assert redacted_span.attributes["card.cvv"] == "[REDACTED-PCI]"
```

## Defense in Depth

The redaction exporter is your last line of defense, not your only one. Follow these principles:

- Tokenize card data as early as possible in your pipeline.
- Use structured types that prevent accidental serialization of sensitive fields.
- Configure your OpenTelemetry collector to drop attributes matching sensitive patterns.
- Audit your telemetry data stores regularly for any cardholder data that slipped through.

By layering these controls, you get the observability you need for payment processing without putting your PCI DSS compliance at risk.
