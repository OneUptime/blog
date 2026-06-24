# How to Instrument CloudEvents with OpenTelemetry Using the CloudEvents SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CloudEvent, Distributed Tracing, Event-Driven Architecture

Description: Learn how to instrument CloudEvents with OpenTelemetry using the distributed tracing extension in the CloudEvents SDK for full event observability.

CloudEvents is a specification for describing event data in a common way. When you combine it with OpenTelemetry, you get full visibility into how events flow across your distributed system. The CloudEvents distributed tracing extension defines trace context attributes, and the CloudEvents SDK lets you carry those attributes with your events.

## Why Instrument CloudEvents?

In event-driven systems, a single user action might trigger a chain of events that spans dozens of services. Without tracing, debugging a failed event means searching through logs across every service. By attaching OpenTelemetry trace context to your CloudEvents, you can follow that chain from start to finish.

## Setting Up the CloudEvents SDK with Distributed Tracing

First, install the required packages. We will use the Python CloudEvents SDK along with OpenTelemetry.

```bash
pip install cloudevents opentelemetry-sdk opentelemetry-api opentelemetry-exporter-otlp
```

## Configuring the Tracer Provider

Before creating any events, set up the OpenTelemetry tracer provider:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Create a resource that identifies this service

resource = Resource.create({
    "service.name": "order-event-producer",
    "service.version": "1.0.0"
})

# Set up the tracer provider with OTLP export
provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317")
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("cloudevents.producer")
```

## Creating a CloudEvent with Trace Context

The CloudEvents distributed tracing extension adds `traceparent` and `tracestate` attributes to your events. Here is how to create an event that carries trace context:

```python
from cloudevents.core.formats.json import JSONFormat
from cloudevents.core.v1.event import CloudEvent
from opentelemetry import trace
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

def create_traced_cloud_event(order_data):
    """Create a CloudEvent with OpenTelemetry trace context attached."""

    # Start a span for the event production
    with tracer.start_as_current_span("produce_order_event") as span:
        span.set_attribute("order.id", order_data["order_id"])
        span.set_attribute("cloudevents.event_type", "com.example.order.created")

        # Extract the current trace context
        propagator = TraceContextTextMapPropagator()
        carrier = {}
        propagator.inject(carrier)

        # Build the CloudEvent with distributed tracing extension attributes
        attributes = {
            "type": "com.example.order.created",
            "source": "https://example.com/orders",
            "subject": f"order/{order_data['order_id']}",
            # Distributed tracing extension fields
            "traceparent": carrier["traceparent"],
        }
        if "tracestate" in carrier:
            attributes["tracestate"] = carrier["tracestate"]

        event = CloudEvent(attributes, order_data)
        return JSONFormat().write(event)
```

## Consuming CloudEvents and Restoring Trace Context

On the consumer side, you need to extract the trace context from the incoming CloudEvent and create a child span:

```python
from cloudevents.core.formats.json import JSONFormat
from cloudevents.core.v1.event import CloudEvent
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry import trace

consumer_tracer = trace.get_tracer("cloudevents.consumer")

def handle_cloud_event(event_json):
    """Process an incoming CloudEvent and continue the trace."""

    event = JSONFormat().read(CloudEvent, event_json)

    # Extract trace context from the CloudEvent extensions
    carrier = {
        "traceparent": event.get_extension("traceparent"),
    }
    tracestate = event.get_extension("tracestate")
    if tracestate:
        carrier["tracestate"] = tracestate

    # Restore the trace context from the event
    propagator = TraceContextTextMapPropagator()
    ctx = propagator.extract(carrier)

    # Create a child span linked to the producer's trace
    with consumer_tracer.start_as_current_span(
        "process_order_event",
        context=ctx,
        kind=trace.SpanKind.CONSUMER
    ) as span:
        span.set_attribute("cloudevents.event_id", event.get_id())
        span.set_attribute("cloudevents.event_type", event.get_type())
        span.set_attribute("cloudevents.event_source", event.get_source())

        # Process the event data
        order_data = event.get_data()
        process_order(order_data)

        span.set_attribute("processing.status", "completed")

def process_order(order_data):
    """Your actual business logic here."""
    print(f"Processing order: {order_data['order_id']}")
```

## Handling HTTP Transport

When sending CloudEvents over HTTP, the trace context can also live in HTTP headers. The CloudEvents HTTP binding naturally supports this:

```python
import requests
from cloudevents.core.bindings.http import to_structured_event
from cloudevents.core.v1.event import CloudEvent
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

def send_cloud_event_http(event_data):
    """Send a CloudEvent over HTTP with trace context in both headers and body."""

    with tracer.start_as_current_span("send_event_http") as span:
        attributes = {
            "type": "com.example.order.shipped",
            "source": "https://example.com/shipping",
        }

        propagator = TraceContextTextMapPropagator()
        carrier = {}
        propagator.inject(carrier)
        attributes["traceparent"] = carrier["traceparent"]
        if "tracestate" in carrier:
            attributes["tracestate"] = carrier["tracestate"]

        event = CloudEvent(attributes, event_data)

        # Convert to structured content mode (CloudEvent attributes in the JSON body)
        message = to_structured_event(event)
        headers = message.headers

        # Inject OpenTelemetry trace context into the HTTP headers
        propagator.inject(headers)

        response = requests.post(
            "https://events.example.com/ingest",
            headers=headers,
            data=message.body
        )

        span.set_attribute("http.status_code", response.status_code)
        return response
```

## Testing Your Instrumentation

To verify everything works, you can run a simple end-to-end test:

```python
if __name__ == "__main__":
    # Produce an event
    order = {"order_id": "ORD-12345", "item": "Widget", "quantity": 3}
    event_json = create_traced_cloud_event(order)

    # Simulate consuming the event
    handle_cloud_event(event_json)

    # Flush spans to ensure they are exported
    trace.get_tracer_provider().force_flush()
```

When you view these spans in your tracing backend, you will see a connected trace that flows from the producer through the consumer, with all the CloudEvents metadata attached as span attributes.

## Key Takeaways

The CloudEvents distributed tracing extension gives you a standard way to propagate trace context through events. The `traceparent` and `tracestate` fields follow the W3C Trace Context specification, which means they are compatible with any OpenTelemetry-instrumented service. This approach works regardless of the transport layer you choose, whether that is HTTP, Kafka, AMQP, or anything else that can carry CloudEvents.
