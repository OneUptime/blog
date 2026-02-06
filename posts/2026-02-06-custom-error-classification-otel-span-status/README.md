# How to Build Custom Error Classification Logic Using OpenTelemetry Span Status Codes and Exception Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Classification, Span Status, Exception Handling

Description: Build custom error classification logic using OpenTelemetry span status codes and exception attributes for smarter alerting.

Not all errors are equal. A `NullPointerException` deep in a logging module is very different from a `PaymentProcessingException` in your checkout flow. OpenTelemetry gives you the raw materials to classify errors programmatically: span status codes, exception attributes, and custom span attributes. This post shows how to build classification logic that categorizes errors by severity, impact, and type so your team can focus on what actually matters.

## Understanding OpenTelemetry Error Signals

OpenTelemetry provides three mechanisms for recording errors on spans:

1. **Span Status**: `UNSET`, `OK`, or `ERROR`. This is the high-level indicator.
2. **Exception Events**: Created via `span.recordException()`, containing `exception.type`, `exception.message`, and `exception.stacktrace`.
3. **Custom Attributes**: Any key-value pairs you attach to spans, like `error.category` or `error.severity`.

We will use all three to build a classifier.

## Defining Error Categories

First, define the categories you care about. Here is a practical starting point:

```python
# error_categories.py - Define your error classification rules
from enum import Enum

class ErrorCategory(Enum):
    CRITICAL = "critical"       # Payment failures, data corruption
    HIGH = "high"               # Auth failures, service unavailable
    MEDIUM = "medium"           # Timeout errors, rate limiting
    LOW = "low"                 # Validation errors, not found
    NOISE = "noise"             # Expected errors, health check failures

class ErrorClassifier:
    """
    Classifies errors based on OpenTelemetry span data.
    Rules are evaluated top-to-bottom; first match wins.
    """

    def __init__(self):
        # Map exception types to categories
        self.type_rules = {
            "PaymentProcessingError": ErrorCategory.CRITICAL,
            "DataCorruptionError": ErrorCategory.CRITICAL,
            "AuthenticationError": ErrorCategory.HIGH,
            "ServiceUnavailableError": ErrorCategory.HIGH,
            "TimeoutError": ErrorCategory.MEDIUM,
            "RateLimitError": ErrorCategory.MEDIUM,
            "ValidationError": ErrorCategory.LOW,
            "NotFoundError": ErrorCategory.LOW,
        }

        # Map HTTP status codes to categories
        self.http_status_rules = {
            range(500, 600): ErrorCategory.HIGH,
            range(429, 430): ErrorCategory.MEDIUM,
            range(400, 500): ErrorCategory.LOW,
        }

    def classify(self, span_data):
        """
        Classify an error based on span status, exception events,
        and span attributes. Returns an ErrorCategory.
        """
        # Rule 1: Check exception type against known categories
        for event in span_data.get("events", []):
            if event.get("name") == "exception":
                exc_type = event.get("attributes", {}).get("exception.type", "")
                if exc_type in self.type_rules:
                    return self.type_rules[exc_type]

        # Rule 2: Check HTTP status code
        http_status = span_data.get("attributes", {}).get("http.status_code")
        if http_status:
            for status_range, category in self.http_status_rules.items():
                if http_status in status_range:
                    return category

        # Rule 3: Check span attributes for custom classification
        custom_severity = span_data.get("attributes", {}).get("error.severity")
        if custom_severity:
            try:
                return ErrorCategory(custom_severity)
            except ValueError:
                pass

        # Rule 4: Check if this is a known noisy endpoint
        span_name = span_data.get("name", "")
        noisy_patterns = ["/health", "/readiness", "/metrics"]
        if any(pattern in span_name for pattern in noisy_patterns):
            return ErrorCategory.NOISE

        # Default: if the span has ERROR status but no other signals
        if span_data.get("status_code") == "ERROR":
            return ErrorCategory.MEDIUM

        return ErrorCategory.LOW
```

## Building a Classification Span Processor

Now integrate the classifier into the OpenTelemetry pipeline using a custom span processor:

```python
# classifying_processor.py
from opentelemetry.sdk.trace import SpanProcessor
from error_categories import ErrorClassifier

class ClassifyingSpanProcessor(SpanProcessor):
    """
    Processes completed spans, classifies any errors,
    and enriches spans with classification attributes.
    """

    def __init__(self, downstream_processor):
        self.classifier = ErrorClassifier()
        self.downstream = downstream_processor

    def on_start(self, span, parent_context=None):
        self.downstream.on_start(span, parent_context)

    def on_end(self, span):
        # Only classify spans that have an error status
        if span.status.status_code.name == "ERROR":
            span_data = self._extract_span_data(span)
            category = self.classifier.classify(span_data)

            # We cannot modify a span after it ends, so we log
            # the classification. In practice, use a metrics counter.
            self._record_classification(span, category)

        self.downstream.on_end(span)

    def _extract_span_data(self, span):
        """Convert a ReadableSpan into a dict for the classifier."""
        events = []
        for event in span.events:
            events.append({
                "name": event.name,
                "attributes": dict(event.attributes) if event.attributes else {},
            })

        return {
            "name": span.name,
            "status_code": span.status.status_code.name,
            "attributes": dict(span.attributes) if span.attributes else {},
            "events": events,
        }

    def _record_classification(self, span, category):
        """Record the classification as a metric or log entry."""
        service = span.resource.attributes.get("service.name", "unknown")
        print(
            f"[ErrorClassification] service={service} "
            f"span={span.name} category={category.value}"
        )

    def shutdown(self):
        self.downstream.shutdown()

    def force_flush(self, timeout_millis=None):
        self.downstream.force_flush(timeout_millis)
```

## Instrumenting Your Code with Classification Hints

Sometimes the span processor cannot determine severity from the exception type alone. In those cases, add classification hints directly in your application code:

```python
# payment_service.py
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")

def charge_customer(customer_id, amount):
    with tracer.start_as_current_span("charge-customer") as span:
        span.set_attribute("customer.id", customer_id)
        span.set_attribute("payment.amount", amount)

        try:
            result = payment_gateway.charge(customer_id, amount)
            return result
        except PaymentDeclinedError as e:
            # This is a business logic error, not a system error
            span.set_attribute("error.severity", "low")
            span.set_attribute("error.business_impact", "payment_declined")
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
        except PaymentGatewayTimeoutError as e:
            # This could affect many customers if the gateway is down
            span.set_attribute("error.severity", "critical")
            span.set_attribute("error.business_impact", "gateway_outage")
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Routing Alerts Based on Classification

Once errors are classified, you can route alerts differently. Critical errors page the on-call engineer. Low errors go to a Slack channel for review during business hours. Noise gets filtered out entirely.

This classification approach scales well because the rules live in code. You can version them, test them, and update them as your system evolves. And because it is built on standard OpenTelemetry primitives, it works with any backend.

## Wrapping Up

Custom error classification using OpenTelemetry span data turns noisy error streams into actionable signals. By combining span status codes, exception attributes, and custom metadata, you can automatically categorize errors by severity and route them to the right team with the right urgency.
