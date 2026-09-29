# How to Validate Untrusted `traceparent` and Trim `tracestate` at Public Ingress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Security, Context Propagation

Description: Validate incoming W3C trace context with a standard propagator and apply an explicit tracestate and sampling policy at public ingress.

A public request can supply a syntactically valid trace ID, a sampled flag, and vendor state of its own choosing. Parsing those values does not authenticate the caller. A useful ingress policy separates format validation, vendor-state forwarding, sampling, and application authorization.

Define whether the edge continues external traces or starts an internal trace. Continuing is useful for trusted integrations; restarting may better suit a public endpoint. Make that choice before automatic server instrumentation creates its span, using supported framework or agent hooks.

## Delegate protocol parsing

Use a maintained W3C propagator rather than a regular expression copied into middleware. Trace Context has rules for versions, zero identifiers, hexadecimal encoding, flags, and vendor-state ordering. Invalid `traceparent` cannot establish a remote parent; malformed `tracestate` must not by itself invalidate an otherwise valid parent. [W3C Trace Context](https://www.w3.org/TR/trace-context/)

At the HTTP server or proxy, bound request-header bytes and handle repeated fields according to the protocol. Header names are case-insensitive. A Python dictionary already flattened from a request cannot reveal whether an attacker originally supplied multiple `traceparent` fields, so reject ambiguous duplicates at the adapter boundary.

The following function assumes that normalization and duplicate handling are already complete. Its vendor allowlist and four-entry retention cap are example local policies, not W3C limits:

```python
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.trace import NonRecordingSpan, SpanContext, TraceState
from opentelemetry.trace.propagation.tracecontext import (
    TraceContextTextMapPropagator,
)

propagator = TraceContextTextMapPropagator()
ALLOWED_VENDORS = {"approvedvendor"}

def extract_public_parent(carrier):
    extracted = propagator.extract(carrier, context=Context())
    parent = trace.get_current_span(extracted).get_span_context()
    if not parent.is_valid:
        return Context()

    kept = [
        (key, value) for key, value in parent.trace_state.items()
        if key in ALLOWED_VENDORS
    ][:4]
    sanitized = SpanContext(
        trace_id=parent.trace_id,
        span_id=parent.span_id,
        is_remote=True,
        trace_flags=parent.trace_flags,
        trace_state=TraceState(kept),
    )
    return trace.set_span_in_context(NonRecordingSpan(sanitized), Context())
```

Use the returned context as the explicit parent of a manually created server span, or implement the same policy in the supported extraction hook of automatic instrumentation. Do not add a second server span after an agent has already extracted an unsanitized parent. The code deliberately extracts only W3C trace context and does not import arbitrary baggage. [Python trace-context propagator](https://github.com/open-telemetry/opentelemetry-python/blob/v1.41.1/opentelemetry-api/src/opentelemetry/trace/propagation/tracecontext.py)

This example assumes the boundary creates a server span, giving forwarded `traceparent` a new parent ID. A transparent proxy forwarding `traceparent` unchanged must also leave `tracestate` unchanged under the W3C mutation rules. Apply filtering through the tracing boundary described above rather than editing only one header in a pass-through path. [W3C mutation rules](https://www.w3.org/TR/trace-context/#mutating-the-traceparent-field)

## Trim state by members

Retain only vendor keys whose use is documented in your environment. Preserve the relative order of retained entries; do not truncate a raw header halfway through a member. If no external vendor state is required, an empty `TraceState` is simpler.

An allowed key is still untrusted input. Its value must not grant access, select another tenant, or become an unrestricted query. Avoid logging raw state while debugging, and test whether removing it changes a vendor's sampling or correlation behavior.

## Make the sampling choice separately

The example preserves the incoming sampling flag. With a default parent-based sampler, a valid sampled remote parent can therefore cause the local child to be sampled. At a public boundary, that may allow callers to increase telemetry volume.

Configure and test the remote-parent sampling branches explicitly, or deliberately start a new internal root using your local sampling policy. If policy permits, link that new root to the external context for diagnostics. Do not describe the sampled flag as proof that an upstream trace was actually stored. [OpenTelemetry sampling SDK](https://opentelemetry.io/docs/specs/otel/trace/sdk/)

## Test the policy before rollout

Use fixtures for missing headers, all-zero IDs, uppercase identifier characters, invalid lengths, unknown versions, duplicate vendor keys, excessive header sizes, sampled and unsampled parents, and unsupported vendor entries. Verify that an invalid trace header causes fresh tracing context rather than failing an otherwise valid business request, unless your HTTP security policy intentionally rejects the request itself.

Finally, inspect the server span's parent and the next outbound carrier. Sanitizing a temporary object is ineffective if another middleware later extracts the original header again. Keep one authoritative ingress extraction path and document the policy alongside its tests.

## Conclusion

A trust boundary needs a protocol parser and an explicit trust policy. Validate with the standard propagator, filter complete vendor-state members, choose how to handle external sampling, and confirm that instrumentation uses the sanitized result.
