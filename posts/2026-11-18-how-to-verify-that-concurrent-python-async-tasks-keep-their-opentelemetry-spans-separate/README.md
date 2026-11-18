# How to Verify That Concurrent Python Async Tasks Keep Their OpenTelemetry Spans Separate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Asyncio, Context Propagation

Description: Verify Python asyncio trace isolation with an in-memory exporter, forced task interleaving, and assertions on current spans and parent IDs.

Two overlapping Python requests should retain separate trace contexts even when their coroutines run on the same thread. Checking only whether spans arrive in the backend cannot prove that: incorrectly parented spans can still export successfully.

Test both the active context during execution and the recorded parent relationships afterward. The following small regression test exercises two request roots and two child tasks per request without a Collector or network exporter.

## Understand what tasks inherit

An `asyncio.Task` copies the current `contextvars` context when it is created unless an explicit context is supplied. Creating a coroutine object alone does not schedule it or capture its eventual task context. Therefore, schedule child tasks while their intended parent is current. The [Python task documentation](https://docs.python.org/3/library/asyncio-task.html) defines these rules.

A shared tracer is normal; a shared variable named `current_span` is not a replacement for task-local context. Also distinguish context isolation from object copying: two tasks that intentionally inherit the same parent reference the same parent span until each activates its own child.

## Run an isolated concurrency check

Install `opentelemetry-sdk` into a disposable virtual environment. Save this as `check_async_context.py` and run it with Python 3.11 or later:

```python
import asyncio
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.sdk.trace.sampling import ALWAYS_ON

exporter = InMemorySpanExporter()
provider = TracerProvider(sampler=ALWAYS_ON)
provider.add_span_processor(SimpleSpanProcessor(exporter))
tracer = provider.get_tracer("example.async-isolation")

async def child(label, gate):
    with tracer.start_as_current_span(label) as span:
        expected = span.get_span_context()
        await gate.wait()
        for _ in range(10):
            await asyncio.sleep(0)
            assert trace.get_current_span().get_span_context() == expected

async def request(label, gate):
    # An explicit empty OTel Context makes this a separate request root.
    with tracer.start_as_current_span(label, context=Context()) as parent:
        expected = parent.get_span_context()
        tasks = [asyncio.create_task(child(f"{label}.{n}", gate))
                 for n in range(2)]
        await asyncio.gather(*tasks)
        assert trace.get_current_span().get_span_context() == expected

async def main():
    before = trace.get_current_span().get_span_context()
    gate = asyncio.Event()
    requests = [asyncio.create_task(request(label, gate))
                for label in ("request-a", "request-b")]
    await asyncio.sleep(0)
    gate.set()
    await asyncio.gather(*requests)
    assert trace.get_current_span().get_span_context() == before

try:
    asyncio.run(main())
    spans = {span.name: span for span in exporter.get_finished_spans()}
    assert len(spans) == 6
    a, b = spans["request-a"], spans["request-b"]
    assert a.parent is None and b.parent is None
    assert a.context.trace_id != b.context.trace_id
    for label in ("request-a", "request-b"):
        parent = spans[label]
        for n in range(2):
            child_span = spans[f"{label}.{n}"]
            assert child_span.context.trace_id == parent.context.trace_id
            assert child_span.parent.span_id == parent.context.span_id
    print("PASS: two roots, four children, no context leakage")
finally:
    provider.shutdown()
```

The empty contexts are deliberate test boundaries. Do not put `context=Context()` on every production child span: that would disconnect it from the request you intend to follow.

`start_as_current_span` restores the previous active span when its scope exits. The [OpenTelemetry Python tracing API](https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html) documents that lifetime and the distinction from `start_span`, which does not make a span current. The test uses a local provider so it does not replace an application's global provider.

## Interpret a failure precisely

| Failed assertion | Investigation |
| --- | --- |
| Active span changes after `await` | Look for shared mutable context, unbalanced attach/detach, or scopes entered and exited in different tasks. |
| Child has the wrong parent | Check where `create_task` runs, including task factories and framework wrappers. |
| Request roots share a trace | Inspect the explicit context passed at the request boundary. |
| Expected spans are absent | Separate SDK sampling, span completion, and export from context propagation. |

A simple processor and an in-memory exporter keep this check deterministic: completed sampled spans are available without waiting for a batch timer. The [SDK trace documentation](https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.html) describes processors, samplers, and readable span context.

## Exercise the application's real boundary

Once the baseline passes, replace the `child` body with the wrapper that launches your actual work. Repeat with exceptions and cancellations, and assert that a later request does not inherit the failed task's span. Avoid comparing only names; request IDs in test names are useful here, while production span names should stay bounded.

A passing asyncio test does not establish propagation through a process pool, broker, or separately started worker. Each boundary needs its own contract. For an external service, inspect injected and extracted headers; for a long-lived queue worker, capture context in the work item when it is submitted.
