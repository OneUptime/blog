# How to Instrument Product Availability and Back-in-Stock Notification Systems with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Inventory, Back-in-Stock, Notifications

Description: Instrument product availability checking and back-in-stock notification workflows with OpenTelemetry for reliable inventory visibility.

Out-of-stock products are revenue you are leaving on the table. But the back-in-stock notification system that recovers that revenue is surprisingly complex. You need to track inventory levels in real time, manage subscriber lists, trigger notifications at the right moment, and handle the thundering herd problem when a popular item comes back. OpenTelemetry helps you make sure this entire pipeline works reliably.

## The Availability Pipeline

The system has two sides: the real-time inventory check that tells users whether something is in stock, and the notification pipeline that alerts subscribers when stock is replenished.

## Instrumenting Real-Time Availability Checks

Every product page and listing page queries inventory. These checks must be fast and accurate.

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("inventory.availability")
meter = metrics.get_meter("inventory.availability")

availability_check_latency = meter.create_histogram(
    "inventory.check.latency",
    unit="ms",
    description="Time to check product availability"
)

availability_cache_hits = meter.create_counter(
    "inventory.check.cache",
    description="Availability check cache hits and misses"
)

stock_level_gauge = meter.create_observable_gauge(
    "inventory.stock_level",
    description="Current stock level by product category"
)

class AvailabilityService:
    def check_availability(self, product_id: str, quantity: int = 1):
        with tracer.start_as_current_span("inventory.check_availability") as span:
            start = time.time()
            span.set_attribute("product.id", product_id)
            span.set_attribute("inventory.requested_quantity", quantity)

            # Try the fast path: in-memory cache
            cached = self.cache.get(f"stock:{product_id}")
            if cached is not None:
                availability_cache_hits.add(1, {"cache.result": "hit"})
                span.set_attribute("inventory.source", "cache")
                span.set_attribute("inventory.stock_level", cached)

                available = cached >= quantity
                span.set_attribute("inventory.available", available)

                latency = (time.time() - start) * 1000
                availability_check_latency.record(latency, {
                    "inventory.source": "cache"
                })
                return {"available": available, "stock": cached}

            # Cache miss: query the database
            availability_cache_hits.add(1, {"cache.result": "miss"})
            stock = self._query_stock_db(product_id)

            span.set_attribute("inventory.source", "database")
            span.set_attribute("inventory.stock_level", stock)

            available = stock >= quantity
            span.set_attribute("inventory.available", available)

            # Update cache
            self.cache.set(f"stock:{product_id}", stock, ttl=30)

            latency = (time.time() - start) * 1000
            availability_check_latency.record(latency, {
                "inventory.source": "database"
            })

            return {"available": available, "stock": stock}

    def _query_stock_db(self, product_id: str):
        with tracer.start_as_current_span("inventory.db_query") as span:
            span.set_attribute("db.system", "postgresql")
            span.set_attribute("db.operation", "SELECT")

            result = self.db.execute(
                "SELECT available_quantity FROM inventory WHERE product_id = %s",
                (product_id,)
            )
            return result[0]["available_quantity"] if result else 0
```

## Back-in-Stock Subscription Management

When a product is out of stock, users can subscribe for notifications. Track these subscriptions to understand demand.

```python
class BackInStockService:
    def subscribe(self, user_id: str, product_id: str, channel: str = "email"):
        with tracer.start_as_current_span("back_in_stock.subscribe") as span:
            span.set_attribute("user.id", user_id)
            span.set_attribute("product.id", product_id)
            span.set_attribute("notification.channel", channel)

            # Check if already subscribed
            existing = self.sub_repo.get(user_id, product_id)
            if existing:
                span.set_attribute("subscription.duplicate", True)
                return {"status": "already_subscribed"}

            # Get product info for context
            product = self.catalog.get_product(product_id)
            span.set_attribute("product.category", product["category"])
            span.set_attribute("product.price", product["price"])

            # Count total subscribers for this product
            subscriber_count = self.sub_repo.count_for_product(product_id)
            span.set_attribute("subscription.total_subscribers", subscriber_count)

            self.sub_repo.create(
                user_id=user_id,
                product_id=product_id,
                channel=channel,
                subscribed_at=time.time()
            )

            subscription_counter.add(1, {
                "product.category": product["category"],
                "notification.channel": channel
            })

            return {"status": "subscribed"}

