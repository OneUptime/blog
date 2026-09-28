# Multi-Step User Journeys: Choose Trace, Session, and Business Correlation IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, User Journey, Observability

Description: Model multi-step user journeys with bounded traces and distinct session and business correlation identifiers instead of keeping one trace open indefinitely.

A checkout journey can include several page loads, a payment redirect, a delayed callback, and a retry the next morning. Those events belong to the same business story, but they do not necessarily belong to one continuously active trace.

Choose trace boundaries around operations whose duration and outcome you want to diagnose. Use separate identifiers to find the operations that belong to a session or business process. A short, bounded multi-step operation can use one trace; an open-ended customer history usually needs a different model.

## Give each identifier one job

| Identifier | What it identifies | Typical boundary |
| --- | --- | --- |
| Trace ID | One causally connected traced operation | A page action, request, or worker attempt |
| Span ID | One operation inside a trace | A database call or local processing step |
| Session ID | A defined period of user interaction | Login, timeout, or application rotation policy |
| Business operation ID | A domain process | Checkout, import, or support case |
| Attempt ID | One execution attempt | Initial attempt or a retry |

A business operation can span multiple sessions, and one session can contain several business operations. A trace ID should not be derived from an email address or reused as a permanent customer key. W3C trace context specifies the identifiers used for distributed trace propagation. [W3C Trace Context](https://www.w3.org/TR/trace-context/)

OpenTelemetry defines `session.id` in its session conventions, currently marked Development. Pin the semantic convention version used by your instrumentation and check compatibility before adopting changing attributes. Custom domain fields such as `app.checkout.id` remain application-specific. [Session attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/session/)

## Decide where a trace ends

A button click and the API calls required to return its result form a useful diagnostic unit. A later user decision creates another operation. A delayed payment callback or retried fulfillment job can start another trace and link to its known origin.

Do not keep a root span open merely because a session cookie still exists. An abandoned browser tab, a refresh, and a laptop sleeping overnight are poor span completion signals. They create ambiguous durations and make a single trace's completeness dependent on events the application may never observe.

For a tightly bounded wizard, one trace may be appropriate if its duration answers a real performance question and the instrumentation has a reliable end condition. Define cancellation and abandonment explicitly. A session expiration counter or business-state transition may communicate abandonment better than a never-ended span.

## Add approved correlation attributes

This Python pattern creates a new bounded operation and attaches correlation fields. It assumes a configured SDK and application-validated opaque identifiers. The custom `app.*` fields are examples, not standard semantic conventions:

```python
from opentelemetry import trace
from opentelemetry.context import Context

tracer = trace.get_tracer("example.journey")

def execute_step(session_id, checkout_id, step, attempt, operation):
    with tracer.start_as_current_span(
        "checkout.step", context=Context(),
        attributes={
            "session.id": session_id,
            "app.checkout.id": checkout_id,
            "app.checkout.step": step,
            "app.checkout.attempt": attempt,
        },
    ):
        return operation()
```

Use this root pattern at a deliberate top-level boundary. Inside an already traced HTTP request, ordinarily add attributes to the current server or application span instead of creating a redundant root. If the new operation has a known causal predecessor, pass its context as a link. [Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)

Restrict `step` to stable names such as `quote`, `authorize`, and `confirm`. Use attempt numbers to distinguish retries. Keep correlation values out of span names and out of metric labels with unbounded cardinality.

## Plan propagation and privacy

Persist business IDs in the business record and include them in supported request or message metadata after validation. Baggage can carry approved context across instrumented boundaries, but it does not automatically become a span attribute, and it can travel to unintended recipients. Explicitly select which fields are promoted and which destinations receive them. [OpenTelemetry baggage](https://opentelemetry.io/docs/concepts/signals/baggage/)

Opaque IDs can still be linkable to a person. Set access and retention policies, rotate session IDs at the application's chosen boundary, and avoid copying emails, tokens, or payment details into telemetry. A browser-provided business ID must not authorize access to another tenant's operation.

## Query a journey without assuming completeness

Search the business operation ID to find its retained traces, then order the recorded steps and attempts using the application state. A missing step might mean sampling, delayed export, expiration, or work that never happened. Traces alone do not establish a complete conversion funnel.

Keep business events or transactional state for authoritative completion counts. Use traces to explain specific latency and failures. Sampling can retain different subsets of the separate traces, so test how engineers move from a failed checkout record to the available diagnostic evidence. [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/)

## Conclusion

Use trace IDs for bounded execution, session IDs for interaction context, and business IDs for the longer story. That separation makes delayed callbacks, retries, and abandoned sessions understandable without turning every customer journey into one indefinite trace.
