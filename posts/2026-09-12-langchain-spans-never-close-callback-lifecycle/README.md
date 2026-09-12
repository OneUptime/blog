# LangChain Spans Never Close: Find Callback and Lifecycle Bugs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LangChain

Description: Diagnose unfinished LangChain traces by separating missing callbacks, stream cancellation, parent bookkeeping, and delayed OpenTelemetry export.

A trace shows a model call running long after the response reached the user. Restarting the service clears the symptom, but it returns under concurrency or streaming. The cause may be a missing completion callback, a span ended under the wrong run ID, or a stream that was never consumed or closed.

First determine whether the span is actually open in the application or merely absent from the backend. Lifecycle and export problems require different fixes.

## Follow the Span Through Three States

A span starts in application memory, ends when the operation completes, and reaches the backend through an exporter. A missing backend record can mean the span never ended, the export queue has not flushed, or ingestion failed.

Use a local or in-memory exporter during diagnosis. Record bounded counters for started and ended operations, and inspect SDK export errors. Do not infer an application leak only from a dashboard's running indicator.

OpenTelemetry's context-manager API ends spans when the scope exits. Explicit `start_span` calls require an explicit `end`, and a span's current-context lifetime is separate from its recording lifetime. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

## Check Every Callback Terminal Path

LangChain exposes separate callback methods for chain, model, retriever, and tool lifecycles. Chat models begin with `on_chat_model_start` but complete through the model completion or error callbacks. A bridge that listens only for text LLM starts or forgets `on_llm_error` will leave gaps. [LangChain callback source](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/base.py).

For each component, map start to both success and failure. Check whether cancellation reaches a terminal callback in your installed integration. Do not assume all callback handlers treat task cancellation like an ordinary Python `Exception`.

Use run IDs as keys. A parent and several concurrent children can complete in an order that is incompatible with a shared stack. The completion event must end the span with its own run ID, regardless of which span started last.

## Add a Small Lifecycle Probe

This diagnostic callback tracks model starts and terminal callbacks without creating additional spans or exporting prompt content:

```python
from threading import Lock
from langchain_core.callbacks import BaseCallbackHandler


class ModelLifecycleProbe(BaseCallbackHandler):
    def __init__(self):
        super().__init__()
        self._lock = Lock()
        self._open = set()
        self.unmatched_ends = 0

    def _start(self, run_id):
        with self._lock:
            self._open.add(run_id)

    def _end(self, run_id):
        with self._lock:
            if run_id not in self._open:
                self.unmatched_ends += 1
            self._open.discard(run_id)

    def on_chat_model_start(self, serialized, messages, *, run_id, **kw):
        self._start(run_id)

    def on_llm_start(self, serialized, prompts, *, run_id, **kw):
        self._start(run_id)

    def on_llm_end(self, response, *, run_id, **kw):
        self._end(run_id)

    def on_llm_error(self, error, *, run_id, **kw):
        self._end(run_id)

    def snapshot(self):
        with self._lock:
            return len(self._open), self.unmatched_ends
```

Attach one probe at the request boundary alongside existing callbacks. After a request finishes, compare its snapshot with the exported spans. An empty open set with unfinished custom spans points toward the bridge's ending logic. A nonempty set points toward incomplete execution, lost configuration, or missing terminal callback handling.

The probe is intentionally diagnostic. A process-wide probe needs bounded cleanup and richer request association, or it can become the very memory leak you are investigating.

## Own the Streaming Lifetime

A streaming API returns control before the model operation is necessarily complete. Wrapping only the creation of an iterator measures setup, not consumption. Conversely, creating a span when an iterator starts and never closing it when the consumer exits can leave it open indefinitely.

Prefer an application function that owns stream consumption and the span scope together:

```python
import asyncio
from contextlib import aclosing
from opentelemetry import trace

tracer = trace.get_tracer("agent.streaming")


async def deliver_stream(graph, inputs, config, emit):
    with tracer.start_as_current_span("agent.stream") as span:
        try:
            async with aclosing(graph.astream(inputs, config=config)) as stream:
                async for chunk in stream:
                    await emit(chunk)
        except asyncio.CancelledError:
            span.set_attribute("app.outcome", "cancelled")
            raise
```

The `aclosing` context explicitly closes the graph async generator when iteration ends, including when `emit` fails or the task is cancelled. The span context then exits, ending the application span. This does not guarantee every provider integration closes its own spans correctly; use the probe and exporter to check those children separately. Follow the SDK's stream cleanup contract when consumer errors interrupt iteration.

Avoid holding a current-span context manager across arbitrary callbacks executed in different tasks. Context tokens belong to the execution context that created them, and detaching them elsewhere can corrupt parentage or produce context errors.

## Separate Export Shutdown from Span Ending

A batch exporter can hold ended spans briefly. During graceful worker shutdown, invoke the provider's documented flush or shutdown mechanism with an appropriate timeout. Do not force a global flush after every token or callback; that adds latency and defeats batching.

If locally ended spans never reach the backend, inspect endpoint configuration, authentication, queue saturation, export retries, and collector ingestion. Changing callback code cannot fix a rejected exporter request.

Build a regression fixture with success, provider error, parser error, cancellation, and two model calls completing in reversed order. Assert all expected spans end exactly once and no callback run remains open. Keep the fixture independent of a live model so lifecycle errors are reproducible.

## Conclusion

Trace unfinished spans from callback start to terminal event, then through export. Correct run-ID bookkeeping and explicit ownership of stream consumption fix lifecycle bugs without hiding exporter failures.

## Official Documentation

- [LangChain callback definitions](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/base.py)
- [OpenTelemetry Python span lifecycle](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [Deterministic async generator cleanup](https://docs.python.org/3/library/contextlib.html#contextlib.aclosing)
- [Python task cancellation](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)
