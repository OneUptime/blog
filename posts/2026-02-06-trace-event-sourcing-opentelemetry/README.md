# How to Trace Event Sourcing Systems with OpenTelemetry: From Command to Event to Projection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Event Sourcing, CQRS, Distributed Tracing

Description: Learn to trace the full lifecycle of event sourcing systems with OpenTelemetry from command handling to event storage to projection updates.

Event sourcing stores state as a sequence of events rather than a current snapshot. A command comes in, gets validated, produces one or more events, those events get persisted to an event store, and projections read those events to build read models. Each of these steps is a natural boundary for an OpenTelemetry span.

## The Event Sourcing Lifecycle

A typical flow looks like this: Command -> Command Handler -> Domain Events -> Event Store -> Projections. Let us trace each step.

## Setting Up the Tracer

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("event-sourcing-app")
```

## Tracing the Command Handler

The command handler is the entry point. It validates the command and decides what events to produce:

```python
class OrderCommandHandler:
    def __init__(self, event_store):
        self.event_store = event_store

    def handle_place_order(self, command):
        # Start a span for the entire command handling process
        with tracer.start_as_current_span(
            "handle_command",
            attributes={
                "command.type": "PlaceOrder",
                "command.aggregate_id": command.order_id,
                "command.user_id": command.user_id,
            }
        ) as span:
            # Load the aggregate from the event store
            aggregate = self._load_aggregate(command.order_id)

            # Execute the command against the aggregate
            # This produces domain events
            events = aggregate.place_order(
                items=command.items,
                shipping_address=command.shipping_address
            )

            span.set_attribute("events.count", len(events))
            span.set_attribute("events.types", [e.event_type for e in events])

            # Persist the events
            self._persist_events(command.order_id, events)

            return events

    def _load_aggregate(self, aggregate_id):
        with tracer.start_as_current_span(
            "load_aggregate",
            attributes={
                "aggregate.id": aggregate_id,
                "aggregate.type": "Order",
            }
        ) as span:
            events = self.event_store.load_events(aggregate_id)
            span.set_attribute("events.loaded", len(events))

            aggregate = OrderAggregate()
            aggregate.replay(events)
            span.set_attribute("aggregate.version", aggregate.version)

            return aggregate

    def _persist_events(self, aggregate_id, events):
        with tracer.start_as_current_span(
            "persist_events",
            attributes={
                "aggregate.id": aggregate_id,
                "events.count": len(events),
            }
        ) as span:
            for event in events:
                self.event_store.append(aggregate_id, event)
                span.add_event(
                    "event_persisted",
                    attributes={
                        "event.type": event.event_type,
                        "event.sequence": event.sequence_number,
                    }
                )
```

## Tracing Event Store Operations

The event store itself should produce spans showing the actual storage operations:

```python
class TracedEventStore:
    def __init__(self, connection):
        self.connection = connection

    def append(self, aggregate_id, event):
        with tracer.start_as_current_span(
            "event_store.append",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "postgresql",
                "db.operation": "INSERT",
                "event.type": event.event_type,
                "event.aggregate_id": aggregate_id,
                "event.sequence_number": event.sequence_number,
                "event.timestamp": event.timestamp.isoformat(),
            }
        ):
            self.connection.execute(
                "INSERT INTO events (aggregate_id, event_type, data, sequence_number) "
                "VALUES (%s, %s, %s, %s)",
                (aggregate_id, event.event_type, event.serialize(), event.sequence_number)
            )

    def load_events(self, aggregate_id):
        with tracer.start_as_current_span(
            "event_store.load",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "postgresql",
                "db.operation": "SELECT",
                "event.aggregate_id": aggregate_id,
            }
        ) as span:
            rows = self.connection.execute(
                "SELECT * FROM events WHERE aggregate_id = %s ORDER BY sequence_number",
                (aggregate_id,)
            ).fetchall()

            span.set_attribute("events.loaded_count", len(rows))
            return [Event.from_row(row) for row in rows]
```

## Tracing Projections

Projections consume events and build read-optimized views. Since projections often run asynchronously, use span links to connect them back to the original command:

```python
class OrderProjection:
    def __init__(self, read_db):
        self.read_db = read_db

    def handle_event(self, event, producer_span_context=None):
        # Create a link to the span that produced this event
        links = []
        if producer_span_context:
            links.append(trace.Link(producer_span_context))

        with tracer.start_as_current_span(
            "projection.update",
            links=links,
            attributes={
                "projection.name": "OrderReadModel",
                "event.type": event.event_type,
                "event.aggregate_id": event.aggregate_id,
                "event.sequence_number": event.sequence_number,
            }
        ) as span:
            if event.event_type == "OrderPlaced":
                self._create_order_view(event)
                span.set_attribute("projection.action", "create")
            elif event.event_type == "OrderShipped":
                self._update_order_status(event, "shipped")
                span.set_attribute("projection.action", "update")
            elif event.event_type == "OrderCancelled":
                self._update_order_status(event, "cancelled")
                span.set_attribute("projection.action", "update")

    def _create_order_view(self, event):
        with tracer.start_as_current_span("projection.insert_read_model"):
            self.read_db.execute(
                "INSERT INTO order_views (order_id, status, data) VALUES (%s, %s, %s)",
                (event.aggregate_id, "placed", event.data)
            )

    def _update_order_status(self, event, status):
        with tracer.start_as_current_span("projection.update_read_model"):
            self.read_db.execute(
                "UPDATE order_views SET status = %s WHERE order_id = %s",
                (status, event.aggregate_id)
            )
```

## What You See in the Trace

After running a PlaceOrder command, your tracing backend shows a trace with these spans:

1. `handle_command` (root) - The entire command handling flow
2. `load_aggregate` (child) - Loading existing events to rebuild state
3. `event_store.load` (child) - The actual database read
4. `persist_events` (child) - Writing new events to the store
5. `event_store.append` (child) - Individual database writes
6. `projection.update` (linked) - The projection processing the event

The projection span is linked rather than a direct child, because it runs asynchronously. This gives you full visibility while accurately representing the system's actual execution flow.

This pattern scales to complex event sourcing systems with multiple aggregates, sagas, and projections. Each component adds its own spans, and the trace ties them all together.
