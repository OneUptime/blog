# How to Trace Return and Refund Processing Workflows Across Payment and Inventory Services with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Returns, Refunds, Payment Processing

Description: Trace return and refund processing workflows across payment gateways and inventory services with OpenTelemetry distributed tracing.

Returns and refunds are some of the most error-prone workflows in e-commerce. A single return request touches the order service, inventory management, payment gateway (for refunds), loyalty points (if applicable), and shipping (for return labels). When something goes wrong, customers get frustrated fast because they are waiting for their money back. OpenTelemetry tracing gives you full visibility into where a return is stuck and why.

## The Return Processing Flow

A typical return goes through these steps:

1. Customer initiates a return (RMA creation)
2. Return eligibility check
3. Return shipping label generation
4. Item received at warehouse
5. Quality inspection
6. Refund initiation
7. Inventory restocking
8. Customer notification

## Instrumenting the Return Request

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode, Link, SpanContext, TraceFlags
import time
import json

tracer = trace.get_tracer("returns.service")
meter = metrics.get_meter("returns.service")

return_requests = meter.create_counter(
    "returns.requests.total",
    description="Total return requests initiated"
)

return_processing_time = meter.create_histogram(
    "returns.processing.duration",
    unit="hours",
    description="Total time from return request to refund completion"
)

refund_amount = meter.create_histogram(
    "returns.refund.amount",
    unit="dollars",
    description="Refund amounts processed"
)

class ReturnService:
    def initiate_return(self, order_id: str, user_id: str, items: list, reason: str):
        with tracer.start_as_current_span("return.initiate") as span:
            rma_id = self._generate_rma_id()
            span.set_attribute("return.rma_id", rma_id)
            span.set_attribute("return.order_id", order_id)
            span.set_attribute("return.user_id", user_id)
            span.set_attribute("return.item_count", len(items))
            span.set_attribute("return.reason", reason)

            # Link back to the original order trace if available
            order = self.order_repo.get_order(order_id)
            if order.get("trace_context"):
                order_ctx = json.loads(order["trace_context"])
                original_span = SpanContext(
                    trace_id=int(order_ctx["trace_id"], 16),
                    span_id=int(order_ctx["span_id"], 16),
                    is_remote=True,
                    trace_flags=TraceFlags(order_ctx["trace_flags"])
                )
                span.add_link(original_span, {"link.type": "original_order"})

            # Check eligibility
            eligible = self._check_eligibility(order_id, items)
            if not eligible["allowed"]:
                span.set_attribute("return.rejected", True)
                span.set_attribute("return.rejection_reason", eligible["reason"])
                return {"status": "rejected", "reason": eligible["reason"]}

            # Calculate refund amount
            refund_total = self._calculate_refund(order, items)
            span.set_attribute("return.refund_amount", refund_total)

            # Generate return shipping label
            label = self._generate_return_label(order, rma_id)
            span.set_attribute("return.tracking_number", label["tracking"])

            # Save RMA with trace context for downstream linking
            span_ctx = span.get_span_context()
            self.rma_repo.create({
                "rma_id": rma_id,
                "order_id": order_id,
                "user_id": user_id,
                "items": items,
                "reason": reason,
                "refund_amount": refund_total,
                "status": "awaiting_shipment",
                "trace_context": json.dumps({
                    "trace_id": format(span_ctx.trace_id, "032x"),
                    "span_id": format(span_ctx.span_id, "016x"),
                    "trace_flags": span_ctx.trace_flags
                })
            })

            return_requests.add(1, {
                "return.reason": reason,
                "return.item_count": str(len(items))
            })

            return {"status": "created", "rma_id": rma_id, "label": label}

    def _check_eligibility(self, order_id: str, items: list):
        with tracer.start_as_current_span("return.check_eligibility") as span:
            order = self.order_repo.get_order(order_id)
            days_since_delivery = (time.time() - order["delivered_at"]) / 86400

            span.set_attribute("return.days_since_delivery", round(days_since_delivery, 1))
            span.set_attribute("return.within_window", days_since_delivery <= 30)

            if days_since_delivery > 30:
                return {"allowed": False, "reason": "past_return_window"}

            # Check if items are in returnable categories
            for item in items:
                product = self.catalog.get_product(item["product_id"])
                if not product.get("returnable", True):
                    span.set_attribute("return.non_returnable_item", item["product_id"])
                    return {"allowed": False, "reason": "non_returnable_item"}

            return {"allowed": True, "reason": None}
