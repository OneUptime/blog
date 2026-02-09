# How to Build a Custom Error Severity Classifier Using OpenTelemetry Span Attributes and Log Severity Levels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Severity, Classification, Logs

Description: Build a custom error severity classifier that combines OpenTelemetry span attributes with log severity levels for precise alerting.

Not every error deserves a page at 3 AM. A timeout hitting a cache layer is different from a timeout hitting your payment processor. This post shows how to build an error severity classifier that uses OpenTelemetry span attributes and correlated log severity levels to determine how urgent an error actually is.

## Severity Dimensions

Error severity is not one-dimensional. A useful classifier considers multiple factors:

1. **System impact**: Is the service fully down or partially degraded?
2. **User impact**: How many users are affected?
3. **Business impact**: Does this affect revenue-generating operations?
4. **Recoverability**: Can the system retry or fall back?

We will encode these dimensions using OpenTelemetry span attributes and log records.

## Setting Up the Attribute Schema

Define a consistent set of attributes that your services should attach to error spans:

```python
# severity_attributes.py - Standard attributes for severity classification
"""
Attribute schema for error severity classification.
All services should attach these to error spans where applicable.
"""

SEVERITY_ATTRIBUTES = {
    # Business impact attributes
    "error.affects_revenue": bool,      # Does this error path involve money?
    "error.affects_auth": bool,         # Does this block user authentication?
    "error.affects_data_integrity": bool,  # Could this corrupt data?

    # Recoverability attributes
    "error.retryable": bool,            # Can this operation be retried?
    "error.has_fallback": bool,         # Is there a fallback path?
    "error.transient": bool,            # Is this likely a temporary issue?

    # Scope attributes
    "error.scope": str,                 # "request", "user", "service", "global"
    "error.affected_operation": str,    # What high-level operation failed
}
```

## Building the Classifier

```python
# severity_classifier.py
from enum import IntEnum
from dataclasses import dataclass

class Severity(IntEnum):
    """Severity levels from least to most urgent."""
    DEBUG = 0
    INFO = 1
    WARNING = 2
    ERROR = 3
    CRITICAL = 4
    FATAL = 5

@dataclass
class SeverityResult:
    level: Severity
    reason: str
    should_page: bool
    should_alert: bool

class ErrorSeverityClassifier:
    """
    Classifies error severity based on span attributes,
    exception information, and correlated log severity.
    """

    def classify(self, span_attrs, exception_attrs, log_severity=None):
        """
        Determine severity from span and exception data.

        Args:
            span_attrs: Dict of span attributes
            exception_attrs: Dict from the exception span event
            log_severity: Optional severity from correlated log records

        Returns:
            SeverityResult with level and routing info
        """
        score = 0
        reasons = []

        # Factor 1: Business impact (highest weight)
        if span_attrs.get("error.affects_revenue"):
            score += 40
            reasons.append("affects revenue")

        if span_attrs.get("error.affects_data_integrity"):
            score += 35
            reasons.append("data integrity risk")

        if span_attrs.get("error.affects_auth"):
            score += 30
            reasons.append("blocks authentication")

        # Factor 2: Recoverability (reduces severity if recoverable)
        if span_attrs.get("error.retryable"):
            score -= 15
            reasons.append("retryable")

        if span_attrs.get("error.has_fallback"):
            score -= 10
            reasons.append("has fallback")

        if span_attrs.get("error.transient"):
            score -= 10
            reasons.append("likely transient")

        # Factor 3: Error scope
        scope = span_attrs.get("error.scope", "request")
        scope_scores = {
            "request": 5,
            "user": 15,
            "service": 25,
            "global": 40,
        }
        score += scope_scores.get(scope, 5)
        reasons.append(f"scope: {scope}")

        # Factor 4: Exception type heuristics
        exc_type = exception_attrs.get("exception.type", "")
        if "OutOfMemory" in exc_type or "OOM" in exc_type:
            score += 30
            reasons.append("memory exhaustion")
        elif "Timeout" in exc_type:
            score += 10
            reasons.append("timeout")
        elif "Connection" in exc_type:
            score += 15
            reasons.append("connection failure")

        # Factor 5: Correlated log severity
        if log_severity:
            log_severity_upper = log_severity.upper()
            log_scores = {
                "FATAL": 40,
                "ERROR": 15,
                "WARN": 5,
                "INFO": 0,
                "DEBUG": -5,
            }
            score += log_scores.get(log_severity_upper, 0)

        # Map score to severity level
        severity = self._score_to_severity(score)

        return SeverityResult(
            level=severity,
            reason="; ".join(reasons),
            should_page=(severity >= Severity.CRITICAL),
            should_alert=(severity >= Severity.WARNING),
        )

    def _score_to_severity(self, score):
        if score >= 60:
            return Severity.FATAL
        elif score >= 45:
            return Severity.CRITICAL
        elif score >= 25:
            return Severity.ERROR
        elif score >= 10:
            return Severity.WARNING
        elif score >= 0:
            return Severity.INFO
        else:
            return Severity.DEBUG
```

