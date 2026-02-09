# How to Use OpenTelemetry Exception Semantic Conventions to Standardize Error Recording Across Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, Exception Handling, Standardization

Description: Use OpenTelemetry exception semantic conventions to create consistent error recording patterns across all your services.

When you have 20 different services written by 10 different teams, errors get recorded in 20 different ways. One team sets `error.message` on the span. Another records a span event named `error` with a `stack` attribute. A third just sets the span status to ERROR with no additional context. This inconsistency makes it nearly impossible to build reliable dashboards or alerting rules.

OpenTelemetry solves this with exception semantic conventions: a standard set of attribute names and recording patterns that every service should follow. This post covers what those conventions are and how to enforce them across your organization.

## The Exception Semantic Conventions

OpenTelemetry defines a specific way to record exceptions as span events. The convention requires:

1. The event name must be `exception`.
2. The event must include these attributes:
   - `exception.type`: The fully qualified class name of the exception (e.g., `java.lang.NullPointerException`).
   - `exception.message`: The exception message string.
3. Optionally:
   - `exception.stacktrace`: The full stack trace as a string.
   - `exception.escaped`: Boolean indicating whether the exception escaped the span scope.

## Correct vs Incorrect Recording

Here is what correct exception recording looks like in different languages:

```python
# Python - CORRECT way to record exceptions
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def process_order(order_id):
    with tracer.start_as_current_span("process-order") as span:
        try:
            result = validate_and_submit(order_id)
            return result
        except ValueError as e:
            # recordException follows the semantic conventions automatically
            # It sets exception.type, exception.message, and exception.stacktrace
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

```javascript
// JavaScript - CORRECT way to record exceptions
const { trace, SpanStatusCode } = require("@opentelemetry/api");

const tracer = trace.getTracer("order-service");

async function processOrder(orderId) {
  const span = tracer.startSpan("process-order");
  try {
    const result = await validateAndSubmit(orderId);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    // recordException handles semantic conventions
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

And here is what teams often do wrong:

```python
# WRONG - Do not do this
# Using non-standard attribute names
span.set_attribute("error", True)
span.set_attribute("error.msg", str(e))
span.set_attribute("error.stack", traceback.format_exc())

# WRONG - Do not do this either
# Creating a non-standard event name
span.add_event("error_occurred", {"message": str(e)})
```

## Building a Validation Layer

To enforce conventions, build a validation wrapper that checks exception recording:

```python
# validated_tracer.py - Wrapper that enforces exception semantic conventions
from opentelemetry import trace
import traceback

class ValidatedSpan:
    """
    Wraps an OpenTelemetry span and ensures exception recording
    follows semantic conventions.
    """

    def __init__(self, span):
        self._span = span

    def record_exception(self, exception, attributes=None, escaped=False):
        """
        Record an exception following OpenTelemetry semantic conventions.
        Validates that all required fields are present.
        """
        # Use the built-in recordException which handles conventions
        self._span.record_exception(
            exception,
            attributes=attributes,
            escaped=escaped,
        )

        # Always set span status to ERROR when recording an exception
        self._span.set_status(
            trace.StatusCode.ERROR,
            str(exception),
        )

    def add_event(self, name, attributes=None):
        """
        Intercept add_event to catch non-standard error recording.
        """
        # Warn if someone tries to use a non-standard error event
        if name in ("error", "error_occurred", "failure"):
            print(
                f"WARNING: Non-standard error event name '{name}'. "
                f"Use span.record_exception() instead."
            )
            # Convert to proper exception event format
            if attributes and "message" in attributes:
                self._span.add_event("exception", {
                    "exception.type": attributes.get("type", "Error"),
                    "exception.message": attributes.get("message", ""),
                    "exception.stacktrace": attributes.get(
                        "stacktrace", ""
                    ),
                })
                return

        self._span.add_event(name, attributes)

    def __getattr__(self, name):
        """Delegate everything else to the wrapped span."""
        return getattr(self._span, name)

    def __enter__(self):
        self._span.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Auto-record unhandled exceptions that escape the span
        if exc_type is not None:
            self.record_exception(exc_val, escaped=True)
        return self._span.__exit__(exc_type, exc_val, exc_tb)
```

## Creating a Shared Error Recording Library

For organizations with multiple services, ship a shared library that wraps the common patterns:

```python
# shared_otel_errors.py - Shared library for standardized error recording
from opentelemetry import trace

def record_error(span, exception, extra_attributes=None):
    """
    Standard error recording function for all services.
    Follows OpenTelemetry exception semantic conventions.

    Args:
        span: The active OpenTelemetry span
        exception: The exception to record
        extra_attributes: Optional dict of additional attributes
    """
    # Record the exception with semantic conventions
    attrs = {}
    if extra_attributes:
        attrs.update(extra_attributes)

    span.record_exception(exception, attributes=attrs)
    span.set_status(trace.StatusCode.ERROR, str(exception))

    # Add standard error classification attributes
    span.set_attribute("error.handled", True)
    span.set_attribute(
        "exception.type.simple",
        type(exception).__name__,
    )


def record_unhandled_error(span, exception):
    """Record an unhandled exception that escaped the span scope."""
    span.record_exception(exception, escaped=True)
    span.set_status(trace.StatusCode.ERROR, str(exception))
    span.set_attribute("error.handled", False)
```

## Validating with the Collector

You can also use the OpenTelemetry Collector to validate and normalize incoming spans. The `transform` processor can check for non-standard error attributes and rewrite them:

```yaml
# otel-collector-config.yaml
processors:
  transform:
    error_mode: ignore
    trace_statements:
      - context: spanevent
        conditions:
          # Find non-standard error events and normalize them
          - 'name == "error" or name == "error_occurred"'
        statements:
          - 'set(name, "exception")'
```

## Conclusion

Consistent error recording is the foundation of reliable error tracking. OpenTelemetry's exception semantic conventions give you the standard. By using `record_exception()` consistently, wrapping it in shared libraries, and validating at the collector level, you can ensure every service in your organization records errors the same way. This consistency makes dashboards, alerts, and error grouping actually work across your entire fleet.
