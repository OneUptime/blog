# Why Do Child Spans Add Up to Less Than the Root Span? Finding Queue, Lock, and Connection-Pool Waits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Performance, Troubleshooting

Description: Diagnose gaps between root and child span durations with interval accounting and instrumentation around queue, lock, and connection-pool waits.

A request takes one second, but its database and HTTP spans add up to 180 milliseconds. The missing 820 milliseconds might be connection-pool contention, application work, a lock, or time waiting for an executor. It might also reflect incomplete telemetry. The duration difference alone cannot identify the cause.

Treat the waterfall as a set of measured intervals. OpenTelemetry spans describe operations with start and end timestamps; they do not promise that every moment of their parent is instrumented. [OpenTelemetry trace concepts](https://opentelemetry.io/docs/concepts/signals/traces/)

## Check what is actually missing

Start with one slow request and one fast request for the same route and deployment. Confirm the root duration agrees with server-side request metrics. A browser measurement also includes phases outside the server, so it is a useful comparison rather than an identical measurement boundary.

Inspect whether the exported trace is complete before interpreting empty space. Look for exporter failures, Collector drops, sampling differences, truncated queries, and children that appear after a refresh. Expand collapsed operations. A span may exist but be hidden by the current view.

Use direct children for a first accounting pass. Summing all descendants counts nested work multiple times. Concurrent children overlap, so even direct-child durations are not additive. A database query and an HTTP call that each take 200 ms in parallel occupy roughly 200 ms of wall time, not 400 ms.

## Calculate covered wall time

This standalone example clips child intervals to the root, merges overlaps, and subtracts their union. All inputs use milliseconds relative to the same origin:

```python
def uncovered_ms(root, children):
    start, end = root
    if end < start:
        raise ValueError("root ends before it starts")
    intervals = sorted(
        (max(start, a), min(end, b))
        for a, b in children
        if b > a and min(end, b) > max(start, a)
    )
    covered = 0
    right = start
    for a, b in intervals:
        covered += max(0, b - max(a, right))
        right = max(right, b)
    return end - start - covered

assert uncovered_ms((0, 1000), [(100, 300), (200, 400)]) == 700
assert uncovered_ms((0, 1000), [(-100, 100), (900, 1200)]) == 800
```

The first case covers 300 ms despite having 400 ms of summed child duration. Its 700 ms remainder means “not covered by these children,” not “CPU time.” Cross-host clock errors can distort clipping; check clock synchronization before treating small negative offsets as instrumentation bugs.

## Put spans around acquisition, not just execution

Automatic database instrumentation often describes a driver operation. Determine whether that particular integration includes waiting for a pool connection. Do not infer this from the span name.

In an application that exposes acquisition separately, add a local span around that boundary. The following is an integration pattern; `pool` and `execute_query` represent your database adapter, and the SDK must already be configured:

```python
from opentelemetry import trace

tracer = trace.get_tracer("example.pool-waits")

def load_account(pool, account_id, execute_query):
    with tracer.start_as_current_span("db.pool.acquire"):
        connection = pool.acquire()
    try:
        return execute_query(connection, account_id)
    finally:
        pool.release(connection)
```

Apply the same idea to a mutex's acquisition call or a semaphore await. End the acquisition span when ownership is obtained. Put the protected work in a separate span if it needs explanation. If acquisition times out, preserve the exception and the pool's timeout metric; do not silently turn the failure into an empty result. The Python instrumentation guide documents context-managed spans and exception handling. [Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)

A worker span that starts inside the executor cannot reveal how long the task waited before it ran. Capture submission and start separately, and compare that wait with executor queue depth. For local duration metrics, a monotonic clock avoids adjustments to wall time. [Python clock APIs](https://docs.python.org/3/library/time.html#time.monotonic_ns)

## Confirm the hypothesis under controlled load

Repeat the same request with a small, deliberate pool limit in a test environment. If acquisition spans grow while query spans stay flat, pool contention is supported by evidence. For a lock hypothesis, compare wait duration with lock-hold duration. For an executor hypothesis, increase concurrency and inspect both queue age and active workers.

If no wait grows, inspect serialization, middleware, application loops, garbage collection, and CPU profiles. Tracing narrows the time window; a profiler can explain execution inside it. Keep span names stable and avoid one span per loop iteration unless the additional detail is necessary.

## Conclusion

Measure the union of child intervals, locate the uncovered intervals, and instrument the resource boundary where each suspected wait begins. A successful fix reduces the measured wait and request latency under comparable load; a visually fuller waterfall alone does not establish improvement.
