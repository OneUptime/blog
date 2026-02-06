# How to Trace Marketplace Seller Order Routing and Commission Calculation with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Marketplace, Order Routing, Commission

Description: Trace marketplace order routing to sellers and commission calculations across distributed services with OpenTelemetry instrumentation.

Marketplace platforms add a layer of complexity that single-seller stores do not have. When a customer places an order containing items from multiple sellers, you need to split the order, route each sub-order to the right seller, calculate commissions based on seller tier and category, handle per-seller shipping, and settle payments. Getting this wrong means sellers get underpaid (and they leave) or overpaid (and you lose margin). OpenTelemetry tracing makes the routing and commission logic auditable.

## The Order Splitting and Routing Flow

A marketplace order goes through these steps:

1. Customer places a multi-seller order
2. Order is split by seller
3. Each sub-order is routed to the seller's fulfillment system
4. Commission is calculated per seller per item
5. Payment is split between marketplace and sellers
6. Each seller is notified

## Instrumenting the Order Splitter

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import time

tracer = trace.get_tracer("marketplace.routing")
meter = metrics.get_meter("marketplace.routing")

orders_split = meter.create_counter(
    "marketplace.orders.split",
    description="Orders split by seller count"
)

commission_calculated = meter.create_histogram(
    "marketplace.commission.amount",
    unit="dollars",
    description="Commission amounts calculated"
)

routing_latency = meter.create_histogram(
    "marketplace.routing.latency",
    unit="ms",
    description="Time to route order to seller"
)

class OrderSplitter:
    def split_order(self, order: dict):
        with tracer.start_as_current_span("marketplace.split_order") as span:
            span.set_attribute("order.id", order["id"])
            span.set_attribute("order.total", order["total"])
            span.set_attribute("order.item_count", len(order["items"]))

            # Group items by seller
            seller_groups = {}
            for item in order["items"]:
                seller_id = item["seller_id"]
                if seller_id not in seller_groups:
                    seller_groups[seller_id] = []
                seller_groups[seller_id].append(item)

            seller_count = len(seller_groups)
            span.set_attribute("order.seller_count", seller_count)

            orders_split.add(1, {
                "seller_count": str(seller_count)
            })

            # Create sub-orders for each seller
            sub_orders = []
            for seller_id, items in seller_groups.items():
                sub_order = self._create_sub_order(order, seller_id, items)
                sub_orders.append(sub_order)

            return sub_orders

    def _create_sub_order(self, parent_order: dict, seller_id: str, items: list):
        with tracer.start_as_current_span("marketplace.create_sub_order") as span:
            sub_order_id = f"{parent_order['id']}-{seller_id}"
            subtotal = sum(item["price"] * item["quantity"] for item in items)

            span.set_attribute("sub_order.id", sub_order_id)
            span.set_attribute("sub_order.seller_id", seller_id)
            span.set_attribute("sub_order.item_count", len(items))
            span.set_attribute("sub_order.subtotal", subtotal)

            # Fetch seller configuration
            seller = self.seller_repo.get(seller_id)
            span.set_attribute("seller.tier", seller["tier"])
            span.set_attribute("seller.fulfillment_type", seller["fulfillment_type"])

            return {
                "sub_order_id": sub_order_id,
                "parent_order_id": parent_order["id"],
                "seller_id": seller_id,
                "seller_tier": seller["tier"],
                "items": items,
                "subtotal": subtotal,
                "fulfillment_type": seller["fulfillment_type"]
            }
```

## Commission Calculation

Commission rates vary by seller tier, product category, and sometimes promotional agreements. This is where disputes happen, so tracing is essential.

```python
class CommissionCalculator:
    def calculate(self, sub_order: dict):
        with tracer.start_as_current_span("marketplace.calculate_commission") as span:
            span.set_attribute("sub_order.id", sub_order["sub_order_id"])
            span.set_attribute("seller.id", sub_order["seller_id"])
            span.set_attribute("seller.tier", sub_order["seller_tier"])

            total_commission = 0.0
            item_commissions = []

            for item in sub_order["items"]:
                with tracer.start_as_current_span("marketplace.commission_item") as item_span:
                    item_span.set_attribute("product.id", item["product_id"])
                    item_span.set_attribute("product.category", item["category"])
                    item_span.set_attribute("product.price", item["price"])
                    item_span.set_attribute("product.quantity", item["quantity"])

                    # Look up the commission rate
                    rate = self._get_commission_rate(
                        seller_tier=sub_order["seller_tier"],
                        category=item["category"],
                        seller_id=sub_order["seller_id"]
                    )
                    item_span.set_attribute("commission.rate", rate)
                    item_span.set_attribute("commission.rate_source", rate["source"])

                    # Calculate the commission amount
                    item_total = item["price"] * item["quantity"]
                    commission_amount = round(item_total * rate["percentage"], 2)

                    item_span.set_attribute("commission.amount", commission_amount)

                    total_commission += commission_amount
                    item_commissions.append({
                        "product_id": item["product_id"],
                        "rate": rate["percentage"],
                        "amount": commission_amount,
                        "source": rate["source"]
                    })

            # Record the total commission
            span.set_attribute("commission.total", total_commission)
            span.set_attribute("commission.effective_rate",
                             round(total_commission / sub_order["subtotal"], 4))

            seller_payout = sub_order["subtotal"] - total_commission
            span.set_attribute("seller.payout", seller_payout)

            commission_calculated.record(total_commission, {
                "seller.tier": sub_order["seller_tier"]
            })

            return {
                "total_commission": total_commission,
                "seller_payout": seller_payout,
                "item_commissions": item_commissions
            }

    def _get_commission_rate(self, seller_tier: str, category: str, seller_id: str):
        """Resolve the commission rate. Priority: seller override > category > tier default."""
        with tracer.start_as_current_span("marketplace.resolve_commission_rate") as span:
            # Check for seller-specific override first
            override = self.rate_repo.get_seller_override(seller_id, category)
            if override:
                span.set_attribute("rate.source", "seller_override")
                return {"percentage": override["rate"], "source": "seller_override"}

            # Check category-specific rate for this tier
            category_rate = self.rate_repo.get_category_rate(seller_tier, category)
            if category_rate:
                span.set_attribute("rate.source", "category_tier")
                return {"percentage": category_rate["rate"], "source": "category_tier"}

            # Fall back to tier default
            default_rate = self.rate_repo.get_tier_default(seller_tier)
            span.set_attribute("rate.source", "tier_default")
            return {"percentage": default_rate["rate"], "source": "tier_default"}
