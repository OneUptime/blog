# How to Instrument Wishlist and Save-for-Later Features with OpenTelemetry User Journey Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Wishlist, User Journey, E-Commerce Analytics

Description: Instrument wishlist and save-for-later features with OpenTelemetry to track user journeys from interest to purchase conversion.

Wishlists and save-for-later buttons seem like simple CRUD features, but they are actually a goldmine of intent signals. A user adding an item to their wishlist is saying "I want this but not right now." Understanding the journey from wishlist addition to eventual purchase (or abandonment) tells you a lot about pricing sensitivity, inventory timing, and conversion patterns. OpenTelemetry helps you trace these journeys across sessions and time.

## The User Journey Model

Unlike a typical request-response trace, wishlist journeys span days or weeks. A user might:

1. Browse a product and add it to their wishlist
2. Return three days later and check the wishlist
3. Notice a price drop and move the item to their cart
4. Complete the purchase

Each of these interactions happens in a separate session with its own trace. We need to tie them together using a consistent user journey identifier.

## Setting Up Journey Tracking

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import Link, SpanContext, TraceFlags
import uuid
import json

tracer = trace.get_tracer("wishlist.service")
meter = metrics.get_meter("wishlist.service")

# Metrics for wishlist behavior
wishlist_adds = meter.create_counter(
    "wishlist.items.added",
    description="Items added to wishlists"
)

wishlist_to_cart = meter.create_counter(
    "wishlist.items.moved_to_cart",
    description="Items moved from wishlist to cart"
)

wishlist_conversions = meter.create_counter(
    "wishlist.conversions",
    description="Wishlist items that were eventually purchased"
)

wishlist_item_age = meter.create_histogram(
    "wishlist.item.age_at_action",
    unit="hours",
    description="How long an item sat in the wishlist before an action"
)
```

## Instrumenting Wishlist Operations

Each wishlist operation records both trace data and metrics, with attributes that allow you to analyze conversion patterns.

```python
class WishlistService:
    def add_item(self, user_id: str, product_id: str, source_page: str):
        with tracer.start_as_current_span("wishlist.add_item") as span:
            # Generate a journey ID that ties this item's lifecycle together
            journey_id = str(uuid.uuid4())

            span.set_attribute("user.id", user_id)
            span.set_attribute("product.id", product_id)
            span.set_attribute("wishlist.journey_id", journey_id)
            span.set_attribute("wishlist.source_page", source_page)

            # Get product details for context
            product = self.catalog.get_product(product_id)
            span.set_attribute("product.price", product["price"])
            span.set_attribute("product.category", product["category"])
            span.set_attribute("product.in_stock", product["in_stock"])

            # Store the trace context for future linking
            span_ctx = span.get_span_context()
            trace_ref = {
                "trace_id": format(span_ctx.trace_id, "032x"),
                "span_id": format(span_ctx.span_id, "016x"),
                "trace_flags": span_ctx.trace_flags
            }

            # Persist the wishlist item with journey metadata
            self.repo.add_item(
                user_id=user_id,
                product_id=product_id,
                journey_id=journey_id,
                added_at=time.time(),
                price_at_add=product["price"],
                trace_context=json.dumps(trace_ref)
            )

            wishlist_adds.add(1, {
                "product.category": product["category"],
                "source_page": source_page,
                "product.in_stock": str(product["in_stock"])
            })

            return journey_id

    def view_wishlist(self, user_id: str):
        with tracer.start_as_current_span("wishlist.view") as span:
            span.set_attribute("user.id", user_id)

            items = self.repo.get_wishlist(user_id)
            span.set_attribute("wishlist.item_count", len(items))

            # Enrich with current pricing for price-drop detection
            enriched = []
            for item in items:
                current_product = self.catalog.get_product(item["product_id"])
                price_change = current_product["price"] - item["price_at_add"]
                item_age_hours = (time.time() - item["added_at"]) / 3600

                enriched.append({
                    **item,
                    "current_price": current_product["price"],
                    "price_change": price_change,
                    "age_hours": item_age_hours,
                    "back_in_stock": current_product["in_stock"] and not item.get("was_in_stock_at_add", True)
                })

            # Record how many items have price drops
            price_drops = sum(1 for i in enriched if i["price_change"] < 0)
            span.set_attribute("wishlist.items_with_price_drop", price_drops)

            return enriched

    def move_to_cart(self, user_id: str, product_id: str):
        with tracer.start_as_current_span("wishlist.move_to_cart") as span:
            span.set_attribute("user.id", user_id)
            span.set_attribute("product.id", product_id)

            item = self.repo.get_item(user_id, product_id)
            if not item:
                span.set_attribute("wishlist.item_found", False)
                return None

            # Link back to the original add-to-wishlist span
            add_ctx = json.loads(item["trace_context"])
            original_span_ctx = SpanContext(
                trace_id=int(add_ctx["trace_id"], 16),
                span_id=int(add_ctx["span_id"], 16),
                is_remote=True,
                trace_flags=TraceFlags(add_ctx["trace_flags"])
            )
            span.add_link(original_span_ctx, {
                "link.type": "wishlist_to_cart"
            })

            # Calculate item age and price change
            age_hours = (time.time() - item["added_at"]) / 3600
            current_price = self.catalog.get_product(product_id)["price"]
            price_change = current_price - item["price_at_add"]

            span.set_attribute("wishlist.item_age_hours", round(age_hours, 1))
            span.set_attribute("wishlist.price_at_add", item["price_at_add"])
            span.set_attribute("wishlist.current_price", current_price)
            span.set_attribute("wishlist.price_change", round(price_change, 2))
            span.set_attribute("wishlist.journey_id", item["journey_id"])

            wishlist_item_age.record(age_hours, {
                "action": "move_to_cart",
                "price_direction": "drop" if price_change < 0 else "increase" if price_change > 0 else "same"
            })

            wishlist_to_cart.add(1, {
                "product.category": item.get("category", "unknown"),
                "price_direction": "drop" if price_change < 0 else "increase" if price_change > 0 else "same"
            })

            # Perform the move
            self.cart_service.add_item(user_id, product_id)
            self.repo.remove_item(user_id, product_id)

            return {"journey_id": item["journey_id"], "age_hours": age_hours}
