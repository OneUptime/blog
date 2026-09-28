# Restore Trace Causality for Third-Party Callbacks Without traceparent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, API, Context Propagation

Description: Correlate authenticated third-party callbacks with persisted originating trace context when the provider does not return traceparent.

You submit a job to a third-party service. Minutes later, its webhook reports completion, but the callback contains no `traceparent`. Your incoming HTTP instrumentation starts a new trace, and the original request appears unrelated.

You cannot reconstruct the provider's internal spans from a job ID. You can restore your own causal relationship by persisting the originating trace context beside a verified provider job identifier, then linking callback processing to that context. Keep the callback's HTTP request lifetime separate from the earlier submission.

W3C trace context defines the propagation fields and their validation. An arbitrary business identifier is not a replacement trace ID, and a trace header is not an authentication credential. [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Persist the association before it can race

Store a record keyed by the provider, your tenant or account scope, and the provider job ID. Include the initiating carrier, local business operation ID, expected callback type, expiration, and idempotency state. Protect this record as application data.

If the provider accepts a client-generated correlation token, create and persist that token before submitting the job. When the provider assigns its own ID only in the submission response, callbacks can race the response or its database commit. Use a durable authenticated-event inbox and reconciliation workflow for initially unmatched callbacks. Do not attach them to whichever request happens to be active.

Choose a retention period that covers the provider's retry and delay contract. A callback arriving after trace retention can still update the business record even if its historical trace is no longer searchable.

## Save a standard carrier

This Python helper runs inside the operation whose context you intend to preserve. The SDK must already be configured. The explicit propagator captures trace context only; it does not copy arbitrary baggage:

```python
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

propagator = TraceContextTextMapPropagator()

def capture_origin():
    carrier = {}
    propagator.inject(carrier)
    return carrier
```

Persist the returned dictionary in the association record. If you capture it inside an outbound submission span, later processing points to that specific operation. Capturing it in a higher-level request span instead identifies a broader origin; choose and document the boundary. OpenTelemetry's Python propagation guide explains injection and extraction into carriers. [Python propagation](https://opentelemetry.io/docs/languages/python/propagation/)

## Authenticate first, then attach causality

Verify the provider's signature or other documented authentication scheme using the original request body as required by that provider. Check the timestamp or replay policy and tenant scope. Only then look up the association and claim the event through your normal idempotency mechanism.

The following helper instruments already authenticated and claimed business processing. It intentionally preserves any current callback server span as its parent, adding a link to the saved origin. `apply_event` represents the application's transaction or idempotent handler:

```python
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.trace import Link
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

tracer = trace.get_tracer("example.provider-callback")
propagator = TraceContextTextMapPropagator()

def process_verified_event(saved_carrier, operation_id, event, apply_event):
    extracted = propagator.extract(saved_carrier, context=Context())
    origin = trace.get_current_span(extracted).get_span_context()
    links = [Link(origin)] if origin.is_valid else []
    with tracer.start_as_current_span(
        "provider.callback.process", links=links,
        attributes={
            "app.operation.id": operation_id,
            "app.callback.origin_found": origin.is_valid,
        },
    ):
        return apply_event(event)
```

Extraction starts from an empty context so a missing or malformed saved carrier cannot silently substitute the current callback span as the origin. The processing span uses the current callback context normally. With no current span, it becomes a root itself. [Python trace API](https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html)

Do not try to change the parent of the automatically created HTTP server span after it has started. If a framework-specific design truly requires the callback server span to continue the old trace, the verified context must be selected before span creation, which is usually impractical for body-signature verification. A processing span with a link avoids that timing problem.

## Handle retries without changing history

Treat duplicate provider deliveries as new delivery attempts with the same business event identity. A unique database claim or equivalent transaction controls whether side effects run again. Trace relationships do not provide deduplication or authorization.

Keep unmatched or expired associations visible through bounded counters and operational logs. Continue according to the provider's retry contract; never guess an origin from a user email, a timestamp proximity, or an unverified request parameter.

## Verify four cases

Test a normal callback, a duplicate, an unknown job, and a malformed saved carrier. The normal case should retain the callback server trace and contain a link to the original span. The duplicate must not repeat side effects. The unknown and malformed cases must not link to an unrelated active request.

Also test a callback arriving before association persistence. It should enter the reconciliation path and become processable once the mapping exists. Export both trace IDs during a controlled test and inspect the link in raw telemetry, since UI rendering and retention may differ.

## Conclusion

Persist verified business correlation and trace context together, then add the historical context as a link during authenticated callback processing. This restores the causal trail without inventing missing third-party telemetry or extending the original request for minutes.
