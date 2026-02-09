# How to Use OpenTelemetry Span Links to Debug Batch Processing Failures Back to Originating Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Links, Batch Processing, Debugging, Tracing

Description: Use OpenTelemetry span links to connect batch processing operations back to their originating requests for end-to-end debugging.

Batch processing breaks the simple parent-child relationship that makes distributed tracing intuitive. When a service collects 100 individual requests, bundles them into a batch, and processes them together, the batch trace has no parent-child connection to the original 100 request traces. OpenTelemetry span links solve this by creating explicit connections between related spans that are not in a parent-child relationship.

## The Problem With Batch Tracing

Consider an order fulfillment system. Individual orders come in through an API, each with its own trace. Every 30 seconds, a batch processor collects pending orders and sends them to the warehouse system as a single batch. If the batch fails, how do you find the original order traces that were affected? Without span links, you would need to grep through logs by order ID, hoping you recorded it somewhere.

## Adding Span Links During Batch Collection

When you collect items for a batch, record the span context from each original request:

```python
from opentelemetry import trace
from opentelemetry.trace import Link, SpanContext, TraceFlags

tracer = trace.get_tracer("batch-processor")

class OrderBatchProcessor:
    def __init__(self):
        self.pending_orders = []
        self.pending_contexts = []

    def enqueue_order(self, order, span_context):
        """
        Called from the API handler when a new order arrives.
        We save both the order and the span context from the
        original request trace.
        """
        self.pending_orders.append(order)
        self.pending_contexts.append(span_context)

    def process_batch(self):
        """Process all pending orders as a single batch."""
        if not self.pending_orders:
            return

        # Create links to all originating request spans
        links = []
        for ctx in self.pending_contexts:
            links.append(Link(
                context=ctx,
                attributes={
                    "link.type": "batch_member",
                    "link.description": "Original order request",
                },
            ))

        # Start the batch processing span with links to all origins
        with tracer.start_as_current_span(
            "batch.process_orders",
            links=links,
        ) as batch_span:
            batch_span.set_attribute("batch.size", len(self.pending_orders))
            batch_span.set_attribute("batch.order_ids", [
                o.id for o in self.pending_orders
            ])

            try:
                result = self.send_to_warehouse(self.pending_orders)
                batch_span.set_attribute("batch.success", True)
            except Exception as e:
                batch_span.set_attribute("batch.success", False)
                batch_span.set_attribute("error", True)
                batch_span.record_exception(e)
                raise
            finally:
                self.pending_orders = []
                self.pending_contexts = []

            return result
```

## Capturing the Span Context in the API Handler

In the API handler that receives individual orders, extract and save the current span context:

```python
from opentelemetry import trace

@app.post("/api/orders")
async def create_order(request):
    with tracer.start_as_current_span("api.create_order") as span:
        order = parse_order(request)
        span.set_attribute("order.id", order.id)

        # Get the current span context to pass to the batch processor
        current_span_context = span.get_span_context()

        # Enqueue the order along with its trace context
        batch_processor.enqueue_order(order, current_span_context)

        span.add_event("order.enqueued_for_batch")
        return {"order_id": order.id, "status": "pending"}
```

## Also Linking From Individual Items Back to the Batch

For bidirectional debugging, also add a link from the original order span to the batch span once the batch is processed:

```python
def process_batch(self):
    with tracer.start_as_current_span(
        "batch.process_orders",
        links=[Link(ctx) for ctx in self.pending_contexts],
    ) as batch_span:
        batch_context = batch_span.get_span_context()

        # For each pending order, create a follow-up span linked
        # back to the batch
        for order, original_ctx in zip(
            self.pending_orders, self.pending_contexts
        ):
            with tracer.start_as_current_span(
                "batch.process_single_order",
                links=[
                    Link(original_ctx, attributes={"link.type": "origin"}),
                    Link(batch_context, attributes={"link.type": "batch"}),
                ],
            ) as item_span:
                item_span.set_attribute("order.id", order.id)
                process_single_order(order)
```

## Debugging a Failed Batch

When a batch fails, the debugging workflow goes like this:

```python
def debug_failed_batch(trace_backend, batch_trace_id):
    """
    Given a failed batch trace ID, find all the original
    request traces that were affected.
    """
    # Fetch the batch trace
    batch_trace = trace_backend.get_trace(batch_trace_id)

    # Find the batch processing span
    batch_span = next(
        s for s in batch_trace["spans"]
        if s["name"] == "batch.process_orders"
    )

    # Extract the linked trace IDs
    linked_traces = []
    for link in batch_span.get("links", []):
        linked_traces.append({
            "trace_id": link["traceId"],
            "span_id": link["spanId"],
            "link_type": link.get("attributes", {}).get("link.type"),
        })

    print(f"Batch contained {len(linked_traces)} orders")
    print(f"Batch error: {batch_span.get('status', {}).get('message')}")

    # Fetch each linked trace to get the full order context
    for linked in linked_traces:
        original_trace = trace_backend.get_trace(linked["trace_id"])
        root_span = next(
            s for s in original_trace["spans"]
            if s.get("parentSpanId") is None
        )
        print(f"  Order trace: {linked['trace_id']}")
        print(f"  Endpoint: {root_span['name']}")
        print(f"  Attributes: {root_span.get('attributes', {})}")

    return linked_traces
```

## Handling High-Volume Batches

Span links have practical limits. If your batch contains 10,000 items, creating 10,000 links on a single span will bloat the trace data. For large batches, use a sampling approach:

```python
import random

def create_batch_links(contexts, max_links=100):
    """
    Create span links for a batch, sampling if the batch
    is too large to link every item.
    """
    if len(contexts) <= max_links:
        return [Link(ctx) for ctx in contexts]

    # Sample a representative subset
    sampled = random.sample(contexts, max_links)
    links = [Link(ctx, attributes={"link.sampled": True}) for ctx in sampled]

    return links
```

Also record the total batch size and the number of sampled links as span attributes so you know the sampling ratio when debugging.

## Summary

Span links are the bridge between individual request traces and batch processing traces. Without them, batch failures are disconnected from the requests that triggered them. By capturing span contexts at enqueue time and attaching them as links on the batch span, you create a navigable path from "this batch failed" to "these are the 100 customer orders that were affected." This turns batch debugging from a log-grep exercise into a click-through trace navigation workflow.
