# How to Trace Order Fulfillment from Checkout to Warehouse Pick-Pack-Ship with OpenTelemetry Span Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Order Fulfillment, Span Links, Distributed Tracing

Description: Trace the entire order fulfillment pipeline from checkout through warehouse pick-pack-ship using OpenTelemetry span links.

Order fulfillment is a multi-stage process that crosses system boundaries. The checkout service creates an order, the warehouse management system (WMS) picks items, packers box them up, and shipping labels get generated. These stages often happen asynchronously, sometimes hours apart. Traditional parent-child span relationships break down here because there is no single request thread tying everything together. That is where OpenTelemetry span links come in.

## Why Span Links Instead of Parent-Child

A parent-child relationship implies synchronous or direct causation. But when a checkout event triggers a message on a queue, and a warehouse worker picks the item 20 minutes later, you do not have a parent-child relationship. You have a causal link between two independent traces. Span links let you express this: "this span is related to that span, but it is not a child of it."

## Defining the Order Trace Context

Start by capturing the trace context at checkout time and persisting it alongside the order record.

```python
from opentelemetry import trace
from opentelemetry.trace import Link, SpanContext, TraceFlags
import json

tracer = trace.get_tracer("fulfillment.service")

class CheckoutService:
    def complete_checkout(self, order_id: str, cart: dict):
        with tracer.start_as_current_span("checkout.complete") as span:
            span.set_attribute("order.id", order_id)
            span.set_attribute("order.item_count", len(cart["items"]))

            # Persist the span context so downstream services can link back
            span_context = span.get_span_context()
            trace_context = {
                "trace_id": format(span_context.trace_id, "032x"),
                "span_id": format(span_context.span_id, "016x"),
                "trace_flags": span_context.trace_flags
            }

            # Store this with the order record
            self.order_repo.create_order(
                order_id=order_id,
                items=cart["items"],
                trace_context=json.dumps(trace_context)
            )

            # Publish to fulfillment queue
            self.queue.publish("orders.new", {
                "order_id": order_id,
                "trace_context": trace_context
            })
```

## Linking the Pick Stage

When the warehouse management system picks up the order, it creates a new trace but links back to the checkout span.

```python
class WarehousePickService:
    def pick_order(self, message: dict):
        order_id = message["order_id"]
        checkout_ctx = message["trace_context"]

        # Reconstruct the checkout span context for linking
        checkout_span_context = SpanContext(
            trace_id=int(checkout_ctx["trace_id"], 16),
            span_id=int(checkout_ctx["span_id"], 16),
            is_remote=True,
            trace_flags=TraceFlags(checkout_ctx["trace_flags"])
        )

        # Start a new span with a link to the checkout span
        with tracer.start_as_current_span(
            "warehouse.pick",
            links=[Link(checkout_span_context, {"link.type": "follows_from"})]
        ) as span:
            span.set_attribute("order.id", order_id)
            span.set_attribute("warehouse.zone", self._determine_zone(order_id))

            items = self.order_repo.get_order_items(order_id)
            for item in items:
                with tracer.start_as_current_span("warehouse.pick_item") as pick_span:
                    pick_span.set_attribute("product.id", item["product_id"])
                    pick_span.set_attribute("product.sku", item["sku"])
                    pick_span.set_attribute("warehouse.bin", item["bin_location"])

                    self._pick_from_bin(item)

            # Pass context forward to packing
            pick_context = span.get_span_context()
            self.queue.publish("orders.picked", {
                "order_id": order_id,
                "checkout_trace_context": checkout_ctx,
                "pick_trace_context": {
                    "trace_id": format(pick_context.trace_id, "032x"),
                    "span_id": format(pick_context.span_id, "016x"),
                    "trace_flags": pick_context.trace_flags
                }
            })
```

## Linking the Pack and Ship Stages

The packing stage links back to both the checkout and pick spans, building a chain of related operations.

```python
class PackingService:
    def pack_order(self, message: dict):
        order_id = message["order_id"]

        # Build links to both previous stages
        links = []
        for ctx_key in ["checkout_trace_context", "pick_trace_context"]:
            ctx = message[ctx_key]
            span_ctx = SpanContext(
                trace_id=int(ctx["trace_id"], 16),
                span_id=int(ctx["span_id"], 16),
                is_remote=True,
                trace_flags=TraceFlags(ctx["trace_flags"])
            )
            stage_name = ctx_key.replace("_trace_context", "")
            links.append(Link(span_ctx, {"link.stage": stage_name}))

        with tracer.start_as_current_span("warehouse.pack", links=links) as span:
            span.set_attribute("order.id", order_id)

            # Determine box size based on items
            box = self._select_box(order_id)
            span.set_attribute("pack.box_size", box.size)
            span.set_attribute("pack.weight_kg", box.weight)

            self._generate_packing_slip(order_id)
            self._seal_package(order_id, box)

            # Hand off to shipping
            pack_context = span.get_span_context()
            self.queue.publish("orders.packed", {
                "order_id": order_id,
                "all_trace_contexts": {
                    **message,
                    "pack_trace_context": {
                        "trace_id": format(pack_context.trace_id, "032x"),
                        "span_id": format(pack_context.span_id, "016x"),
                        "trace_flags": pack_context.trace_flags
                    }
                }
            })


class ShippingService:
    def ship_order(self, message: dict):
        order_id = message["order_id"]
        contexts = message["all_trace_contexts"]

        # Link to all previous stages
        links = self._build_links(contexts)

        with tracer.start_as_current_span("shipping.dispatch", links=links) as span:
            span.set_attribute("order.id", order_id)

            label = self._generate_shipping_label(order_id)
            span.set_attribute("shipping.carrier", label.carrier)
            span.set_attribute("shipping.tracking_number", label.tracking)
            span.set_attribute("shipping.estimated_delivery", str(label.eta))

            self._hand_to_carrier(order_id, label)
```

## Querying Across the Fulfillment Chain

With span links in place, your observability backend can reconstruct the full order journey even though each stage ran in a separate trace. You can query for orders where the pick-to-ship time exceeded your SLA:

```sql
SELECT
    s1.attributes['order.id'] as order_id,
    s1.start_time as checkout_time,
    s2.start_time as pick_time,
    s3.end_time as ship_time,
    (s3.end_time - s1.start_time) as total_fulfillment_time
FROM spans s1
JOIN span_links sl1 ON sl1.linked_span_id = s1.span_id
JOIN spans s2 ON s2.span_id = sl1.span_id AND s2.name = 'warehouse.pick'
JOIN span_links sl2 ON sl2.linked_span_id = s2.span_id
JOIN spans s3 ON s3.span_id = sl2.span_id AND s3.name = 'shipping.dispatch'
WHERE s1.name = 'checkout.complete'
  AND (s3.end_time - s1.start_time) > INTERVAL '48 hours';
```

Span links are the right tool for modeling these asynchronous, multi-stage workflows. They preserve the causal chain without forcing everything into a single trace that would span hours or days.
