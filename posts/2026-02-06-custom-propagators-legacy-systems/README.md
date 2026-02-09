# How to Build Custom Propagators for Legacy Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Propagators, Legacy Systems, Context Propagation, Distributed Tracing, Migration

Description: Learn how to build custom OpenTelemetry propagators that bridge trace context with legacy systems using proprietary header formats.

---

Not every system speaks W3C Trace Context or B3. Legacy applications, homegrown service meshes, and third-party platforms often use proprietary header formats for request correlation. If you need OpenTelemetry to participate in traces that flow through these systems, the built-in propagators will not help. You need to build your own. This post walks through the OpenTelemetry propagator interface, shows you how to implement custom propagators for real-world legacy formats, and covers how to integrate them into your existing setup.

## When You Need a Custom Propagator

Before writing custom code, it is worth checking whether a community-maintained propagator already exists for your format. OpenTelemetry has official propagators for W3C Trace Context, B3 (Zipkin), Jaeger, AWS X-Ray, and OT Trace (OpenTracing). If your system uses any of these, use the existing package.

Custom propagators make sense when your system uses a format that no existing propagator handles. Common examples include:

- Internal correlation ID headers like `X-Request-Id` or `X-Correlation-Id` that predate modern tracing standards
- Vendor-specific headers from commercial API gateways or service meshes
- Custom binary or encoded formats used by legacy middleware
- Database or message queue metadata fields that carry trace context

## The Propagator Interface

In OpenTelemetry, a propagator implements the `TextMapPropagator` interface. This interface has three methods.

```python
from opentelemetry.context.propagation import TextMapPropagator
from opentelemetry.propagators import textmap

class MyPropagator(TextMapPropagator):

    def inject(self, carrier, context=None, setter=textmap.default_setter):
        """Write trace context into the carrier (e.g., HTTP headers)."""
        pass

    def extract(self, carrier, context=None, getter=textmap.default_getter):
        """Read trace context from the carrier and return a new context."""
        pass

    @property
    def fields(self):
        """Return the set of header names this propagator may write."""
        return set()
```

The `inject` method writes trace context into an outgoing carrier (usually HTTP headers). The `extract` method reads trace context from an incoming carrier and returns a context object. The `fields` property declares which header names this propagator uses, which helps middleware and proxies know which headers to preserve.

The `carrier` parameter is the object that holds the headers. For HTTP, this is typically a dictionary. The `getter` and `setter` parameters abstract access to the carrier, so the same propagator can work with different carrier types.

## Example: X-Request-Id Propagator

Let us build a propagator for a common legacy pattern: the `X-Request-Id` header. Many older systems use this single header to correlate requests across services. It is not as rich as a full trace context (no span ID, no sampling flag), but we can map it to OpenTelemetry's trace ID to maintain continuity.

