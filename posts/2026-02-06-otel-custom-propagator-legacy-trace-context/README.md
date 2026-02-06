# How to Build a Custom Propagator for Legacy Trace Context Formats in Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Propagator, Trace Context, Legacy, Context Propagation

Description: Build a custom OpenTelemetry propagator that bridges legacy trace context formats used in your organization with the standard W3C Trace Context format.

Most organizations that have been doing distributed tracing for a while have a legacy trace context format. Maybe it is a custom `X-Request-ID` header, a proprietary correlation format, or an in-house trace header that predates W3C Trace Context. A custom propagator lets OpenTelemetry understand and propagate your legacy format alongside the standard one, enabling a gradual migration.

## What Propagators Do

Propagators handle two operations:

- **Inject**: Take the current trace context and write it into a carrier (HTTP headers, message metadata)
- **Extract**: Read trace context from a carrier and make it the current context

OpenTelemetry ships with W3C Trace Context and Baggage propagators. Your custom propagator handles your legacy format.

## The Legacy Format

Let's say your organization uses these headers:

```
X-MyCompany-Trace-ID: abc123def456
X-MyCompany-Span-ID: 789xyz
X-MyCompany-Sampled: 1
X-MyCompany-Baggage: key1=val1;key2=val2
```

## Python: Custom Propagator

```python
# legacy_propagator.py
from opentelemetry.context import Context, get_current
from opentelemetry.context.context import Context
from opentelemetry.propagators import textmap
from opentelemetry.trace import (
    SpanContext,
    TraceFlags,
    NonRecordingSpan,
    set_span_in_context,
    get_current_span,
)
from opentelemetry.trace.span import format_trace_id, format_span_id
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

# Header names used by our legacy tracing system
TRACE_ID_HEADER = "x-mycompany-trace-id"
SPAN_ID_HEADER = "x-mycompany-span-id"
SAMPLED_HEADER = "x-mycompany-sampled"
BAGGAGE_HEADER = "x-mycompany-baggage"


class LegacyPropagator(textmap.TextMapPropagator):
    """
    Propagator for the legacy MyCompany trace context format.
    This propagator extracts trace context from legacy headers and
    injects them back, enabling interoperability between old services
    using the legacy format and new services using W3C Trace Context.
    """

    @property
    def fields(self) -> set:
        """Return the set of header names this propagator uses."""
        return {
            TRACE_ID_HEADER,
            SPAN_ID_HEADER,
            SAMPLED_HEADER,
            BAGGAGE_HEADER,
        }

    def extract(
        self,
        carrier: textmap.CarrierT,
        context: Optional[Context] = None,
        getter: textmap.Getter = textmap.default_getter,
    ) -> Context:
        """Extract trace context from legacy headers."""
        if context is None:
            context = get_current()

        # Read the legacy trace ID
        trace_id_str = self._get_header(carrier, TRACE_ID_HEADER, getter)
        span_id_str = self._get_header(carrier, SPAN_ID_HEADER, getter)

        if not trace_id_str or not span_id_str:
            # No legacy context found, return unchanged context
            return context

        try:
            # Convert legacy IDs to OpenTelemetry format
            # Our legacy system uses hex strings but may be shorter than
            # the standard 32/16 characters. Pad them.
            trace_id = self._convert_trace_id(trace_id_str)
            span_id = self._convert_span_id(span_id_str)

            # Read sampling decision
            sampled_str = self._get_header(carrier, SAMPLED_HEADER, getter)
            is_sampled = sampled_str == "1" or sampled_str == "true"
            trace_flags = TraceFlags(TraceFlags.SAMPLED if is_sampled else TraceFlags.DEFAULT)

            # Create a SpanContext from the legacy headers
            span_context = SpanContext(
                trace_id=trace_id,
                span_id=span_id,
                is_remote=True,
                trace_flags=trace_flags,
            )

            if not span_context.is_valid:
                logger.debug("Invalid legacy trace context extracted")
                return context

            # Wrap in a NonRecordingSpan and set in context
            span = NonRecordingSpan(span_context)
            return set_span_in_context(span, context)

        except (ValueError, TypeError) as e:
            logger.debug(f"Failed to extract legacy trace context: {e}")
            return context

    def inject(
        self,
        carrier: textmap.CarrierT,
        context: Optional[Context] = None,
        setter: textmap.Setter = textmap.default_setter,
    ) -> None:
        """Inject current trace context into legacy headers."""
        span = get_current_span(context)
        span_context = span.get_span_context()

        if not span_context.is_valid:
            return

        # Convert OpenTelemetry IDs to our legacy format
        trace_id_hex = format_trace_id(span_context.trace_id)
        span_id_hex = format_span_id(span_context.span_id)

        # Our legacy system expects uppercase hex
        setter.set(carrier, TRACE_ID_HEADER, trace_id_hex.upper())
        setter.set(carrier, SPAN_ID_HEADER, span_id_hex.upper())

        # Set sampling flag
        is_sampled = span_context.trace_flags & TraceFlags.SAMPLED
        setter.set(carrier, SAMPLED_HEADER, "1" if is_sampled else "0")

    def _get_header(self, carrier, name, getter):
        """Safely extract a single header value."""
        values = getter.get(carrier, name)
        if values:
            return values[0] if isinstance(values, list) else values
        return None

    def _convert_trace_id(self, legacy_id: str) -> int:
        """Convert a legacy trace ID string to a 128-bit integer."""
        # Remove any dashes or non-hex characters
        clean_id = legacy_id.replace("-", "").strip()
        # Pad to 32 hex characters (128 bits)
        padded = clean_id.zfill(32)
        return int(padded, 16)

    def _convert_span_id(self, legacy_id: str) -> int:
        """Convert a legacy span ID string to a 64-bit integer."""
        clean_id = legacy_id.replace("-", "").strip()
        # Pad to 16 hex characters (64 bits)
        padded = clean_id.zfill(16)
        return int(padded, 16)
```

