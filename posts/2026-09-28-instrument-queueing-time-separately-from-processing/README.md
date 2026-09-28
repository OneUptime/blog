# Instrument Queueing and Processing Time Separately in Asynchronous Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Python, Message Queue

Description: Measure asynchronous queue residence separately from worker execution without mixing clocks or mislabeling publish and receive durations.

A worker can finish a job in 30 ms while the user waits 20 seconds. If the only span surrounds the worker function, the trace accurately measures processing and completely misses the backlog. Add a queue-residence measurement with explicit enqueue and start boundaries.

First distinguish three phases: producing or scheduling the work, waiting for an available worker, and executing it. A publish span measures the producer operation; a receive span measures receiving messages. Neither automatically measures the entire time a message spent in a broker. Follow the integration's messaging conventions rather than renaming a network receive operation into queue residence. [Messaging span conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)

## Make the local case unambiguous

Within one process, capture both a wall-clock enqueue timestamp for the trace and a monotonic timestamp for elapsed time. The two values serve different purposes. Unix timestamps locate spans on a timeline; monotonic values measure elapsed intervals without depending on wall-clock adjustments. Never use a monotonic value as an OpenTelemetry absolute timestamp. [Python time reference](https://docs.python.org/3/library/time.html)

The following runnable demonstration requires `opentelemetry-api` and `opentelemetry-sdk`. It uses a local queue with no consumer until after submission, so the deliberate delay is part of queue residence. A console exporter makes the span relationships inspectable without a backend:

```python
import queue
import time
from opentelemetry import context, trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    ConsoleSpanExporter, SimpleSpanProcessor,
)

provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("example.queue-phases")
work = queue.SimpleQueue()

with tracer.start_as_current_span("submit.job"):
    parent = context.get_current()
    enqueued_wall = time.time_ns()
    enqueued_mono = time.monotonic_ns()
    work.put(("job-1", parent, enqueued_wall, enqueued_mono))

time.sleep(0.02)  # Simulates residence before a worker takes the job.
job_id, parent, enqueued_wall, enqueued_mono = work.get()
started_wall = time.time_ns()
wait_seconds = (time.monotonic_ns() - enqueued_mono) / 1e9

waiting = tracer.start_span(
    "job.queue.wait", context=parent, start_time=enqueued_wall,
    attributes={"app.queue.wait_seconds": wait_seconds},
)
waiting.end(end_time=started_wall)

with tracer.start_as_current_span("job.process", context=parent):
    time.sleep(0.005)  # Replace with the real handler.
provider.shutdown()
```

`job.queue.wait` and `job.process` are custom local operations. The code does not claim that these names or the `app.*` attribute are standardized messaging conventions. Both spans refer to the submission context, even though submission has ended. Explicit timestamps allow recording an already observed interval. [Python trace API](https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html)

For a bounded queue, decide whether enqueue means “submission attempted” or “accepted into the queue.” A blocking `put` can spend time waiting for capacity. Measure that admission wait separately if the distinction matters. In the example, `SimpleQueue.put` has no capacity wait, but the timestamp still precedes the call by a small instrumentation overhead.

## Cross-process queues need a clock policy

Do not serialize the local monotonic timestamp and subtract it on another host. Its reference point is unsuitable for that comparison. Prefer a documented broker timestamp or queue-age metric when available. If you use producer and consumer wall clocks, document clock synchronization and the possible error. Treat a negative measured residence as an invalid observation to investigate, rather than hiding it with a zero clamp.

Put trace context in the message's supported metadata carrier using a propagator. Keep application enqueue timestamps separate from `traceparent`; that header carries identity and flags, not enqueue time. When work can be delayed for hours, a new processing trace linked to the creation context can give clearer boundaries than one long trace. [Python context propagation](https://opentelemetry.io/docs/languages/python/propagation/)

## Preserve attempt-level meaning

Record the original enqueue time and the current delivery attempt independently. A retry can have a long total age but a short wait since redelivery. An acknowledgment or lease extension is also a separate boundary from completion of business work.

Export queue-wait and processing-duration histograms with bounded dimensions such as queue and worker type. Keep job IDs out of metric labels. Trace examples can show individual delays, while queue depth, oldest-message age, throughput, and duration distributions explain whether the system is falling behind.

Test an idle queue, a backlog, a slow handler, and a retry. In an isolated backlog test with unchanged handler work, queue wait should increase without increasing handler duration. Retries can also add waiting time, and a slow handler can increase queue wait for subsequent jobs. Also compare attempted, accepted, and processed counts: work that is never dequeued cannot produce the retrospective waiting span in this example, so broker or queue metrics remain necessary.

## Conclusion

A useful asynchronous timeline labels the waiting boundary explicitly and uses the right clock for each measurement. Separate admission, residence, processing, and retries so a fast worker cannot hide a slow queue.
