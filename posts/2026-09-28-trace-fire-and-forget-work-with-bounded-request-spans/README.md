# How to Trace Fire-and-Forget Work Without Falsely Extending the Original Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Python, Async

Description: Keep request latency accurate while tracing independently scheduled work with a separate trace, a causal span link, and explicit task lifecycle handling.

An HTTP handler schedules an email and returns an accepted response. The email takes another five seconds. Keeping the request span open until delivery makes the trace suggest that the caller waited for those five seconds, even though the response had already finished.

Define the request's completion boundary from the actual protocol operation. Measure the background job separately. A child span can legally outlive its parent; ending the request does not automatically end its children. A new trace with a link is useful when the job has its own lifecycle, retry policy, or substantial delay. [OpenTelemetry span lifetime rules](https://opentelemetry.io/docs/specs/otel/trace/api/#end)

## Separate scheduling from execution

Track three facts: whether the application accepted the request, whether scheduling succeeded, and whether the job eventually completed. These can have different outcomes. An accepted response should not become a failed HTTP request retrospectively because a later email attempt fails.

For durable work, return success only after the queue or transactional outbox has accepted responsibility according to your application's contract. The trace should contain a bounded enqueue operation. The worker then extracts the creation context and uses the parent-or-link policy chosen for that queue.

For an in-process task, capture the originating span context before leaving the request. Then explicitly choose an empty OpenTelemetry parent context when creating the background root. Omitting this detail can accidentally inherit the request through runtime context propagation.

## Create a separate root with a link

This Python integration pattern assumes a configured OpenTelemetry SDK and an existing event loop. `run_job` is the application's async handler. The `asyncio` task is supervised for errors, but is not a durable job queue:

```python
import asyncio
import logging
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.trace import Link

tracer = trace.get_tracer("example.detached-work")
log = logging.getLogger(__name__)
pending = set()

async def traced_job(origin, payload, run_job):
    links = [Link(origin)] if origin.is_valid else []
    with tracer.start_as_current_span(
        "notification.process", context=Context(), links=links,
    ):
        await run_job(payload)

def finished(task):
    pending.discard(task)
    if task.cancelled():
        log.warning("Notification task cancelled")
        return
    error = task.exception()
    if error is not None:
        # Avoid logging payloads or arbitrary exception messages.
        log.error("Notification task failed: %s", type(error).__name__)

def schedule_notification(payload, run_job):
    origin = trace.get_current_span().get_span_context()
    task = asyncio.create_task(traced_job(origin, payload, run_job))
    pending.add(task)
    task.add_done_callback(finished)
    return task
```

The link points from the background operation to its origin. Its trace ID differs from the request's trace ID; nested operations inside `traced_job` inherit the new background span. The Python trace API documents explicit context and link creation. [Python trace API](https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html)

Passing `Context()` here controls parent selection; it does not clear the current OpenTelemetry baggage. The Python SDK activates the new span in the existing runtime context. If baggage isolation is required, explicitly attach an empty or sanitized OpenTelemetry context around the job and detach it in a `finally` block. This also does not reset unrelated Python context variables: `asyncio.create_task` copies its current context by default. [Python SDK span activation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace.html#Tracer.start_as_current_span), [Python task lifecycle and context](https://docs.python.org/3/library/asyncio-task.html)

## Finish the runtime lifecycle too

Keep strong references to tasks until they finish, retrieve exceptions, and define a shutdown policy. At shutdown, either drain accepted work within a bounded deadline or cancel it and record an explicit outcome. Flush the telemetry provider after that policy completes. A process exit can otherwise lose both the work and its exported spans.

The set in the example prevents task references from disappearing, but it does not impose backpressure. Add a concurrency limit or queue, reject excess work according to the application's contract, and measure pending tasks. If losing a job on restart is unacceptable, use durable scheduling instead of expanding this helper into an improvised queue.

## Verify latency and causality separately

Run a test where the handler responds promptly and the job waits before completing. The request span should end at the response boundary. The job should have a different trace ID, no parent, and one link to the captured origin when that context is valid.

Make the job fail and verify its span has an error while the already completed HTTP outcome stays unchanged. Then test cancellation and shutdown. Do not rely on a link to force the origin to be stored: a root sampler can make a separate decision for the job trace. Retain a stable job identifier in approved logs or span attributes for investigation when one side is unavailable. [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/)

## Conclusion

End the request when its work ends, and give background execution its own observable lifecycle. Trace links preserve the cause; scheduling guarantees, backpressure, and shutdown handling preserve the actual work.
