# A Child Span Starts After Its Parent Ends: When to Use a New Trace and a Span Link

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Span Links, Troubleshooting

Description: Distinguish valid delayed child spans from context leaks, and choose a new linked trace when deferred work has an independent lifecycle.

A waterfall shows a parent ending at 12:00:00 and its child beginning at 12:00:05. That shape is not automatically invalid. A producer may enqueue work that a consumer starts much later, and the parent relationship describes causality rather than mandatory containment on the timeline.

OpenTelemetry explicitly allows an ended span to remain a parent through its context. Ending a span does not end its children or remove it from contexts that contain it. [Tracing API: End](https://opentelemetry.io/docs/specs/otel/trace/api/#end)

The important question is whether the relationship matches the application. A legitimate delayed job, stale context leaking into an unrelated request, and clock skew can produce similar pictures but require different fixes.

## Diagnose the relationship before changing it

Capture the parent and child trace IDs, parent span ID, start and end timestamps, and the application's scheduling record. Confirm the same job or message connects the operations. A matching user account alone is not proof of causality.

If unrelated requests repeatedly inherit one old parent, inspect context attachment and cleanup, global variables, reused worker state, and explicit context arguments. In a worker pool, verify that the previous job's context is detached before the next job starts. If the apparent time reversal is small and crosses hosts, inspect clock synchronization as well.

Do not lengthen the original span just to make the waterfall look nested. That changes the measured operation and can corrupt latency interpretation. The trace's overall displayed time range may exceed the root span's duration even when both measurements are accurate.

## Compare both valid models

This runnable example requires the OpenTelemetry API and SDK. It creates an ended origin, a later child in the same trace, and an independent root linked to the origin. It asserts their structural differences without requiring a backend:

```python
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.trace import Link

provider = TracerProvider()
tracer = provider.get_tracer("example.delayed-span")

with tracer.start_as_current_span("submit", context=Context()) as origin:
    origin_context = origin.get_span_context()
    parent_context = trace.set_span_in_context(origin, Context())

with tracer.start_as_current_span("short.deferred.step", context=parent_context) as child:
    assert child.get_span_context().trace_id == origin_context.trace_id
    assert child.parent.span_id == origin_context.span_id

with tracer.start_as_current_span(
    "independent.job", context=Context(), links=[Link(origin_context)],
) as job:
    assert job.get_span_context().trace_id != origin_context.trace_id
    assert job.parent is None
    assert job.links[0].context.span_id == origin_context.span_id

provider.shutdown()
```

The inspection properties used in these assertions belong to the concrete Python SDK spans. Application instrumentation generally needs only the API. Configure an exporter to inspect the same example in your backend. [Python SDK trace reference](https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html)

## Choose boundaries from ownership and delay

A same-trace child can be useful for a short deferred step that belongs to one bounded operation and arrives within your telemetry system's practical collection window. A new trace is often easier to investigate for scheduled work, human approvals, long delays, separately retried jobs, or work owned by another service lifecycle.

A link records the originating context without assigning it as the parent. For batch consumption, preserve multiple creation contexts as links rather than choosing one message arbitrarily as the parent of all the others. Follow the particular messaging instrumentation's conventions, which may define both parent and link behavior. [Messaging relationships](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)

These choices have operational consequences. Tail sampling groups spans by trace ID and makes decisions within configured timing and buffering behavior. A child arriving much later than its parent can miss the original decision window. Separate traces have separate sampling decisions unless a policy explicitly coordinates them. [Collector tail sampling documentation](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/tailsamplingprocessor/README.md)

## Test the transition

Exercise one immediate job, one delayed job, one retry, and one unrelated request. Confirm that the selected job policy produces the expected trace IDs and link targets, while the unrelated request cannot inherit the previous operation's parent.

Check both export data and the UI. A link is not a child edge and might be shown in a details panel rather than in the waterfall. Preserve an application job identifier in approved searchable telemetry so the workflow remains discoverable if one linked trace was sampled out or expired.

## Conclusion

A child starting after its parent ends can be correct. Change the model when the work has a separate lifecycle, and fix propagation when the relationship is accidental. Span duration should continue to describe actual work in either model.
