# Correlate LLM Spans with HTTP, Database, Queue, and Vector Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Tracing

Description: Connect LLM operations to the services they depend on with shared trace context, clear span ownership, and explicit queue propagation.

A slow answer may spend most of its time waiting for a database connection or vector search. If LLM spans live in a separate trace from the HTTP request, the observability interface makes that delay look like an unexplained model problem.

Correlate the full request path before optimizing prompts or changing providers. The goal is a causal trace that includes the application request, agent workflow, retrieval, provider call, and downstream dependencies.

## Establish One Trace Context

Use the application's incoming server span as the parent of the agent invocation. Create logical spans around operations such as context assembly or reranking, and let supported HTTP and database instrumentation create the lower-level dependency spans.

An expected tree might look like this:

```text
POST /answer
  agent.answer
    rag.retrieve
      database connection/query
      vector search HTTP request
    rag.assemble
    model.generate
      provider HTTP request
    response.persist
      database insert
```

Do not create another root merely because a different telemetry library owns LLM instrumentation. OpenTelemetry propagation carries the active trace context across instrumented boundaries. Supported integrations may have their own setup requirements, so verify that the model integration uses the application's tracer provider and active context. [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/).

Configure the SDK once during process startup. Replacing the tracer provider inside each request can fragment traces, disrupt exporters, or be rejected by the SDK. A library that only obtains a tracer still needs the host application to configure an SDK for export.

## Separate Logical Operations from Transport

A `model.generate` span represents one model attempt. An HTTP client span represents a network request. Keeping both can be useful: token usage belongs to the generation, while HTTP status, network retries, and endpoint timing belong to transport.

This only works if their responsibilities are clear. Two LLM integrations that each instrument the same model call can produce duplicate generation spans and double-count usage. Enable one owner for the logical generation layer, then inspect whether the transport instrumentation adds useful detail.

Use stable span names and bounded attributes such as operation, provider, model, and deployment environment. Store trace IDs and request IDs in traces or logs, not as metric dimensions. Those values create a new time series for almost every request.

## Instrument a Custom Retrieval Boundary

Wrap custom application logic even when its database and HTTP libraries already have instrumentation. The logical span explains why the dependencies were called.

```python
from opentelemetry import trace

tracer = trace.get_tracer("assistant.retrieval")


async def retrieve(query, vector_search, fetch_documents):
    with tracer.start_as_current_span("rag.retrieve") as span:
        matches = await vector_search(query)
        span.set_attribute("app.rag.match_count", len(matches))
        ids = [match["id"] for match in matches]
        documents = await fetch_documents(ids)
        span.set_attribute("app.rag.document_count", len(documents))
        return documents
```

The supplied functions are application adapters. When they call instrumented clients within this scope, dependency spans can inherit the retrieval span as their parent. This snippet does not install a vector database integration or make arbitrary libraries trace themselves.

The counts help distinguish an empty search from documents disappearing during materialization. Keep query text, filters containing user data, and document bodies out of these attributes unless specifically approved for capture.

## Propagate Across Queue Boundaries

In-process context does not cross a broker by itself. Inject propagation headers into the message metadata while the producer span is current. The consumer extracts those headers and uses the resulting context when starting its processing span.

```python
from opentelemetry import propagate, trace
from opentelemetry.trace import SpanKind


def publish_job(send_message, payload):
    with tracer.start_as_current_span(
        "answer.publish", kind=SpanKind.PRODUCER
    ):
        headers = {}
        propagate.inject(headers)
        send_message(payload=payload, headers=headers)


def process_job(payload, headers, handle):
    parent = propagate.extract(headers)
    with tracer.start_as_current_span(
        "answer.process", context=parent, kind=SpanKind.CONSUMER
    ):
        return handle(payload)
```

Adapt the carrier to the broker's metadata representation and avoid reinstrumenting a client that already propagates context. At untrusted ingress, apply your trace-context acceptance policy rather than blindly trusting arbitrary external identifiers. For batches or work triggered by multiple messages, use links when a single parent would misrepresent causality. [OpenTelemetry messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/).

## Diagnose Gaps in Order

If the model span is a root, check initialization and context at its start. If HTTP children exist but database spans do not, verify the database instrumentation supports the exact client and version. If queue consumers start new traces, inspect the actual serialized message metadata and extraction path.

A shared trace ID does not guarantee all spans will be visible. Sampling decisions, exporter queues, collector routing, backend ingestion filters, and delayed exports can remove parts of a trace. Verify the same request at application export and backend ingestion before changing parentage code.

Test one request that performs vector search, a database fetch, and a model stub. Then test the queued path. Confirm causal parent IDs, service names, and no duplicate logical generation spans. Use dependency timing to identify the critical path rather than adding durations of operations that overlap.

## Conclusion

Connect LLM operations to the application's existing trace and preserve context across every process boundary. Clear ownership of logical and transport spans makes latency, failures, and usage attributable to the component that produced them.

## Official Documentation

- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [OpenTelemetry messaging span conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