```python
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.context.propagation import TextMapPropagator
from opentelemetry.propagators import textmap
from opentelemetry.trace import NonRecordingSpan, SpanContext, TraceFlags
import hashlib

# Header name used by the legacy system
_REQUEST_ID_HEADER = "X-Request-Id"


class RequestIdPropagator(TextMapPropagator):
    """Propagator that bridges X-Request-Id with OpenTelemetry trace context.

    This propagator maps a legacy request ID to an OpenTelemetry trace ID
    by hashing the request ID into a 128-bit value. This ensures deterministic
    mapping: the same request ID always produces the same trace ID.
    """

    def _request_id_to_trace_id(self, request_id):
        """Convert a string request ID to a 128-bit trace ID.

        Uses MD5 hashing to produce a deterministic 128-bit value.
        MD5 is fine here because we need distribution, not cryptographic security.
        """
        hash_bytes = hashlib.md5(request_id.encode()).digest()
        # Convert 16 bytes to a 128-bit integer
        return int.from_bytes(hash_bytes, byteorder='big')

    def _trace_id_to_request_id(self, trace_id):
        """Convert a trace ID back to a hex string for the legacy header.

        Since we cannot reverse the hash, we use the trace ID hex as the
        request ID when propagating to legacy systems.
        """
        return format(trace_id, '032x')

    def extract(self, carrier, context=None, getter=textmap.default_getter):
        """Extract trace context from the X-Request-Id header."""
        if context is None:
            context = Context()

        # Read the X-Request-Id header from the carrier
        request_id_list = getter.get(carrier, _REQUEST_ID_HEADER)
        if not request_id_list:
            return context

        request_id = request_id_list[0] if isinstance(request_id_list, list) else request_id_list
        if not request_id:
            return context

        # Convert the request ID to a trace ID
        trace_id = self._request_id_to_trace_id(request_id)

        # Create a SpanContext with the derived trace ID
        # We use a zero span ID since X-Request-Id has no span concept
        # The SAMPLED flag is set because the legacy system sent the header
        span_context = SpanContext(
            trace_id=trace_id,
            span_id=0x1,  # Placeholder span ID
            is_remote=True,
            trace_flags=TraceFlags(TraceFlags.SAMPLED),
        )

        # Wrap in a NonRecordingSpan and set it in the context
        span = NonRecordingSpan(span_context)
        return trace.set_span_in_context(span, context)

    def inject(self, carrier, context=None, setter=textmap.default_setter):
        """Inject the trace ID as an X-Request-Id header."""
        span = trace.get_current_span(context)
        span_context = span.get_span_context()

        # Only inject if we have a valid trace context
        if not span_context.is_valid:
            return

        # Convert the trace ID to the request ID format
        request_id = self._trace_id_to_request_id(span_context.trace_id)
        setter.set(carrier, _REQUEST_ID_HEADER, request_id)

    @property
    def fields(self):
        """Declare the headers this propagator may modify."""
        return {_REQUEST_ID_HEADER}
```

This propagator does a few interesting things. On extraction, it hashes the incoming request ID to produce a deterministic trace ID. This means the same `X-Request-Id` value always maps to the same trace ID, which keeps things consistent. On injection, it writes the trace ID as the `X-Request-Id` value so legacy systems downstream can read it.

Let us test it.

```python
from opentelemetry.propagate import set_global_textmap, inject, extract

# Use our custom propagator
set_global_textmap(RequestIdPropagator())

# Simulate extracting from a legacy request
incoming_headers = {"X-Request-Id": "req-abc-123-def-456"}
ctx = extract(incoming_headers)

# Verify the context was extracted
span = trace.get_current_span(ctx)
span_ctx = span.get_span_context()
print(f"Extracted trace ID: {format(span_ctx.trace_id, '032x')}")
print(f"Is remote: {span_ctx.is_remote}")

# Simulate injecting into an outgoing request
outgoing_headers = {}
inject(outgoing_headers, context=ctx)
print(f"Injected header: {outgoing_headers}")
```

## Example: Custom Encoded Header Propagator

Some legacy systems use more complex header formats. Here is a propagator for a hypothetical system that encodes trace context as a Base64 JSON payload in a single header.

