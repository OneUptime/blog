# How to Prevent Trace Context from Bleeding Between Concurrent Requests in Thread Pools and Async Runtimes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Context Propagation, Python, Distributed Tracing

Description: Isolate trace context across reused workers and asynchronous tasks, then prove cleanup with concurrent and failing-request fixtures.

A context bug does not always produce an orphan span. Sometimes request B inherits request A's trace ID, baggage, or logging fields. The resulting trace looks connected but tells the wrong story, and customer metadata may cross request boundaries.

Preventing this requires two properties: capture the intended context at dispatch, and restore the worker's previous context after execution. Test both. A single successful request proves neither isolation nor cleanup.

## Identify where state is stored

OpenTelemetry context is an execution-scoped value. In Python, the normal implementation uses `contextvars`. A process-global current-request variable or a mutable dictionary shared by workers bypasses that isolation.

Inventory manual `attach` calls, request middleware, executors, callbacks, and logger enrichment. Look for cleanup that runs only on success. A timeout in the caller may leave the worker running; its context must remain correct until that worker exits.

Each thread has its own context stack. Entering a Python `Context` makes its values current, and exiting restores the previous context, including when the function raises. A context cannot be entered concurrently by multiple threads. [Python context variables](https://docs.python.org/3/library/contextvars.html)

## Capture separately for every submission

For an application-owned `ThreadPoolExecutor`, create a fresh context copy for each submitted job:

```python
import contextvars
from concurrent.futures import ThreadPoolExecutor

pool = ThreadPoolExecutor(max_workers=4)

def submit_with_context(function, *args, **kwargs):
    captured = contextvars.copy_context()
    return pool.submit(captured.run, function, *args, **kwargs)
```

Call this helper while the intended request span is current. Capture at submission time, not once when the pool starts. Do not share one `captured` object across all requests. The wrapper preserves all current Python context variables, so review non-tracing fields too.

If the SDK's supported threading integration already propagates context, prefer one propagation owner and test it. Layering several wrappers can make stale-context problems difficult to diagnose. For manual OpenTelemetry attachment, pair `context.attach(captured)` with `context.detach(token)` in `finally`, inside the same worker execution.

## Understand async task inheritance

Python `asyncio` tasks normally copy the current context when created. `asyncio.to_thread()` also propagates the current context into the worker. These behaviors differ from assuming every arbitrary executor submission inherits request state. [Coroutines and tasks](https://docs.python.org/3/library/asyncio-task.html)

A request's background task can keep a copy after the request finishes. That is not necessarily cross-request leakage, but it may extend the lifetime of baggage or attach later work to an ended parent. Decide whether the task is request work or an independent job. Independent jobs should start under a deliberate context, with explicit correlation or links when appropriate.

Callbacks registered on shared event emitters need the same care. Binding every callback to whichever request first registered the listener can attach all future events to that request. Prefer a per-operation callback carrying that operation's context, and remove it when completed or canceled.

## Run an isolation fixture

Use two request contexts with distinct synthetic trace IDs and baggage markers. Submit their work concurrently, make their execution overlap, and record the context at these points:

1. Before submission in the request handler.
2. On entry to the worker.
3. Inside a child span after an asynchronous boundary.
4. After a nested operation raises.
5. In a subsequent neutral job on the same worker.

The first four observations must belong to the correct request. The neutral job must see the worker's neutral baseline, not the last request's context. Use a pool with one worker for deterministic reuse, then repeat with several workers and synchronized overlap.

Check parent span IDs as well as trace IDs. Two child spans can share a trace while still attaching to the wrong operation. Also verify baggage and log correlation fields, because independent enrichment code may leak even when tracing is correct.

## Keep cleanup ownership local

End spans where their work ends and restore context where it was attached. A caller should not attempt to detach a worker's token. Do not fix a leak by globally clearing context while other requests are active.

OpenTelemetry's attach/detach contract makes restoration explicit. Prefer scoped context managers where available, and avoid saving active context in a reusable singleton unless that singleton represents a deliberate long-lived operation. [OpenTelemetry Context API](https://opentelemetry.io/docs/specs/otel/context/)

## Conclusion

Capture context per operation, restore it on every exit path, and test a reused worker after failure. Correct parentage under concurrency is stronger evidence than one well-shaped trace from a sequential happy-path request.
