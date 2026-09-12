# Propagate LLM Trace Context Across Queues, Threads, and Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Tracing

Description: Carry trace context through message metadata and thread execution so background agents remain correlated with the request that scheduled them.

A request enqueues an agent job, the worker runs a model, and the model trace appears as a new root. The work succeeded, but the causal connection disappeared at the queue. Similar gaps appear when custom code moves work into thread pools.

Trace context is execution state. It needs an explicit transport across process boundaries and correct copying across execution contexts inside a process.

## Define the Boundary Before Choosing a Mechanism

An ordinary async function call can inherit the active context. A queued message cannot inherit an in-memory Python object from the producer process. A thread pool also needs appropriate context propagation unless its instrumentation supplies it.

Use OpenTelemetry propagators for carriers such as message headers. Use Python context copying for custom thread submissions. Do not serialize span objects or rely on a module-global current span. [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/), [Python context variables](https://docs.python.org/3/library/contextvars.html).

Decide whether the worker belongs to the same trace. A short asynchronous continuation often does. A task that resumes after a long human approval may be better represented by a new trace linked to its cause, with an application workflow ID joining active runs.

## Inject Context While Publishing

Start a producer span before injecting headers so the carrier points to the publish operation. The adapter below accepts application functions; it does not assume a specific broker's header format.

```python
from opentelemetry import propagate, trace
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer("agent.jobs")


def enqueue(send, job):
    with tracer.start_as_current_span(
        "agent.enqueue", kind=SpanKind.PRODUCER
    ):
        headers = {}
        propagate.inject(headers)
        send({"payload": job, "trace_headers": headers})


def consume(message, run_agent):
    parent = propagate.extract(message.get("trace_headers", {}))
    with tracer.start_as_current_span(
        "agent.process", context=parent, kind=SpanKind.CONSUMER
    ) as span:
        span.set_attribute("app.job.kind", "answer")
        return run_agent(message["payload"])
```

Ensure the broker preserves the carrier's string values. Some clients expose headers as byte tuples or typed properties, so implement the required getter and setter or convert carefully. Verify the serialized message at the consumer instead of merely checking the producer's local dictionary.

Avoid duplicating propagation if the broker client is already instrumented. Inspect its documented behavior and resulting parentage first. Duplicate producer or consumer spans can make retries and queue latency confusing.

## Copy Context for Each Thread Submission

For a custom `ThreadPoolExecutor`, capture a fresh context for each submitted task:

```python
from contextvars import copy_context


def submit_with_context(executor, function, *args, **kwargs):
    context = copy_context()
    return executor.submit(context.run, function, *args, **kwargs)
```

Call this helper while the intended parent span is current. Each invocation obtains its own context copy. Do not submit several concurrent calls through the same `Context` instance; Python prevents entering an already entered context, and shared reuse would also muddle ownership.

`asyncio.to_thread` propagates the current context for its thread call, as documented by Python. A manually managed process pool is different: cross-process work needs a serialized carrier, just like a queue. [Python running code in threads](https://docs.python.org/3/library/asyncio-task.html#running-in-threads).

## Keep Retry Identity Separate

A broker can deliver a message several times. Keep a stable logical job ID, a unique delivery or attempt ID, and the trace identity of each processing attempt. Record retry number and queue outcome without treating the job ID as a metric label.

Do not reuse one span ID for every retry. Each actual processing attempt has a distinct lifetime and may have different downstream work. Depending on your trace design, attempts can share a propagated parent or appear in linked traces, but their identities must remain distinct.

For fan-in processing, one output may depend on several messages. A single parent cannot express every cause. OpenTelemetry messaging conventions describe using span links for these relationships. [Messaging span conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/).

## Preserve Framework Context Too

A worker that invokes LangGraph still needs its callback configuration and application metadata. W3C trace headers do not recreate a LangChain callback manager or a checkpoint ID. Initialize instrumentation in the worker process and build the appropriate invocation config using trusted job metadata.

Do not copy arbitrary baggage into prompts, authorization decisions, or unrestricted logs. Propagated context is for correlation, not proof of identity. At external ingress, validate or replace incoming context according to your service's trust policy.

Keep tenant authorization in the job's authenticated application contract. The trace ID should help find the work, not grant access to it.

## Verify Both Parentage and Lifetime

Test a request that enqueues a synthetic job and a worker that processes it in a separate process. Confirm the worker trace ID matches the producer's and its parent span ID matches the injected publish span. Then test missing headers, malformed headers, and a redelivery.

For threads, submit two tasks under different request spans and assert no cross-request parentage. Use an in-memory exporter or a local collector so the test does not depend on an external backend.

Also check process shutdown. A short-lived worker can exit before buffered spans export. Use the SDK's documented flush or shutdown behavior during graceful termination, and monitor exporter failures. Correct propagation cannot help if the only worker spans never leave the process.

## Conclusion

Serialize context across queues and processes, copy it for custom thread work, and preserve framework configuration separately. Distinct job and attempt identities keep retries, resumptions, and fan-in understandable.

## Official Documentation

- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [Python context variables](https://docs.python.org/3/library/contextvars.html)
- [Python thread execution from asyncio](https://docs.python.org/3/library/asyncio-task.html#running-in-threads)
- [OpenTelemetry messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