```python
import json
import base64
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.context.propagation import TextMapPropagator
from opentelemetry.propagators import textmap
from opentelemetry.trace import NonRecordingSpan, SpanContext, TraceFlags

_LEGACY_HEADER = "X-Legacy-Trace"


class LegacyEncodedPropagator(TextMapPropagator):
    """Propagator for a legacy system that uses Base64-encoded JSON trace context.

    Expected format: Base64 encoded JSON with fields:
    {
        "tid": "trace-id-hex-string",
        "sid": "span-id-hex-string",
        "sample": true/false
    }
    """

    def extract(self, carrier, context=None, getter=textmap.default_getter):
        """Decode the legacy header and create an OpenTelemetry context."""
        if context is None:
            context = Context()

        # Read the header
        header_values = getter.get(carrier, _LEGACY_HEADER)
        if not header_values:
            return context

        header_value = header_values[0] if isinstance(header_values, list) else header_values
        if not header_value:
            return context

        try:
            # Decode the Base64 JSON payload
            decoded = base64.b64decode(header_value)
            data = json.loads(decoded)

            # Parse the trace ID and span ID from hex strings
            trace_id = int(data["tid"], 16)
            span_id = int(data["sid"], 16)
            sampled = data.get("sample", True)

            # Build the span context
            flags = TraceFlags.SAMPLED if sampled else TraceFlags.DEFAULT
            span_context = SpanContext(
                trace_id=trace_id,
                span_id=span_id,
                is_remote=True,
                trace_flags=TraceFlags(flags),
            )

            span = NonRecordingSpan(span_context)
            return trace.set_span_in_context(span, context)

        except (ValueError, KeyError, json.JSONDecodeError) as e:
            # If the header is malformed, return the context unchanged
            # Log the error in production
            print(f"Failed to parse legacy trace header: {e}")
            return context

    def inject(self, carrier, context=None, setter=textmap.default_setter):
        """Encode trace context as Base64 JSON and inject into the carrier."""
        span = trace.get_current_span(context)
        span_context = span.get_span_context()

        if not span_context.is_valid:
            return

        # Build the JSON payload
        data = {
            "tid": format(span_context.trace_id, '032x'),
            "sid": format(span_context.span_id, '016x'),
            "sample": bool(span_context.trace_flags & TraceFlags.SAMPLED),
        }

        # Encode as Base64 JSON
        encoded = base64.b64encode(json.dumps(data).encode()).decode()
        setter.set(carrier, _LEGACY_HEADER, encoded)

    @property
    def fields(self):
        return {_LEGACY_HEADER}
```

The error handling in the `extract` method is important. Legacy systems may send malformed data, and your propagator should handle that gracefully by returning the context unchanged rather than crashing.

## Integrating Custom Propagators with Composite Setup

Custom propagators slot into composite propagators just like built-in ones. This lets you support your legacy format alongside standard formats.

```python
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator

# Combine standard and custom propagators
propagator = CompositePropagator([
    TraceContextTextMapPropagator(),   # Modern services
    W3CBaggagePropagator(),            # Baggage support
    RequestIdPropagator(),             # Legacy X-Request-Id systems
    LegacyEncodedPropagator(),         # Legacy encoded format
])

set_global_textmap(propagator)
```

With this setup, outgoing requests carry headers for all four formats. Incoming requests are parsed regardless of which format they use.

## Registering Custom Propagators with Entry Points

If you want your custom propagator to be configurable via the `OTEL_PROPAGATORS` environment variable, you need to register it as a Python entry point.

```python
# In your setup.py or pyproject.toml

# setup.py approach
from setuptools import setup

setup(
    name="my-custom-propagators",
    version="1.0.0",
    packages=["my_propagators"],
    entry_points={
        # Register propagators under the opentelemetry_propagator group
        "opentelemetry_propagator": [
            "request_id = my_propagators:RequestIdPropagator",
            "legacy_encoded = my_propagators:LegacyEncodedPropagator",
        ],
    },
)
```

```toml
# pyproject.toml approach
[project.entry-points.opentelemetry_propagator]
request_id = "my_propagators:RequestIdPropagator"
legacy_encoded = "my_propagators:LegacyEncodedPropagator"
```

After installing the package, you can reference your custom propagators in the environment variable.

```bash
# Now you can use the custom propagator name in OTEL_PROPAGATORS
export OTEL_PROPAGATORS=tracecontext,baggage,request_id,legacy_encoded
```

## Testing Custom Propagators

Thorough testing is critical for custom propagators because bugs here break all distributed tracing. Here is a test pattern that covers the essential cases.