## Using the Propagator

Register it as a composite propagator alongside W3C Trace Context:

```python
# main.py
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.propagators.textmap import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from legacy_propagator import LegacyPropagator

# Use both W3C and legacy propagators
# The composite propagator tries each one during extraction
# and injects using all of them
propagator = CompositePropagator([
    TraceContextTextMapPropagator(),  # Standard W3C
    W3CBaggagePropagator(),           # Standard baggage
    LegacyPropagator(),               # Our legacy format
])

set_global_textmap(propagator)
```

Now when a request comes in:
- If it has W3C headers, those are used
- If it has legacy headers (and no W3C), those are used
- When making outgoing requests, both W3C and legacy headers are injected

This means legacy services can still participate in traces while new services use the standard format.

## Java Equivalent

```java
// LegacyPropagator.java
public class LegacyPropagator implements TextMapPropagator {

    private static final String TRACE_ID_HEADER = "x-mycompany-trace-id";
    private static final String SPAN_ID_HEADER = "x-mycompany-span-id";
    private static final String SAMPLED_HEADER = "x-mycompany-sampled";

    @Override
    public Collection<String> fields() {
        return List.of(TRACE_ID_HEADER, SPAN_ID_HEADER, SAMPLED_HEADER);
    }

    @Override
    public <C> void inject(io.opentelemetry.context.Context context,
                           C carrier, TextMapSetter<C> setter) {
        Span span = Span.fromContext(context);
        SpanContext sc = span.getSpanContext();
        if (!sc.isValid()) return;

        setter.set(carrier, TRACE_ID_HEADER, sc.getTraceId().toUpperCase());
        setter.set(carrier, SPAN_ID_HEADER, sc.getSpanId().toUpperCase());
        setter.set(carrier, SAMPLED_HEADER, sc.isSampled() ? "1" : "0");
    }

    @Override
    public <C> io.opentelemetry.context.Context extract(
            io.opentelemetry.context.Context context,
            C carrier, TextMapGetter<C> getter) {

        String traceId = getter.get(carrier, TRACE_ID_HEADER);
        String spanId = getter.get(carrier, SPAN_ID_HEADER);

        if (traceId == null || spanId == null) return context;

        // Pad IDs to standard lengths
        traceId = padLeft(traceId.replace("-", ""), 32);
        spanId = padLeft(spanId.replace("-", ""), 16);

        String sampled = getter.get(carrier, SAMPLED_HEADER);
        TraceFlags flags = "1".equals(sampled)
            ? TraceFlags.getSampled()
            : TraceFlags.getDefault();

        SpanContext sc = SpanContext.createFromRemoteParent(
            traceId, spanId, flags, TraceState.getDefault()
        );

        return context.with(Span.wrap(sc));
    }
}
```

## Migration Strategy

The dual-propagator approach enables a clean migration path:

1. **Phase 1**: New services use both propagators. Legacy services only use legacy headers.
2. **Phase 2**: Update legacy services to send both W3C and legacy headers.
3. **Phase 3**: All services send both. Verify all traces are complete.
4. **Phase 4**: Remove the legacy propagator from new services.
5. **Phase 5**: Remove legacy header support entirely.

## Wrapping Up

Custom propagators bridge the gap between legacy tracing systems and OpenTelemetry. By running both propagators in parallel, you get a seamless migration path where legacy and modern services coexist in the same distributed trace. The key is to handle edge cases gracefully: malformed headers, missing fields, and different ID lengths should all be handled without crashing.
