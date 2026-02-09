# How to Test OpenTelemetry Context Propagation Across Service Boundaries in Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Context Propagation, Integration Testing, Distributed Tracing, W3C TraceContext

Description: Write integration tests that verify OpenTelemetry trace context propagates correctly across HTTP, gRPC, and message queue boundaries.

Context propagation is the backbone of distributed tracing. If it breaks at any service boundary, you lose trace continuity and your distributed traces fragment into disconnected pieces. This post shows you how to write integration tests that verify context propagation actually works across HTTP, gRPC, and messaging boundaries.

## What Can Go Wrong

Context propagation fails in subtle ways. A reverse proxy might strip the `traceparent` header. A message broker consumer might not extract context from message attributes. A gRPC interceptor might be registered in the wrong order. These bugs are invisible in unit tests because the services are not actually talking to each other.

## Testing HTTP Context Propagation

Start with the simplest case: two services communicating over HTTP. The test spins up both services, sends a request to the first one, and verifies that the trace ID is the same across both.

```python
# test_http_propagation.py
import pytest
import requests
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

# Shared in-memory exporter that both services write to
exporter = InMemorySpanExporter()

@pytest.fixture(autouse=True)
def setup_tracing():
    provider = TracerProvider()
    provider.add_span_processor(
        trace.get_tracer_provider()
        .__class__.__module__  # Just to avoid circular imports
    )
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    yield
    exporter.clear()

def test_trace_context_propagates_across_http(service_a_url, service_b_url):
    """
    Service A calls Service B internally.
    Verify that both services produce spans with the same trace ID.
    """
    # Send a request to Service A, which will call Service B
    response = requests.get(f"{service_a_url}/api/orders/123")
    assert response.status_code == 200

    # Give spans time to flush
    import time
    time.sleep(1)

    # Collect all spans
    spans = exporter.get_finished_spans()

    # There should be spans from both services
    service_a_spans = [s for s in spans if s.resource.attributes.get("service.name") == "service-a"]
    service_b_spans = [s for s in spans if s.resource.attributes.get("service.name") == "service-b"]

    assert len(service_a_spans) > 0, "No spans from Service A"
    assert len(service_b_spans) > 0, "No spans from Service B"

    # The critical assertion: all spans share the same trace ID
    trace_ids = set(s.context.trace_id for s in spans)
    assert len(trace_ids) == 1, (
        f"Expected 1 trace ID but found {len(trace_ids)}. "
        f"Context propagation is broken between services."
    )

    # Verify parent-child relationships
    service_b_span = service_b_spans[0]
    assert service_b_span.parent is not None, "Service B span has no parent - context not propagated"
    assert service_b_span.parent.trace_id == service_a_spans[0].context.trace_id
```

## Testing gRPC Context Propagation

gRPC uses interceptors for context propagation. Test that the interceptors are correctly installed:

```python
# test_grpc_propagation.py
import grpc
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry import trace

# Import your generated protobuf stubs
from proto import order_pb2, order_pb2_grpc

exporter = InMemorySpanExporter()

def setup_module():
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

def test_grpc_context_propagation(grpc_server_address):
    """Verify trace context propagates through gRPC calls."""
    exporter.clear()

    tracer = trace.get_tracer("test")

    # Create a parent span to act as the caller
    with tracer.start_as_current_span("test-parent") as parent_span:
        parent_trace_id = parent_span.get_span_context().trace_id

        # Make the gRPC call within the parent span context
        channel = grpc.insecure_channel(grpc_server_address)
        stub = order_pb2_grpc.OrderServiceStub(channel)
        response = stub.GetOrder(order_pb2.GetOrderRequest(order_id="123"))

    # Check that server-side spans have the same trace ID
    spans = exporter.get_finished_spans()
    server_spans = [s for s in spans if "grpc.server" in (s.name or "")]

    for span in server_spans:
        assert span.context.trace_id == parent_trace_id, (
            "gRPC server span has different trace ID. "
            "Check that OpenTelemetry gRPC interceptors are installed."
        )
```

## Testing Message Queue Propagation

Message queues are where propagation most commonly breaks. The producer must inject context into message headers, and the consumer must extract it.

```python
# test_kafka_propagation.py
import json
import time
from confluent_kafka import Producer, Consumer
from opentelemetry import trace, context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from opentelemetry.propagate import inject, extract

exporter = InMemorySpanExporter()

def setup_module():
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

def test_kafka_context_propagation(kafka_broker):
    """Verify trace context survives a round trip through Kafka."""
    exporter.clear()
    tracer = trace.get_tracer("test")
    topic = "test-propagation"

    # Producer side: inject context into Kafka headers
    with tracer.start_as_current_span("produce-message") as producer_span:
        original_trace_id = producer_span.get_span_context().trace_id

        headers = {}
        inject(headers)
        kafka_headers = [(k, v.encode()) for k, v in headers.items()]

        producer = Producer({"bootstrap.servers": kafka_broker})
        producer.produce(
            topic,
            value=json.dumps({"order_id": "123"}).encode(),
            headers=kafka_headers,
        )
        producer.flush()

    # Consumer side: extract context from Kafka headers
    consumer = Consumer({
        "bootstrap.servers": kafka_broker,
        "group.id": "test-group",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe([topic])

    msg = consumer.poll(timeout=10.0)
    assert msg is not None, "No message received from Kafka"

    # Extract context from message headers
    carrier = {h[0]: h[1].decode() for h in msg.headers()}
    extracted_ctx = extract(carrier)

    # Create a consumer span with the extracted context as parent
    with tracer.start_as_current_span(
        "consume-message",
        context=extracted_ctx,
    ) as consumer_span:
        consumer_trace_id = consumer_span.get_span_context().trace_id

    consumer.close()

    # The trace ID should match
    assert original_trace_id == consumer_trace_id, (
        "Trace ID changed across Kafka boundary. "
        "Check that context is injected into message headers on produce "
        "and extracted on consume."
    )
```

## A Reusable Test Helper

Extract the common pattern into a helper function:

```python
# propagation_test_helper.py
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

def assert_single_trace(exporter: InMemorySpanExporter, expected_services: list[str]):
    """Assert that all spans belong to a single trace and expected services are present."""
    spans = exporter.get_finished_spans()
    assert len(spans) > 0, "No spans were recorded"

    # Check all spans share one trace ID
    trace_ids = set(s.context.trace_id for s in spans)
    assert len(trace_ids) == 1, (
        f"Found {len(trace_ids)} distinct trace IDs - propagation is broken"
    )

    # Check expected services are present
    found_services = set()
    for span in spans:
        svc = span.resource.attributes.get("service.name", "unknown")
        found_services.add(svc)

    missing = set(expected_services) - found_services
    assert not missing, f"Missing spans from services: {missing}"
```

Run these tests as part of your integration test suite, especially after upgrading libraries, changing proxies, or adding new service boundaries. A broken propagation path can silently destroy your distributed tracing, and these tests catch it before your users notice fragmented traces.