```python
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.trace import SpanContext, TraceFlags, NonRecordingSpan

# Assuming RequestIdPropagator is imported

provider = TracerProvider()
trace.set_tracer_provider(provider)


class TestRequestIdPropagator:
    """Test suite for the X-Request-Id custom propagator."""

    def setup_method(self):
        self.propagator = RequestIdPropagator()

    def test_extract_valid_header(self):
        """Verify extraction from a valid X-Request-Id header."""
        carrier = {"X-Request-Id": "abc-123"}
        ctx = self.propagator.extract(carrier)
        span = trace.get_current_span(ctx)
        assert span.get_span_context().trace_id != 0

    def test_extract_missing_header(self):
        """Verify extraction returns empty context when header is missing."""
        carrier = {}
        ctx = self.propagator.extract(carrier)
        span = trace.get_current_span(ctx)
        # Should return an invalid span context
        assert not span.get_span_context().is_valid

    def test_extract_empty_header(self):
        """Verify extraction handles empty header value gracefully."""
        carrier = {"X-Request-Id": ""}
        ctx = self.propagator.extract(carrier)
        span = trace.get_current_span(ctx)
        assert not span.get_span_context().is_valid

    def test_inject_with_active_span(self):
        """Verify injection writes X-Request-Id when a span is active."""
        tracer = trace.get_tracer("test")
        with tracer.start_as_current_span("test-span") as span:
            carrier = {}
            self.propagator.inject(carrier)
            assert "X-Request-Id" in carrier
            assert len(carrier["X-Request-Id"]) == 32  # 128-bit hex

    def test_inject_without_active_span(self):
        """Verify injection does nothing when no span is active."""
        carrier = {}
        self.propagator.inject(carrier)
        assert "X-Request-Id" not in carrier

    def test_deterministic_mapping(self):
        """Verify the same request ID always produces the same trace ID."""
        carrier = {"X-Request-Id": "deterministic-test-123"}
        ctx1 = self.propagator.extract(carrier)
        ctx2 = self.propagator.extract(carrier)

        tid1 = trace.get_current_span(ctx1).get_span_context().trace_id
        tid2 = trace.get_current_span(ctx2).get_span_context().trace_id
        assert tid1 == tid2

    def test_fields_property(self):
        """Verify the fields property returns the correct header names."""
        assert "X-Request-Id" in self.propagator.fields
```

Run these tests with pytest and make sure they all pass before deploying your custom propagator.

## Handling Non-HTTP Carriers

So far we have assumed HTTP headers, but propagators can work with any text-based carrier. Message queues (Kafka headers, RabbitMQ properties) and gRPC metadata are other common carriers. The getter and setter abstractions make this possible.

```python
# Custom getter for Kafka message headers
class KafkaGetter(textmap.Getter):
    def get(self, carrier, key):
        """Read a header value from Kafka message headers."""
        # Kafka headers are a list of (key, value) tuples
        # where values are bytes
        values = []
        for header_key, header_value in carrier:
            if header_key == key:
                values.append(header_value.decode('utf-8'))
        return values or None

    def keys(self, carrier):
        """Return all header keys."""
        return list(set(key for key, _ in carrier))

# Custom setter for Kafka message headers
class KafkaSetter(textmap.Setter):
    def set(self, carrier, key, value):
        """Write a header value to Kafka message headers."""
        # Carrier is a mutable list of (key, value) tuples
        carrier.append((key, value.encode('utf-8')))

# Usage with any propagator
kafka_headers = []
propagator.inject(kafka_headers, setter=KafkaSetter())

# Later, on the consumer side
ctx = propagator.extract(kafka_headers, getter=KafkaGetter())
```

By implementing custom getters and setters, your propagator works with any carrier type without changing the propagation logic itself.

## Wrapping Up

Building custom propagators lets you extend OpenTelemetry's distributed tracing to systems that predate modern standards. The `TextMapPropagator` interface is straightforward: implement `extract` to read context from incoming requests, `inject` to write context into outgoing requests, and `fields` to declare your headers. Handle errors gracefully, test thoroughly, and plug your custom propagator into a composite setup alongside the standard propagators.

The goal is not to keep legacy formats alive forever. Custom propagators are a migration bridge. They let you bring legacy systems into your OpenTelemetry traces today, giving you end-to-end visibility while you work toward migrating everything to standard formats. Once the legacy system is updated or replaced, you can retire the custom propagator and simplify your configuration.
