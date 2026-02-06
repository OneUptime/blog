# How to Troubleshoot Attribute Value Truncation When Span Attribute Length Exceeds the SDK Default Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Attributes, Truncation, SDK

Description: Troubleshoot and fix span attribute value truncation caused by SDK attribute length limits that silently cut long values.

You set a span attribute with a full SQL query, a request body, or a stack trace, but when you view the span in your backend, the value is cut off mid-sentence. The SDK is silently truncating attribute values that exceed the configured length limit. This post explains how to detect, configure, and work around this behavior.

## Understanding Attribute Length Limits

The OpenTelemetry SDK has configurable limits on attribute value length. While the default varies by SDK implementation, many set no limit by default, but the OTEL specification recommends backends and SDKs consider reasonable limits. Some SDKs and auto-instrumentation configurations set explicit limits.

```python
# Check the current limit in Python
from opentelemetry.sdk.trace import TracerProvider

provider = TracerProvider()
# Default SpanLimits - max_attribute_length may be None (unlimited)
# But auto-instrumentation or environment variables might set it
```

```bash
# Environment variable that controls this
OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT=1024  # Truncate values longer than 1024 characters
```

## Detecting Truncation

Truncation is silent. The SDK does not log a warning when it truncates a value. You have to notice the truncated data in your backend:

```python
# You set this
span.set_attribute("db.statement", "SELECT * FROM users WHERE id IN (1, 2, 3, ... 1000)")

# But in the backend, you see:
# db.statement: "SELECT * FROM users WHERE id IN (1, 2, 3, ... 50"  (truncated!)
```

To verify truncation is happening:

```python
import os
limit = os.environ.get("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT")
print(f"Attribute length limit: {limit}")

# If a limit is set and your values are longer, they will be truncated
```

## Fix 1: Increase or Remove the Length Limit

```bash
# Remove the limit entirely (no truncation)
unset OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT

# Or increase it to accommodate your longest values
export OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT=4096
```

In code:

```python
from opentelemetry.sdk.trace import TracerProvider, SpanLimits

provider = TracerProvider(
    span_limits=SpanLimits(
        max_attribute_length=4096,  # Allow up to 4096 characters
        # Or set to None for unlimited (be careful with memory)
    )
)
```

For Go:

```go
provider := trace.NewTracerProvider(
    trace.WithSpanLimits(trace.SpanLimits{
        AttributeValueLengthLimit: 4096,
    }),
)
```

For Java:

```bash
export OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT=4096
```

## Fix 2: Truncate Intentionally with Context

Instead of relying on silent truncation, truncate values yourself with meaningful context:

```python
def safe_attribute(value, max_length=2048):
    """Truncate with an indication that truncation occurred."""
    if value and len(str(value)) > max_length:
        return str(value)[:max_length - 20] + "... [TRUNCATED]"
    return str(value)

span.set_attribute("db.statement", safe_attribute(sql_query))
span.set_attribute("http.request.body", safe_attribute(request_body))
```

## Fix 3: Use Span Events for Long Data

If you need to attach large text data (like stack traces or request bodies), consider using span events instead of attributes. Events can carry longer data:

```python
# Instead of a long attribute
# span.set_attribute("error.stacktrace", long_stacktrace)

# Use an event
span.add_event("exception", {
    "exception.type": type(e).__name__,
    "exception.message": str(e),
    "exception.stacktrace": traceback.format_exc(),
})

# Or use record_exception which does this automatically
span.record_exception(e)
```

## Fix 4: Move Large Data to Logs

For very large payloads (request/response bodies, large SQL queries), consider using correlated logs instead of span attributes:

```python
import logging
from opentelemetry import trace

logger = logging.getLogger(__name__)

with tracer.start_as_current_span("handle-request") as span:
    # Store a reference in the span
    span.set_attribute("request.body.length", len(request.body))
    span.set_attribute("request.body.truncated", True)
    span.set_attribute("request.body.preview", request.body[:200])

    # Log the full body with trace correlation
    # The trace_id and span_id will be automatically added if
    # log instrumentation is configured
    logger.debug(f"Full request body: {request.body}")
```

## Fix 5: Configure Limits per Attribute in the Collector

The Collector's transform processor can handle truncation selectively:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Truncate specific attributes that tend to be long
          - truncate_all(attributes, 4096)
          # Or truncate specific attributes
          - set(attributes["db.statement"], Substring(attributes["db.statement"], 0, 2048))
            where attributes["db.statement"] != nil
```

## Common Attributes That Get Truncated

These attributes frequently exceed default limits:

| Attribute | Typical Size | Recommendation |
|-----------|-------------|----------------|
| `db.statement` | 100-10000 chars | Truncate to 2048, parameterize queries |
| `http.request.body` | 100-100000 chars | Store preview, log full body |
| `exception.stacktrace` | 500-5000 chars | Use `record_exception()`, increase limit |
| `http.url` | 100-2000 chars | Usually fine at 2048 |
| `messaging.message.body` | Variable | Store reference, not content |

## Checking the Collector's Limits

The Collector itself does not truncate attributes by default, but some exporters have payload size limits:

```yaml
exporters:
  otlp:
    endpoint: "backend:4317"
    # gRPC message size limit (default 4MB)
    # If your spans are too large due to long attributes,
    # exports might fail
```

If exports fail due to message size, you will see:

```
rpc error: code = ResourceExhausted desc = grpc: received message larger than max
```

In this case, you need to either reduce attribute sizes or increase the gRPC message limit.

## Best Practices

1. Set `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT` explicitly rather than relying on defaults
2. Parameterize SQL queries to reduce `db.statement` length
3. Use span events for exception details and stack traces
4. Use correlated logs for very large payloads
5. Always include an indication when you intentionally truncate data

Silent truncation is one of the most frustrating data quality issues because you do not know data is missing until you need it for debugging. Set your limits intentionally and handle long values explicitly.
