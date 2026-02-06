# How to Correlate Asynchronous Event-Driven Flows Across Multiple Services Using OpenTelemetry Span Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Links, Async Correlation, Event-Driven Architecture

Description: Use OpenTelemetry span links to correlate asynchronous event flows across services when parent-child relationships do not apply.

In synchronous request-response systems, trace context propagation is straightforward: each span is a child of the previous one. But in event-driven architectures, the producer and consumer run at different times, and a single consumer might process events from multiple producers. This is where span links come in. They let you connect related spans without forcing a parent-child hierarchy.

## When to Use Span Links vs Parent-Child

Use parent-child spans when one operation directly causes another in a synchronous flow. Use span links when:

- A consumer processes a message that was produced minutes or hours ago
- A single span is triggered by multiple upstream events (fan-in)
- A batch consumer processes messages from different traces
- You want to correlate events without implying a timing dependency

## Basic Span Link Example

```python
from opentelemetry import trace

tracer = trace.get_tracer("event.processor")

def process_event_with_link(event, producer_span_context):
    """
    Process an event and link back to the producer's span.
    The link shows the relationship without making this a child span.
    """
    link = trace.Link(
        context=producer_span_context,
        attributes={
            "link.relationship": "triggered_by",
            "link.event_type": event["type"],
        }
    )

    with tracer.start_as_current_span(
        "process_event",
        links=[link],
        kind=trace.SpanKind.CONSUMER,
        attributes={
            "event.id": event["id"],
            "event.type": event["type"],
        }
    ) as span:
        do_processing(event)
        span.set_attribute("processing.status", "complete")
```

## Fan-In: Multiple Events Triggering One Action

Consider an order fulfillment service that waits for both payment confirmation and inventory reservation before shipping. When both events arrive, a single "ship order" span needs to reference both:

```python
class OrderFulfillmentService:
    def __init__(self):
        self.pending_orders = {}

    def on_payment_confirmed(self, event, span_context):
        """Record that payment is confirmed for an order."""
        order_id = event["order_id"]
        if order_id not in self.pending_orders:
            self.pending_orders[order_id] = {}
        self.pending_orders[order_id]["payment"] = {
            "event": event,
            "span_context": span_context,
        }
        self._try_fulfill(order_id)

    def on_inventory_reserved(self, event, span_context):
        """Record that inventory is reserved for an order."""
        order_id = event["order_id"]
        if order_id not in self.pending_orders:
            self.pending_orders[order_id] = {}
        self.pending_orders[order_id]["inventory"] = {
            "event": event,
            "span_context": span_context,
        }
        self._try_fulfill(order_id)

    def _try_fulfill(self, order_id):
        """If all prerequisites are met, ship the order with links to both events."""
        order = self.pending_orders.get(order_id, {})
        if "payment" not in order or "inventory" not in order:
            return  # Not ready yet

        # Create links to BOTH triggering events
        links = [
            trace.Link(
                context=order["payment"]["span_context"],
                attributes={"link.relationship": "payment_confirmation"},
            ),
            trace.Link(
                context=order["inventory"]["span_context"],
                attributes={"link.relationship": "inventory_reservation"},
            ),
        ]

        with tracer.start_as_current_span(
            "fulfill_order",
            links=links,
            attributes={
                "order.id": order_id,
                "fulfillment.trigger_count": 2,
            }
        ) as span:
            ship_order(order_id)
            span.set_attribute("fulfillment.status", "shipped")

        del self.pending_orders[order_id]
```

## Fan-Out: One Event Triggering Multiple Consumers

When one event triggers multiple downstream processes, each consumer creates its own span linked back to the producer:

```python
def on_order_created(event, producer_span_context):
    """Multiple services react to an order creation."""

    # Each service creates its own span with a link to the producer
    link = trace.Link(
        context=producer_span_context,
        attributes={"link.relationship": "triggered_by_order_created"},
    )

    # Notification service
    with tracer.start_as_current_span(
        "send_order_confirmation_email",
        links=[link],
        kind=trace.SpanKind.CONSUMER,
    ) as span:
        send_email(event["customer_email"], "Order confirmed")
        span.set_attribute("notification.channel", "email")


def on_order_created_analytics(event, producer_span_context):
    """Analytics service also reacts to the same event."""

    link = trace.Link(
        context=producer_span_context,
        attributes={"link.relationship": "triggered_by_order_created"},
    )

    with tracer.start_as_current_span(
        "record_order_analytics",
        links=[link],
        kind=trace.SpanKind.CONSUMER,
    ) as span:
        record_metric(event)
        span.set_attribute("analytics.recorded", True)
```

## Extracting Span Context from Event Metadata

In practice, the producer stores its span context in the event itself. Here is how to extract it on the consumer side:

```python
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

propagator = TraceContextTextMapPropagator()

def extract_span_context_from_event(event):
    """Pull the span context out of event metadata for use in links."""
    carrier = {
        "traceparent": event.get("metadata", {}).get("traceparent", ""),
        "tracestate": event.get("metadata", {}).get("tracestate", ""),
    }

    # Extract returns a Context; we need to get the SpanContext from it
    ctx = propagator.extract(carrier)
    span = trace.get_current_span(ctx)
    return span.get_span_context()


def consume_event(raw_event):
    """Full consumer flow: extract context, create linked span, process."""
    event = json.loads(raw_event)
    producer_ctx = extract_span_context_from_event(event)

    link = trace.Link(context=producer_ctx)

    with tracer.start_as_current_span(
        f"consume_{event['type']}",
        links=[link],
        kind=trace.SpanKind.CONSUMER,
    ):
        route_event(event)
```

## Batch Processing with Multiple Links

When processing a batch of events, create one span with links to every event in the batch:

```python
def process_batch(events):
    """Process a batch of events, linking to each producer."""
    links = []
    for event in events:
        ctx = extract_span_context_from_event(event)
        if ctx.is_valid:
            links.append(trace.Link(
                context=ctx,
                attributes={"event.id": event["id"]},
            ))

    with tracer.start_as_current_span(
        "process_event_batch",
        links=links,
        attributes={
            "batch.size": len(events),
            "batch.link_count": len(links),
        }
    ):
        for event in events:
            process_single(event)
```

Span links are the right tool for expressing relationships in asynchronous, event-driven systems. They let your tracing backend show you how events relate to each other without distorting the actual execution timeline.
