# How to Implement a Custom SpanProcessor That Adds Request-Scoped Attributes at Span End Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SpanProcessor, Request Context, SDK

Description: Build a custom OpenTelemetry SpanProcessor that adds request-scoped attributes to spans at end time for complete request context.

Some attributes are not available when a span starts. The HTTP response status code, the number of database rows returned, or the total bytes processed are only known when the operation completes. While you can set these in your application code before calling `span.end()`, a custom SpanProcessor can centralize this logic and ensure every span gets the right attributes automatically at end time.

## The Challenge with on_end

In the OpenTelemetry SDK, the `on_end` callback receives a `ReadableSpan`, which is immutable. You cannot add attributes in `on_end`. The trick is to use a different approach: store the data you want to add, and inject it into the span before `end()` is called, or use the `on_start` callback to install hooks.

There is a better pattern: use a SpanProcessor that works with a context-based attribute store.

## The Attribute Store Pattern

```python
# attribute_store.py
import threading
from contextvars import ContextVar
from typing import Dict, Any

# Context variable for request-scoped attributes
# Each async task or thread gets its own value
_request_attributes: ContextVar[Dict[str, Any]] = ContextVar(
    'request_attributes', default=None
)


class RequestAttributeStore:
    """Thread-safe, context-aware store for request-scoped attributes.

    Attributes added here will be applied to spans by the
    RequestAttributeProcessor at span end time.
    """

    @staticmethod
    def initialize():
        """Start a new attribute collection for this request."""
        _request_attributes.set({})

    @staticmethod
    def set(key: str, value: Any):
        """Add an attribute for the current request context."""
        attrs = _request_attributes.get(None)
        if attrs is not None:
            attrs[key] = value

    @staticmethod
    def get_all() -> Dict[str, Any]:
        """Get all attributes for the current request context."""
        return _request_attributes.get(None) or {}

    @staticmethod
    def clear():
        """Clear attributes after the request completes."""
        _request_attributes.set(None)
```

## The Custom SpanProcessor

```python
# request_attribute_processor.py
from opentelemetry.sdk.trace import SpanProcessor
from attribute_store import RequestAttributeStore


class RequestAttributeProcessor(SpanProcessor):
    """Applies request-scoped attributes to spans.

    This processor reads attributes from the RequestAttributeStore
    at span start and installs a finalizer that reads additional
    attributes that were set during the span's lifetime.

    Since on_end receives a read-only span, we use a wrapper
    approach: store pending attributes and apply them via
    middleware before the span ends.
    """

    def __init__(self, attribute_keys=None):
        """
        Args:
            attribute_keys: Optional list of keys to include.
                          If None, all keys from the store are included.
        """
        self._attribute_keys = set(attribute_keys) if attribute_keys else None

    def on_start(self, span, parent_context=None):
        # Apply any attributes already set for this request
        attrs = RequestAttributeStore.get_all()
        for key, value in attrs.items():
            if self._attribute_keys is None or key in self._attribute_keys:
                span.set_attribute(key, value)

    def on_end(self, span):
        # on_end is read-only, so we cannot modify the span here
        # Attributes must be set before span.end() is called
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        return True
```

## A Better Approach: Span Finalizer Middleware

Since we cannot modify spans in `on_end`, the practical approach is middleware that adds attributes right before `span.end()`:

```python
# middleware.py
from flask import Flask, request, g
from opentelemetry import trace, context
from attribute_store import RequestAttributeStore

app = Flask(__name__)


@app.before_request
def before():
    """Initialize the attribute store for this request."""
    RequestAttributeStore.initialize()

    # Set attributes that are known at request start
    RequestAttributeStore.set("http.request.id",
                               request.headers.get("X-Request-ID", ""))
    RequestAttributeStore.set("http.user_agent",
                               request.headers.get("User-Agent", ""))


@app.after_request
def after(response):
    """Add response-scoped attributes to the current span before it ends."""
    span = trace.get_current_span()
    if span and span.is_recording():
        # Add attributes that are only available after processing
        span.set_attribute("http.response.status_code", response.status_code)
        span.set_attribute("http.response.content_length",
                          response.content_length or 0)

        # Add any attributes that were collected during request processing
        for key, value in RequestAttributeStore.get_all().items():
            span.set_attribute(key, value)

    RequestAttributeStore.clear()
    return response


@app.route("/api/orders/<order_id>")
def get_order(order_id):
    # During request processing, add attributes as they become known
    RequestAttributeStore.set("order.id", order_id)

    order = fetch_order(order_id)

    # This attribute is only known after the DB query
    RequestAttributeStore.set("order.item_count", len(order["items"]))
    RequestAttributeStore.set("order.total_amount", order["total"])

    return order
```

## Java: End-Time Attribute Injection

Java's SpanProcessor gives you a `ReadWriteSpan` in `onStart`, which you can use to set up attribute injection:

```java
import io.opentelemetry.sdk.trace.SpanProcessor;
import io.opentelemetry.sdk.trace.ReadWriteSpan;
import io.opentelemetry.sdk.trace.ReadableSpan;
import io.opentelemetry.context.Context;

public class RequestAttributeProcessor implements SpanProcessor {

    // ThreadLocal storage for request-scoped attributes
    private static final ThreadLocal<Map<String, Object>> REQUEST_ATTRS =
        ThreadLocal.withInitial(HashMap::new);

    public static void setAttribute(String key, Object value) {
        REQUEST_ATTRS.get().put(key, value);
    }

    public static void clear() {
        REQUEST_ATTRS.get().clear();
    }

    @Override
    public void onStart(Context parentContext, ReadWriteSpan span) {
        // Apply already-set attributes from the request context
        Map<String, Object> attrs = REQUEST_ATTRS.get();
        for (Map.Entry<String, Object> entry : attrs.entrySet()) {
            if (entry.getValue() instanceof String) {
                span.setAttribute(entry.getKey(), (String) entry.getValue());
            } else if (entry.getValue() instanceof Long) {
                span.setAttribute(entry.getKey(), (Long) entry.getValue());
            }
        }
    }

    @Override
    public boolean isStartRequired() {
        return true;
    }

    @Override
    public void onEnd(ReadableSpan span) {
        // Cannot modify span here - read only
    }

    @Override
    public boolean isEndRequired() {
        return false;
    }
}
```

## Integration with the TracerProvider

```python
# setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from request_attribute_processor import RequestAttributeProcessor

provider = TracerProvider()

# Add the request attribute processor first
provider.add_span_processor(RequestAttributeProcessor(
    attribute_keys=["http.request.id", "order.id", "order.item_count"]
))

# Then add the export processor
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://collector:4317", insecure=True)
))

trace.set_tracer_provider(provider)
```

## Testing the Processor

```python
def test_request_attributes_applied():
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor
    from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(RequestAttributeProcessor())
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    tracer = provider.get_tracer("test")

    # Simulate a request
    RequestAttributeStore.initialize()
    RequestAttributeStore.set("user.id", "user-123")

    with tracer.start_as_current_span("handle_request") as span:
        # Attributes set via the store during processing
        RequestAttributeStore.set("result.count", 42)
        # Apply remaining attributes before span ends
        for k, v in RequestAttributeStore.get_all().items():
            span.set_attribute(k, v)

    RequestAttributeStore.clear()

    spans = exporter.get_finished_spans()
    attrs = dict(spans[0].attributes)
    assert attrs["user.id"] == "user-123"
    assert attrs["result.count"] == 42
```

The combination of a context-aware attribute store and middleware integration gives you a clean way to add attributes to spans throughout the request lifecycle, even when the values are not known at span creation time.
