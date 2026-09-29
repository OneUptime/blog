# Why a Reconstructed Remote Parent Is `isRecording=false`: Sampling Flags and Parent-Based Samplers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sampling, Distributed Tracing, Python

Description: Distinguish a non-recording remote context from the recording and sampling decisions of the local child span.

An extracted remote parent often reports `isRecording=false` even when its sampled flag is set. That is expected. The remote parent in this process is a context carrier, not the live span object running in the caller's process.

The local service uses that carrier to choose parentage and sampling when it creates its own span. Checking whether the carrier records events is therefore the wrong way to decide whether a local child will be recorded.

## Separate four questions

| Question | What it tells you |
| --- | --- |
| Is the span context valid? | The identifiers can represent a tracing relationship |
| Is the context remote? | It was reconstructed across a propagation boundary |
| Is the sampled flag set? | A propagated sampling indication is present |
| Is this span recording? | This particular span object accepts recording work |

OpenTelemetry provides a non-recording span wrapper for a `SpanContext`. It can carry valid identifiers and flags without storing attributes or events. An ended local span can also be non-recording, for an entirely different reason. [Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)

Do not conclude that a trace has vanished merely because the parent wrapper does not record. Inspect the local child and the exporter separately.

## Demonstrate the difference

Install `opentelemetry-api` and `opentelemetry-sdk`, then run this isolated example. It uses its own provider and does not replace an application's global SDK:

```python
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ALWAYS_OFF, ParentBased
from opentelemetry.trace.propagation.tracecontext import (
    TraceContextTextMapPropagator,
)

provider = TracerProvider(sampler=ParentBased(root=ALWAYS_OFF))
tracer = provider.get_tracer("example.remote-parent")
propagator = TraceContextTextMapPropagator()

for flag in ("01", "00"):
    carrier = {
        "traceparent":
            "00-11111111111111111111111111111111-2222222222222222-" + flag
    }
    remote = propagator.extract(carrier, context=Context())
    parent = trace.get_current_span(remote)
    with tracer.start_as_current_span("local-work", context=remote) as child:
        print(
            flag,
            parent.is_recording(),
            parent.get_span_context().trace_flags.sampled,
            child.is_recording(),
            child.get_span_context().trace_flags.sampled,
        )
provider.shutdown()
```

With the SDK's default `ParentBased` remote-parent branches, the sampled parent creates a recording sampled child; the unsampled parent creates a non-recording unsampled child. The parent wrapper is non-recording in both cases. `ALWAYS_OFF` controls the root branch here, not the sampled remote-parent branch. [Python sampling implementation](https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html)

The example does not install an exporter. Recording a child is therefore demonstrated independently of whether anything is sent to a backend.

## Inspect the actual sampler configuration

Parent-based sampling delegates among root, local-parent, and remote-parent cases. Custom branch samplers can change the default behavior. If your test differs from the example, capture the configured provider, sampler, and parent context at span creation.

A malformed carrier or lost context makes the operation a root, invoking the root sampler instead. An API-only setup without a functional SDK can also create non-recording spans. A framework span created before your custom SDK initialization may belong to a different configuration than the tracer you are inspecting.

The SDK distinguishes dropping, recording without sampling, and recording with sampling. In particular, recording is not interchangeable with the sampled bit. Export behavior depends on processors and exporters as well as the sampler. [Tracing SDK](https://opentelemetry.io/docs/specs/otel/trace/sdk/)

## Diagnose missing local data in order

First assert the extracted context is valid and remote. Next check that the local child's trace ID matches the expected parent and that the child's span ID is new. Inspect recording state while the child is open, not after the context manager has ended it.

Then check span processors, export failures, queue limits, Collector filtering, downstream sampling, and backend retention. A sampled flag cannot prove successful ingestion at any later stage. Conversely, changing the remote wrapper to pretend it records does nothing to repair an exporter.

Use `is_recording()` to avoid expensive attribute computation on a local span that will ignore it. Do not use it as a propagation gate: a non-recording context can still preserve continuity across services.

## Conclusion

A remote parent wrapper carries causality; the local child carries local recording work. Diagnose context validity, sampling, recording, and export as separate decisions, and test the child while it is active.