```

## Processing the Refund

When the returned item arrives and passes inspection, the refund workflow begins. This is where payment gateway calls happen and where things often go wrong.

```python
class RefundProcessor:
    def process_refund(self, rma_id: str):
        rma = self.rma_repo.get(rma_id)

        # Link back to the RMA initiation span
        rma_ctx = json.loads(rma["trace_context"])
        rma_span_context = SpanContext(
            trace_id=int(rma_ctx["trace_id"], 16),
            span_id=int(rma_ctx["span_id"], 16),
            is_remote=True,
            trace_flags=TraceFlags(rma_ctx["trace_flags"])
        )

        with tracer.start_as_current_span(
            "refund.process",
            links=[Link(rma_span_context, {"link.type": "rma_initiation"})]
        ) as span:
            span.set_attribute("refund.rma_id", rma_id)
            span.set_attribute("refund.amount", rma["refund_amount"])
            span.set_attribute("refund.order_id", rma["order_id"])

            # Step 1: Refund via payment gateway
            payment_result = self._refund_payment(rma)

            # Step 2: Restock inventory
            self._restock_items(rma)

            # Step 3: Adjust loyalty points if applicable
            self._adjust_loyalty(rma)

            # Step 4: Notify customer
            self._notify_customer(rma, payment_result)

            # Record total processing time
            total_hours = (time.time() - rma["created_at"]) / 3600
            return_processing_time.record(total_hours, {
                "return.reason": rma["reason"]
            })

            refund_amount.record(rma["refund_amount"], {
                "payment.method": payment_result["method"]
            })

    def _refund_payment(self, rma: dict):
        with tracer.start_as_current_span("refund.payment_gateway") as span:
            order = self.order_repo.get_order(rma["order_id"])
            span.set_attribute("payment.method", order["payment_method"])
            span.set_attribute("payment.gateway", order["payment_gateway"])
            span.set_attribute("refund.amount", rma["refund_amount"])

            try:
                # Call the payment gateway
                result = self.payment_gateway.refund(
                    transaction_id=order["payment_transaction_id"],
                    amount=rma["refund_amount"],
                    currency=order["currency"]
                )

                span.set_attribute("refund.gateway_ref", result["reference_id"])
                span.set_attribute("refund.status", result["status"])

                if result["status"] == "pending":
                    span.set_attribute("refund.estimated_days", result.get("estimated_days", 5))

                return result

            except Exception as e:
                span.set_status(StatusCode.ERROR, f"Payment refund failed: {str(e)}")
                span.record_exception(e)

                # Queue for retry
                self.retry_queue.publish("refund.retry", {
                    "rma_id": rma["rma_id"],
                    "attempt": 1
                })
                raise

    def _restock_items(self, rma: dict):
        with tracer.start_as_current_span("refund.restock") as span:
            span.set_attribute("restock.item_count", len(rma["items"]))

            for item in rma["items"]:
                with tracer.start_as_current_span("refund.restock_item") as item_span:
                    item_span.set_attribute("product.id", item["product_id"])
                    item_span.set_attribute("restock.quantity", item["quantity"])
                    item_span.set_attribute("restock.condition",
                                           item.get("inspection_result", "like_new"))

                    # Only restock if item passed quality inspection
                    if item.get("inspection_result") in ("like_new", "good"):
                        self.inventory_service.add_stock(
                            item["product_id"],
                            item["quantity"],
                            condition=item.get("inspection_result")
                        )
                        item_span.set_attribute("restock.restocked", True)
                    else:
                        item_span.set_attribute("restock.restocked", False)
                        item_span.set_attribute("restock.disposition", "liquidation")
```

## Monitoring Refund SLAs

Set up metrics to track whether you are meeting your refund timing promises.

```python
# Query: Average refund processing time by payment method
REFUND_SLA_QUERY = """
SELECT
    attributes['payment.method'] as method,
    avg(attributes['refund.estimated_days']) as avg_estimated_days,
    quantile(0.95)(duration_ms / 3600000) as p95_actual_hours
FROM spans
WHERE name = 'refund.payment_gateway'
  AND attributes['refund.status'] = 'completed'
GROUP BY method
"""
```

The key to debugging return issues is having the span links that connect the customer's original return request to the warehouse inspection, the payment gateway refund call, and the inventory restock. When a customer asks "where is my refund?", you can pull up the RMA ID and trace the exact state of every step in the process.