## Integrating with OpenTelemetry Spans

```python
# instrumented_service.py
from opentelemetry import trace
from severity_classifier import ErrorSeverityClassifier

tracer = trace.get_tracer("payment-service")
classifier = ErrorSeverityClassifier()

def process_payment(payment_id, amount):
    with tracer.start_as_current_span("process-payment") as span:
        # Set business context attributes upfront
        span.set_attribute("error.affects_revenue", True)
        span.set_attribute("error.affected_operation", "payment_processing")
        span.set_attribute("payment.amount", amount)

        try:
            result = gateway.charge(payment_id, amount)
            span.set_status(trace.StatusCode.OK)
            return result

        except GatewayTimeoutError as e:
            span.set_attribute("error.retryable", True)
            span.set_attribute("error.transient", True)
            span.set_attribute("error.scope", "request")

            span.record_exception(e)

            # Classify the severity
            severity = classifier.classify(
                span_attrs=dict(span.attributes),
                exception_attrs={
                    "exception.type": type(e).__name__,
                    "exception.message": str(e),
                },
            )

            span.set_attribute("error.severity", severity.level.name)
            span.set_attribute("error.should_page", severity.should_page)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise

        except GatewayPermanentError as e:
            span.set_attribute("error.retryable", False)
            span.set_attribute("error.transient", False)
            span.set_attribute("error.scope", "service")

            span.record_exception(e)

            severity = classifier.classify(
                span_attrs=dict(span.attributes),
                exception_attrs={
                    "exception.type": type(e).__name__,
                    "exception.message": str(e),
                },
            )

            span.set_attribute("error.severity", severity.level.name)
            span.set_attribute("error.should_page", severity.should_page)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Correlating with Log Severity

OpenTelemetry logs can be correlated with spans via trace ID. Pull in the log severity as an additional signal:

```python
# log_correlation.py
import logging
from opentelemetry import trace

logger = logging.getLogger("payment-service")

def process_with_log_correlation(payment_id):
    with tracer.start_as_current_span("process-payment") as span:
        try:
            result = do_work(payment_id)
            return result
        except Exception as e:
            # The log severity gives additional context to the classifier
            # A CRITICAL log alongside an error span means something
            # very different from an INFO log alongside an error span
            logger.critical(
                "Payment gateway is completely unreachable",
                extra={"payment_id": payment_id},
            )

            severity = classifier.classify(
                span_attrs=dict(span.attributes),
                exception_attrs={"exception.type": type(e).__name__},
                log_severity="CRITICAL",
            )

            span.set_attribute("error.severity", severity.level.name)
            raise
```

## Routing Based on Severity

With severity classified, route alerts accordingly:

```yaml
# alertmanager routing based on severity attribute
route:
  routes:
    - match:
        error_severity: "FATAL"
      receiver: "pagerduty-critical"
    - match:
        error_severity: "CRITICAL"
      receiver: "pagerduty-high"
    - match:
        error_severity: "ERROR"
      receiver: "slack-errors"
    - match:
        error_severity: "WARNING"
      receiver: "slack-warnings"
```

## Conclusion

A severity classifier that combines span attributes, exception data, and log severity produces more accurate urgency levels than any single signal alone. By encoding business context (revenue impact, recoverability) directly into span attributes, you give the classifier the information it needs to make smart routing decisions. The result: critical errors page immediately while low-severity issues wait for business hours.
