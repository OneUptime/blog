# How to Diagnose LangGraph Step Timeouts with Per-Node Duration Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangGraph, Python, Observability, OpenTelemetry

Description: Diagnose LangGraph timeouts by tracing each node attempt, dependency wait, cancellation, and retry under an explicit execution budget.

A graph timeout says that a deadline expired. It does not say which node consumed the budget or whether the node was waiting for a connection, streaming a response, retrying, or blocking the event loop.

Measure each node attempt and the dependencies inside it. Then compare those measurements with the deadline that actually fired. Raising a graph timeout without that evidence can hide a stalled dependency and increase the amount of work queued behind it.

## Identify the timeout layer

Record the installed LangGraph version before copying a timeout example. Current per-node `timeout=` support requires LangGraph 1.2 or later and applies to async nodes. `TimeoutPolicy` distinguishes total attempt duration from time without progress. [LangGraph fault tolerance](https://docs.langchain.com/oss/python/langgraph/fault-tolerance).

Keep four limits separate in your diagnostic record:

| Limit | What it bounds |
|---|---|
| HTTP/client timeout | A connection, read, write, pool wait, or complete dependency request |
| Node attempt timeout | One execution of a graph node |
| Overall request deadline | The user-visible run, potentially including retries |
| Recursion limit | Graph steps, rather than elapsed seconds |

Older code may configure `step_timeout` on a compiled graph. Verify that setting against the installed version rather than assuming it has the same scope as modern per-node timeouts. Likewise, a gateway 504 may arrive before the graph itself has stopped.

## Trace attempts with monotonic time

The following complete example uses Python 3.11+, `langgraph>=1.2`, and the OpenTelemetry Python SDK. It simulates a slow async dependency and exports spans to the console. The outer span records the timeout classification, while the node span measures the canceled attempt.

```python
import asyncio
from time import perf_counter
from typing import TypedDict

from langgraph.errors import NodeTimeoutError
from langgraph.graph import END, START, StateGraph
from langgraph.types import TimeoutPolicy
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    ConsoleSpanExporter, SimpleSpanProcessor,
)

provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("graph.timeout.demo")

class State(TypedDict):
    result: str

async def slow_node(state: State):
    with tracer.start_as_current_span("graph.node.lookup") as span:
        start = perf_counter()
        outcome = "error"
        try:
            await asyncio.sleep(0.20)
            outcome = "success"
            return {"result": "ready"}
        except asyncio.CancelledError:
            outcome = "cancelled"
            raise
        finally:
            span.set_attribute("app.node.duration_s", perf_counter() - start)
            span.set_attribute("app.node.outcome", outcome)

builder = StateGraph(State)
builder.add_node("lookup", slow_node, timeout=TimeoutPolicy(run_timeout=0.05))
builder.add_edge(START, "lookup")
builder.add_edge("lookup", END)
graph = builder.compile()

async def main():
    with tracer.start_as_current_span("graph.run") as span:
        try:
            await graph.ainvoke({"result": ""})
        except NodeTimeoutError as exc:
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, "node attempt timed out"))
            span.set_attribute("app.timeout.type", type(exc).__name__)
            span.set_attribute("app.timeout.kind", getattr(exc, "kind", "unknown"))

asyncio.run(main())
```

The example records cancellation as an observation; it does not assume all cancellations are timeouts. A disconnected caller or shutdown can cancel the same node. Correlate the inner event with the outer error to establish the cause.

OpenTelemetry supports child spans and attributes for this application instrumentation. Use bounded span names, and configure your normal exporter instead of the console exporter in production. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

## Explain where the duration went

Inside a real lookup node, add child spans around connection acquisition, the remote request, response decoding, and postprocessing. Record retry attempt numbers and backoff separately. The duration of parallel children cannot simply be added to produce parent wall time because their intervals overlap.

For a streaming node, record first progress, last progress, and completion. A run timeout expires even when progress continues; an idle timeout reacts to a lack of progress. Keep the configured policy beside the measured values so a long productive response is distinguishable from a stalled stream.

If every node on one worker becomes slow together, inspect event-loop lag and blocking work. An `async def` function that performs synchronous CPU work or blocking network I/O can prevent timely cancellation. Moving blocking I/O to a thread can protect the event loop, but cancellation of the waiting coroutine does not guarantee that the underlying thread stops. [Python asyncio cancellation and threads](https://docs.python.org/3/library/asyncio-task.html).

## Bound retries and verify recovery

A retry creates another attempt, with another duration and potentially another external operation. Set an overall request budget in addition to per-attempt limits. Report exhausted retries separately from the first timeout so the dashboard shows both reliability and extra work.

A canceled write can have an unknown external outcome. Verify it using an operation ID before retrying a mutation, and use the external service's idempotency mechanism where supported.

Test a fast success, a slow async call, an idle stream, continuing progress that exceeds the total limit, and caller cancellation. For each, confirm that the node span ends and the run identifies the correct limit. A useful timeout trace leads to a specific dependency, configuration, or blocking operation to repair.