```

## Routing to Seller Fulfillment

Different sellers use different fulfillment methods. Some handle their own shipping, some use the marketplace's warehouse (FBM/FBA model), and some use third-party logistics.

```python
class SellerRouter:
    def route_to_seller(self, sub_order: dict, commission_result: dict):
        start = time.time()

        with tracer.start_as_current_span("marketplace.route_to_seller") as span:
            span.set_attribute("sub_order.id", sub_order["sub_order_id"])
            span.set_attribute("seller.id", sub_order["seller_id"])
            span.set_attribute("fulfillment.type", sub_order["fulfillment_type"])

            fulfillment_type = sub_order["fulfillment_type"]

            try:
                if fulfillment_type == "seller_fulfilled":
                    self._route_to_seller_warehouse(sub_order)
                elif fulfillment_type == "marketplace_fulfilled":
                    self._route_to_marketplace_warehouse(sub_order)
                elif fulfillment_type == "dropship":
                    self._route_to_dropship_provider(sub_order)
                else:
                    span.set_status(StatusCode.ERROR,
                                   f"Unknown fulfillment type: {fulfillment_type}")
                    raise ValueError(f"Unknown fulfillment type: {fulfillment_type}")

                latency = (time.time() - start) * 1000
                routing_latency.record(latency, {
                    "fulfillment.type": fulfillment_type,
                    "routing.status": "success"
                })

            except Exception as e:
                latency = (time.time() - start) * 1000
                routing_latency.record(latency, {
                    "fulfillment.type": fulfillment_type,
                    "routing.status": "error"
                })
                span.set_status(StatusCode.ERROR, str(e))
                span.record_exception(e)
                raise

    def _route_to_seller_warehouse(self, sub_order: dict):
        with tracer.start_as_current_span("marketplace.route.seller_warehouse") as span:
            seller = self.seller_repo.get(sub_order["seller_id"])
            api_endpoint = seller["fulfillment_api"]
            span.set_attribute("seller.api_endpoint", api_endpoint)

            # Send order to seller's fulfillment API
            response = self.http_client.post(api_endpoint, json={
                "order_id": sub_order["sub_order_id"],
                "items": sub_order["items"],
                "shipping_address": sub_order.get("shipping_address")
            })

            span.set_attribute("seller.api_status", response.status_code)
            if response.status_code != 200:
                span.set_status(StatusCode.ERROR,
                               f"Seller API returned {response.status_code}")
```

## Payment Settlement Tracing

The final piece is splitting the payment between the marketplace and each seller.

```python
class PaymentSettlement:
    def settle(self, order_id: str, sub_orders_with_commissions: list):
        with tracer.start_as_current_span("marketplace.settle_payment") as span:
            span.set_attribute("order.id", order_id)
            span.set_attribute("settlement.seller_count",
                             len(sub_orders_with_commissions))

            total_marketplace_take = 0
            for entry in sub_orders_with_commissions:
                with tracer.start_as_current_span("marketplace.settle_seller") as s:
                    s.set_attribute("seller.id", entry["seller_id"])
                    s.set_attribute("settlement.payout", entry["seller_payout"])
                    s.set_attribute("settlement.commission", entry["commission"])

                    self.ledger.credit_seller(entry["seller_id"], entry["seller_payout"])
                    total_marketplace_take += entry["commission"]

            span.set_attribute("settlement.marketplace_total", total_marketplace_take)
```

When a seller disputes a commission amount, you can pull up the trace for that specific sub-order and see exactly which rate was applied, where it came from (override, category, or default), and the exact calculation. This turns commission disputes from hours of manual investigation into a 30-second trace lookup.