```

## Tracking Purchase Conversion

When an order is completed, check if any items were originally on the wishlist and record the conversion.

```python
class OrderCompletionHandler:
    def on_order_complete(self, order: dict):
        with tracer.start_as_current_span("order.check_wishlist_conversions") as span:
            user_id = order["user_id"]

            for item in order["items"]:
                # Check if this item had a wishlist journey
                journey = self.wishlist_repo.get_journey(
                    user_id, item["product_id"]
                )
                if journey:
                    total_journey_hours = (time.time() - journey["added_at"]) / 3600

                    span.add_event("wishlist_conversion", {
                        "product.id": item["product_id"],
                        "journey.id": journey["journey_id"],
                        "journey.duration_hours": round(total_journey_hours, 1),
                        "journey.price_at_add": journey["price_at_add"],
                        "journey.purchase_price": item["price"]
                    })

                    wishlist_conversions.add(1, {
                        "product.category": item.get("category", "unknown"),
                        "journey.duration_bucket": self._bucket_duration(total_journey_hours)
                    })

    def _bucket_duration(self, hours: float) -> str:
        if hours < 24:
            return "same_day"
        elif hours < 72:
            return "1_3_days"
        elif hours < 168:
            return "3_7_days"
        elif hours < 720:
            return "1_4_weeks"
        else:
            return "over_1_month"
```

## Insights You Can Extract

Once this data is flowing, you can answer questions like: Do price drops actually drive wishlist conversions? What is the average time from wishlist add to purchase? Which product categories have the highest wishlist-to-purchase conversion rate? Are out-of-stock items that come back in stock converting well?

These insights directly inform pricing strategy, inventory planning, and when to send "price drop" notification emails. The span links connect the dots across sessions, giving you a complete user journey view that session-based analytics tools cannot provide.
