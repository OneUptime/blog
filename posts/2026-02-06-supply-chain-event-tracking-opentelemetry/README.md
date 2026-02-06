# How to Monitor Supply Chain Event Tracking (Shipment, Customs, Delivery) with OpenTelemetry Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Supply Chain, Distributed Tracing, Logistics, Shipment Tracking

Description: Use OpenTelemetry distributed tracing to track shipments across supply chain stages including customs, warehousing, and last-mile delivery.

Supply chains involve dozens of handoffs: a factory ships goods, a freight forwarder picks them up, they cross borders through customs, get warehoused, and finally reach the customer. Each handoff is managed by a different system, often a different company. When a shipment is late, figuring out where it got stuck requires calling multiple parties and checking multiple portals.

Distributed tracing, the same concept that tracks requests across microservices, maps naturally to supply chain event tracking. Each stage of a shipment becomes a span, and the entire journey from factory to customer becomes a trace.

## Modeling Supply Chain Events as Spans

The key insight is that a shipment's lifecycle looks a lot like a distributed system call:

```
Factory Dispatch --> Freight Pickup --> Port Loading --> Customs Clearance --> Unloading --> Warehouse --> Last Mile --> Delivery
```

Each stage has a start time, end time, and metadata. That is exactly what a span captures.

## Creating the Shipment Trace

Here is how to initiate a trace when a shipment is created:

```python
from opentelemetry import trace, context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("supply-chain-tracker")
propagator = TraceContextTextMapPropagator()

def create_shipment(order_id, origin, destination, items):
    """
    Start a new trace for a shipment. The trace context will be
    propagated to every downstream system that handles this shipment.
    """
    with tracer.start_as_current_span("shipment.lifecycle") as span:
        shipment_id = generate_shipment_id()
        span.set_attribute("shipment.id", shipment_id)
        span.set_attribute("shipment.order_id", order_id)
        span.set_attribute("shipment.origin.country", origin["country"])
        span.set_attribute("shipment.origin.city", origin["city"])
        span.set_attribute("shipment.destination.country", destination["country"])
        span.set_attribute("shipment.destination.city", destination["city"])
        span.set_attribute("shipment.item_count", len(items))

        # Extract trace context so we can pass it along with the shipment
        carrier = {}
        propagator.inject(carrier)

        # Store the trace context with the shipment record
        save_shipment(shipment_id, order_id, origin, destination, items, carrier)
        return shipment_id, carrier
```

## Propagating Context Across Supply Chain Partners

When a freight forwarder or customs broker processes the shipment, they restore the trace context and add their own span:

```python
def record_supply_chain_event(shipment_id, event_type, event_data):
    """
    Record a supply chain event as a span within the shipment trace.
    Each partner system calls this when they process the shipment.
    """
    # Retrieve the stored trace context for this shipment
    shipment = get_shipment(shipment_id)
    parent_context = propagator.extract(shipment["trace_context"])

    # Create a new span as a child of the shipment lifecycle
    with tracer.start_as_current_span(
        f"shipment.{event_type}",
        context=parent_context
    ) as span:
        span.set_attribute("shipment.id", shipment_id)
        span.set_attribute("event.type", event_type)
        span.set_attribute("event.location", event_data.get("location", ""))
        span.set_attribute("event.handler", event_data.get("handler", ""))

        # Add type-specific attributes
        if event_type == "customs_clearance":
            span.set_attribute("customs.broker", event_data["broker"])
            span.set_attribute("customs.declaration_id", event_data["declaration_id"])
            span.set_attribute("customs.country", event_data["country"])

        elif event_type == "warehouse_intake":
            span.set_attribute("warehouse.id", event_data["warehouse_id"])
            span.set_attribute("warehouse.zone", event_data["zone"])
            span.set_attribute("warehouse.slot", event_data["slot"])

        elif event_type == "last_mile_dispatch":
            span.set_attribute("delivery.carrier", event_data["carrier"])
            span.set_attribute("delivery.tracking_number", event_data["tracking"])
            span.set_attribute("delivery.estimated_arrival", event_data["eta"])

        # Update the trace context in case the next handler needs it
        updated_carrier = {}
        propagator.inject(updated_carrier)
        update_shipment_trace_context(shipment_id, updated_carrier)
```

## Tracking Delays with Span Events

When something goes wrong, such as a customs hold or a weather delay, add span events:

```python
def record_delay(shipment_id, delay_reason, estimated_impact_hours):
    """Record a delay event on the current shipment span."""
    shipment = get_shipment(shipment_id)
    parent_context = propagator.extract(shipment["trace_context"])

    with tracer.start_as_current_span(
        "shipment.delay",
        context=parent_context
    ) as span:
        span.set_attribute("shipment.id", shipment_id)
        span.set_attribute("delay.reason", delay_reason)
        span.set_attribute("delay.impact_hours", estimated_impact_hours)
        span.set_attribute("delay.reported_at", datetime.utcnow().isoformat())

        # Mark the span status as error if the delay is significant
        if estimated_impact_hours > 24:
            span.set_status(trace.StatusCode.ERROR, f"Major delay: {delay_reason}")
```

## Metrics for Supply Chain KPIs

Besides traces, track aggregate supply chain metrics:

```python
meter = metrics.get_meter("supply-chain-tracker")

transit_time = meter.create_histogram(
    "shipment.transit_time_hours",
    description="Total transit time from dispatch to delivery",
    unit="hours"
)
customs_clearance_time = meter.create_histogram(
    "shipment.customs_clearance_hours",
    description="Time spent in customs clearance",
    unit="hours"
)
delay_count = meter.create_counter(
    "shipment.delays.total",
    description="Total number of shipment delays"
)
```

## What This Gives You

With this tracing setup, you get a waterfall view of every shipment's journey. When a customer asks "where is my order?", you can pull up the trace and see exactly which stage the shipment is in, how long each prior stage took, and whether there were any delays.

You can also aggregate across all shipments to find systemic bottlenecks. Maybe customs clearance in a particular country consistently takes 3x longer than expected. Or a specific freight forwarder has higher delay rates than others.

The trace context propagation through carrier headers is the critical piece. Whether you pass it through an API call, an EDI message, or even a QR code on a physical shipping label, the important thing is that every system in the chain can link its events back to the same trace.