subscription_counter = meter.create_counter(
    "back_in_stock.subscriptions",
    description="New back-in-stock subscriptions"
)
```

## The Notification Pipeline

When inventory is restocked, the notification pipeline kicks in. This is the critical path where timing matters and errors mean lost sales.

```python
notification_sent = meter.create_counter(
    "back_in_stock.notifications.sent",
    description="Back-in-stock notifications sent"
)

notification_latency = meter.create_histogram(
    "back_in_stock.notification.latency",
    unit="ms",
    description="Time to send back-in-stock notification after restock"
)

notification_errors = meter.create_counter(
    "back_in_stock.notifications.errors",
    description="Failed notification attempts"
)

class RestockEventHandler:
    def on_restock(self, product_id: str, new_quantity: int):
        with tracer.start_as_current_span("back_in_stock.process_restock") as span:
            span.set_attribute("product.id", product_id)
            span.set_attribute("inventory.new_quantity", new_quantity)

            # Get all subscribers waiting for this product
            subscribers = self.sub_repo.get_subscribers(product_id)
            span.set_attribute("notification.subscriber_count", len(subscribers))

            if not subscribers:
                span.set_attribute("notification.skipped", True)
                return

            # Batch notifications to avoid overwhelming email/push services
            batch_size = 100
            batches = [subscribers[i:i+batch_size]
                      for i in range(0, len(subscribers), batch_size)]
            span.set_attribute("notification.batch_count", len(batches))

            sent_count = 0
            error_count = 0

            for batch_idx, batch in enumerate(batches):
                with tracer.start_as_current_span("back_in_stock.send_batch") as batch_span:
                    batch_span.set_attribute("batch.index", batch_idx)
                    batch_span.set_attribute("batch.size", len(batch))

                    for subscriber in batch:
                        try:
                            start = time.time()
                            self._send_notification(subscriber, product_id)
                            latency = (time.time() - start) * 1000

                            notification_latency.record(latency, {
                                "notification.channel": subscriber["channel"]
                            })
                            notification_sent.add(1, {
                                "notification.channel": subscriber["channel"]
                            })
                            sent_count += 1

                        except Exception as e:
                            notification_errors.add(1, {
                                "notification.channel": subscriber["channel"],
                                "error.type": type(e).__name__
                            })
                            error_count += 1

                    # Small delay between batches to prevent thundering herd
                    time.sleep(0.5)

            span.set_attribute("notification.sent_count", sent_count)
            span.set_attribute("notification.error_count", error_count)

            # Clean up subscriptions for notified users
            self.sub_repo.remove_notified(product_id)

    def _send_notification(self, subscriber: dict, product_id: str):
        with tracer.start_as_current_span("back_in_stock.send_single") as span:
            span.set_attribute("user.id", subscriber["user_id"])
            span.set_attribute("notification.channel", subscriber["channel"])

            # Calculate how long the user waited
            wait_hours = (time.time() - subscriber["subscribed_at"]) / 3600
            span.set_attribute("notification.wait_hours", round(wait_hours, 1))

            if subscriber["channel"] == "email":
                self.email_service.send_back_in_stock(
                    subscriber["email"], product_id
                )
            elif subscriber["channel"] == "push":
                self.push_service.send(
                    subscriber["device_token"],
                    title="Back in Stock!",
                    product_id=product_id
                )
```

## Key Alerts

Configure these alerts to catch problems before they cost you sales:

- **Availability check p99 above 50ms**: This runs on every product page load, so it must be fast.
- **Notification error rate above 5%**: Subscribers who do not get notified are revenue you will not recover.
- **Time from restock to first notification sent above 5 minutes**: Speed matters here because popular items can sell out again quickly.
- **Cache hit rate below 90%**: The availability cache should absorb most reads. A low hit rate means either the TTL is too short or the cache is being evicted.

With this instrumentation, you can trace the full lifecycle from a product going out of stock, through users subscribing, to the restock event triggering notifications that bring customers back to purchase.
