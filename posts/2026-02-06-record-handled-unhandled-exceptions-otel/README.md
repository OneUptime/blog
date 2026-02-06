# How to Configure OpenTelemetry to Record Both Handled and Unhandled Exceptions with Stack Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Exception Handling, Stack Traces, Instrumentation

Description: Configure OpenTelemetry to capture both handled and unhandled exceptions with full stack traces for complete error visibility.

Most OpenTelemetry tutorials show you how to record exceptions that you explicitly catch. But what about the ones that slip through your error handling? Unhandled exceptions that crash a request or kill a process are often the most critical, and they are the easiest to miss in your telemetry. This post covers how to set up OpenTelemetry to capture both handled and unhandled exceptions with full stack traces.

## Handled vs Unhandled: Why It Matters

A handled exception is one your code catches and deals with. Maybe it returns a 400 to the client or retries the operation. An unhandled exception is one that bubbles up past your error handling and crashes the request (or worse, the process). The distinction matters because:

- Handled exceptions are expected. They represent known failure modes.
- Unhandled exceptions are bugs. They represent unknown failure modes.

Your alerting strategy should treat them differently.

## Recording Handled Exceptions

This is the straightforward case. You catch the exception and record it:

```python
# handled_exceptions.py
from opentelemetry import trace

tracer = trace.get_tracer("user-service")

def get_user(user_id):
    with tracer.start_as_current_span("get-user") as span:
        span.set_attribute("user.id", user_id)

        try:
            user = database.find_user(user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")
            return user
        except ValueError as e:
            # This is a handled exception - we know about this case
            span.record_exception(e, attributes={
                "exception.escaped": False,  # Did not escape the span
                "error.handled": True,
                "error.expected": True,
            })
            span.set_status(trace.StatusCode.ERROR, str(e))
            return None
        except DatabaseConnectionError as e:
            # This is also handled, but less expected
            span.record_exception(e, attributes={
                "exception.escaped": False,
                "error.handled": True,
                "error.expected": False,
            })
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise  # Re-raise for the caller to handle
```

## Catching Unhandled Exceptions Globally

For unhandled exceptions, you need a global catch mechanism. Here is how to set it up for different frameworks.

### Flask

```python
# flask_error_handling.py
from flask import Flask, request
from opentelemetry import trace

app = Flask(__name__)
tracer = trace.get_tracer("flask-service")

@app.errorhandler(Exception)
def handle_unhandled_exception(error):
    """
    Catch all exceptions that were not handled by route handlers.
    Record them as unhandled exceptions on the current span.
    """
    span = trace.get_current_span()

    if span and span.is_recording():
        span.record_exception(error, attributes={
            "exception.escaped": True,
            "error.handled": False,
            "error.expected": False,
            "http.route": request.url_rule.rule if request.url_rule else "unknown",
        })
        span.set_status(
            trace.StatusCode.ERROR,
            f"Unhandled exception: {type(error).__name__}: {error}"
        )

    return {"error": "Internal server error"}, 500
```

### Express.js

```javascript
// express_error_handling.js
const { trace, SpanStatusCode } = require("@opentelemetry/api");
const express = require("express");

const app = express();

// Your routes go here
app.get("/api/data", async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err); // Pass to error handler
  }
});

// Global error handler - catches everything that was not handled
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();

  if (span) {
    // Record as unhandled exception
    span.recordException(err);
    span.setAttribute("error.handled", false);
    span.setAttribute("exception.escaped", true);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Unhandled: ${err.message}`,
    });
  }

  res.status(500).json({ error: "Internal server error" });
});
```

### Process-Level Uncaught Exceptions (Node.js)

```javascript
// process_error_handling.js - Catch truly unhandled exceptions
const { trace, SpanStatusCode } = require("@opentelemetry/api");

// These exceptions bypassed ALL error handling
process.on("uncaughtException", (error) => {
  const span = trace.getActiveSpan();

  if (span) {
    span.recordException(error);
    span.setAttribute("error.handled", false);
    span.setAttribute("error.fatal", true);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Fatal: ${error.message}`,
    });
    span.end();
  }

  // Log it before the process dies
  console.error("Uncaught exception:", error);

  // Give the span exporter time to flush
  setTimeout(() => process.exit(1), 1000);
});

// Same for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  const span = trace.getActiveSpan();

  if (span) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    span.recordException(error);
    span.setAttribute("error.handled", false);
    span.setAttribute("error.promise_rejection", true);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Unhandled rejection: ${error.message}`,
    });
  }
});
```

## Enriching Stack Traces

The default `record_exception` captures the stack trace, but you can enrich it with additional context:

```python
# enriched_exceptions.py
import traceback
import sys
from opentelemetry import trace

def record_enriched_exception(span, exception):
    """
    Record an exception with additional context beyond
    what record_exception provides by default.
    """
    # Get the full traceback chain (including cause and context)
    tb_lines = traceback.format_exception(
        type(exception), exception, exception.__traceback__
    )
    full_stacktrace = "".join(tb_lines)

    # Record with enriched attributes
    span.record_exception(exception, attributes={
        "exception.stacktrace": full_stacktrace,
        # Add local variable context from the frame where the error occurred
        "exception.frame_locals": str(
            exception.__traceback__.tb_frame.f_locals
            if exception.__traceback__ else {}
        )[:1000],  # Limit size
        "python.version": sys.version,
    })

    span.set_status(trace.StatusCode.ERROR, str(exception))
```

## Filtering in Your Dashboards

With `error.handled` and `exception.escaped` attributes on your spans, you can build separate dashboard panels and alerts:

```promql
# Rate of unhandled exceptions (the scary ones)
sum(rate(traces_spanmetrics_calls_total{
  status_code="STATUS_CODE_ERROR",
  error_handled="false"
}[5m]))

# Rate of handled exceptions (expected failures)
sum(rate(traces_spanmetrics_calls_total{
  status_code="STATUS_CODE_ERROR",
  error_handled="true"
}[5m]))
```

Alert aggressively on unhandled exceptions. Alert gently on handled ones.

## Conclusion

Recording both handled and unhandled exceptions gives you complete error visibility. Handled exceptions tell you about known failure modes. Unhandled exceptions tell you about bugs. By tagging them differently and routing them to separate alert policies, your team can prioritize the errors that actually need immediate attention while still tracking the ones that represent normal failure handling.
