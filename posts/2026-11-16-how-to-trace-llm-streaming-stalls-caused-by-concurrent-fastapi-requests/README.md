# How to Trace LLM Streaming Stalls Caused by Concurrent FastAPI Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, FastAPI, Python, Tracing

Description: Find event-loop blocking, pool waits, and shared locks that interrupt LLM streams under concurrent FastAPI traffic.

An LLM stream that pauses whenever another FastAPI endpoint runs usually needs a concurrency investigation. A single successful streaming request proves little about how the application behaves when a database query, document parser, or second model call competes for resources.

Trace the pause as a timeline. Record the last upstream delta, the next upstream delta, the application's forwarding events, and the overlapping request. Then identify the resource both requests share.

## Distinguish three different waits

Start with these hypotheses:

| Observation | Candidate cause |
| --- | --- |
| Many unrelated routes and streams pause together | Event-loop blocking or process starvation |
| New model calls wait but established streams continue | Connection pool or admission queue |
| One session stalls while other sessions work | Session lock, shared generator, or application state |

These are clues rather than proofs. A reverse proxy can create similar symptoms, so keep a synthetic stream endpoint available to distinguish application scheduling from provider behavior.

[FastAPI's concurrency documentation](https://fastapi.tiangolo.com/async/#very-technical-details) distinguishes synchronous path operations, which it runs in a thread pool, from ordinary helper functions called directly by your code. Calling a blocking helper from `async def` does not automatically move that helper into a worker thread.

## Add an event-loop lag probe

This complete application measures how late a periodic coroutine wakes. Run it with one worker while reproducing the issue, then repeat using your production worker layout:

```python
import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI

log = logging.getLogger("stream-diagnostics")

async def watch_loop():
    loop = asyncio.get_running_loop()
    interval = 0.1
    while True:
        expected = loop.time() + interval
        await asyncio.sleep(interval)
        lag_ms = max(0, loop.time() - expected) * 1000
        if lag_ms > 100:
            log.warning("event_loop_lag_ms=%.1f", lag_ms)

@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(watch_loop())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    return {"ok": True}
```

The 100 ms threshold is an example, not a production service objective. Export a histogram with a worker identifier when aggregating measurements. A probe in worker A cannot explain a pause confined to worker B.

Python's [asyncio development guidance](https://docs.python.org/3/library/asyncio-dev.html#running-blocking-code) explains why blocking work delays other tasks and describes executor-based offloading. For blocking I/O, use an asynchronous client or carefully bounded thread offloading. For heavy CPU work, isolate processing in a suitable worker or process pool and measure serialization overhead.

## Keep model reception and forwarding visible

Instrument these boundaries using an application trace:

```text
http.request
  authenticate
  wait_for_application_capacity
  model.attempt
    wait_for_first_content
    maximum_upstream_gap
  forward_stream
    maximum_downstream_gap
  cleanup
```

These are proposed span names, not framework-generated spans. For a stream, the model attempt must remain open while the body is consumed. Ending it when response headers arrive hides almost all generation time.

Record asynchronous lock wait and lock hold durations separately. A global lock held for the entire stream can serialize every user even though the HTTP client is asynchronous. Scope locks to the state mutation they protect, and avoid sharing mutable conversation buffers across requests.

Similarly, inspect HTTP connection limits. [HTTPX resource limits](https://www.python-httpx.org/advanced/resource-limits/) control the connection pool; pool saturation can delay a request before the provider receives it. Reuse a client with intentional lifecycle management, then size concurrency against downstream limits instead of creating unlimited clients.

## Reproduce with a small workload matrix

Run one synthetic stream while issuing a cheap health request. Next overlap the stream with the suspected expensive endpoint. Finally replace the synthetic stream with a real model stream. Compare upstream gaps, browser gaps, loop lag, pool waits, and CPU utilization for each case.

Use a fixed number of concurrent requests and preserve failed attempts. A load generator that waits for each response before sending the next can accidentally test only serial behavior. Disable automatic retry in a diagnostic harness when possible, or record each retry as a distinct attempt.

If loop lag rises with the expensive route, profile that route for synchronous SDK calls, large JSON serialization, filesystem access, and CPU-heavy parsing. If loop lag stays low and only new calls wait, investigate semaphores and pools. If upstream deltas continue but forwarding stops, inspect middleware, downstream backpressure, and code between reception and `yield`.

## Verify cancellation as well as throughput

Cancel a browser request during the reproduction. Ensure the upstream stream closes and application capacity is released in `finally` blocks. A leaked permit or connection can make later requests stall even after the original browser disappears.

After a fix, repeat the same overlap scenario and check first-text latency, maximum stream gap, completion rate, and resource usage. More workers can improve capacity, but they can also hide a blocking bug during light tests. The strongest result explains which wait disappeared and demonstrates that the same concurrent workload now progresses predictably.
