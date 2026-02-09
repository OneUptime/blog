# How to Trace Inventory Reservation and Stock Level Updates Across Warehouse Microservices with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Inventory Management, Microservices

Description: Trace inventory reservations and stock updates across distributed warehouse services with OpenTelemetry spans.

Inventory management in e-commerce is a distributed systems problem. You have warehouse services, fulfillment centers, point-of-sale systems, and marketplace integrations all reading and writing stock levels. When a customer sees "In Stock" but gets an "Out of Stock" email after ordering, something in this chain failed silently. That is precisely the kind of bug that OpenTelemetry distributed tracing was built to catch.

This post covers how to instrument inventory reservation flows and stock level updates across multiple warehouse microservices so you can trace every unit from shelf to customer.

## The Architecture

A common inventory setup looks like this:

- **Inventory API**: Central service that exposes stock levels
- **Warehouse Service (per location)**: Manages physical stock at each fulfillment center
- **Reservation Service**: Holds stock temporarily during checkout
- **Sync Service**: Reconciles stock between systems (ERP, marketplaces, POS)

Each of these services needs to propagate trace context so you get a single trace spanning the entire reservation flow.

## Instrumenting the Reservation Service

```python
from opentelemetry import trace, metrics
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer("inventory.reservation", "1.0.0")
meter = metrics.get_meter("inventory.reservation", "1.0.0")

# Track reservation outcomes
reservation_counter = meter.create_counter(
    name="inventory.reservations_total",
    description="Total reservation attempts",
    unit="1"
)

reservation_duration = meter.create_histogram(
    name="inventory.reservation.duration_ms",
    description="Time to complete a reservation",
    unit="ms"
)

stock_level_gauge = meter.create_up_down_counter(
    name="inventory.stock_level_change",
    description="Stock level changes (positive=restock, negative=reservation)",
    unit="1"
)
```

## The Reservation Flow

When a customer reaches checkout, the system needs to reserve inventory before charging their card. Here is how to trace that flow.

```python
import time
import httpx

async def reserve_inventory(order_id: str, items: list[dict]):
    """Reserve stock for all items in an order across warehouses."""
    start = time.time()

    with tracer.start_as_current_span("inventory.reserve_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.item_count", len(items))

        reservations = []
        for item in items:
            reservation = await reserve_single_item(order_id, item)
            reservations.append(reservation)

        # Check if all items were reserved successfully
        all_reserved = all(r["status"] == "reserved" for r in reservations)
        span.set_attribute("inventory.all_reserved", all_reserved)

        if not all_reserved:
            # Roll back successful reservations
            with tracer.start_as_current_span("inventory.rollback_partial"):
                for r in reservations:
                    if r["status"] == "reserved":
                        await release_reservation(r["reservation_id"])
            span.set_status(trace.StatusCode.ERROR, "Partial reservation failure")

        duration_ms = (time.time() - start) * 1000
        reservation_duration.record(duration_ms, {"inventory.success": all_reserved})
        return {"status": "reserved" if all_reserved else "failed", "reservations": reservations}


async def reserve_single_item(order_id: str, item: dict):
    """Reserve a single item, routing to the best warehouse."""
    with tracer.start_as_current_span("inventory.reserve_item") as span:
        span.set_attribute("product.id", item["product_id"])
        span.set_attribute("product.quantity", item["quantity"])
        span.set_attribute("product.sku", item["sku"])

        # Find the best warehouse for this item
        with tracer.start_as_current_span("inventory.select_warehouse") as wh_span:
            warehouse = await find_optimal_warehouse(
                item["sku"], item["quantity"], item.get("shipping_zip")
            )
            wh_span.set_attribute("warehouse.id", warehouse["id"])
            wh_span.set_attribute("warehouse.region", warehouse["region"])
            wh_span.set_attribute("warehouse.available_stock", warehouse["stock"])

        # Call the warehouse service to lock the stock
        with tracer.start_as_current_span("inventory.lock_stock") as lock_span:
            # Propagate trace context in the outgoing HTTP request
            headers = {}
            inject(headers)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"http://warehouse-{warehouse['id']}.internal/api/v1/reserve",
                    json={
                        "order_id": order_id,
                        "sku": item["sku"],
                        "quantity": item["quantity"]
                    },
                    headers=headers,
                    timeout=5.0
                )

            lock_span.set_attribute("http.status_code", response.status_code)

            if response.status_code == 200:
                result = response.json()
                reservation_counter.add(1, {"inventory.status": "reserved", "warehouse.id": warehouse["id"]})
                stock_level_gauge.add(-item["quantity"], {"product.sku": item["sku"]})
                return {"status": "reserved", "reservation_id": result["reservation_id"]}
            else:
                reservation_counter.add(1, {"inventory.status": "failed", "warehouse.id": warehouse["id"]})
                lock_span.set_status(trace.StatusCode.ERROR, f"Warehouse returned {response.status_code}")
                return {"status": "failed", "reason": response.text}
```

## Warehouse-Side Instrumentation

On the warehouse service, extract the trace context from the incoming request to continue the same trace.

```python
from flask import Flask, request
from opentelemetry.propagate import extract

app = Flask(__name__)
warehouse_tracer = trace.get_tracer("warehouse.service", "1.0.0")

@app.route("/api/v1/reserve", methods=["POST"])
def handle_reserve():
    # Extract trace context from the incoming request headers
    ctx = extract(request.headers)

    with warehouse_tracer.start_as_current_span("warehouse.process_reservation", context=ctx) as span:
        data = request.json
        span.set_attribute("warehouse.id", WAREHOUSE_ID)
        span.set_attribute("order.id", data["order_id"])
        span.set_attribute("product.sku", data["sku"])

        # Check physical stock in this warehouse
        with warehouse_tracer.start_as_current_span("warehouse.check_shelf_stock"):
            available = stock_db.get_available(data["sku"])
            span.set_attribute("warehouse.available_before", available)

        if available < data["quantity"]:
            span.set_status(trace.StatusCode.ERROR, "Insufficient stock")
            return {"error": "insufficient_stock"}, 409

        # Lock the stock with a row-level lock in the database
        with warehouse_tracer.start_as_current_span("warehouse.db_lock") as db_span:
            reservation_id = stock_db.create_reservation(
                order_id=data["order_id"],
                sku=data["sku"],
                quantity=data["quantity"],
                ttl_minutes=30  # auto-release after 30 min
            )
            db_span.set_attribute("warehouse.reservation_id", reservation_id)

        span.set_attribute("warehouse.available_after", available - data["quantity"])
        return {"reservation_id": reservation_id}, 200
```

## Handling Reservation Expiry

Reservations that are not converted to orders need to be released. Trace this cleanup process too.

```python
def cleanup_expired_reservations():
    """Scheduled job that runs every 5 minutes."""
    with warehouse_tracer.start_as_current_span("warehouse.cleanup_expired") as span:
        expired = stock_db.find_expired_reservations()
        span.set_attribute("warehouse.expired_count", len(expired))

        released_quantity = 0
        for res in expired:
            with warehouse_tracer.start_as_current_span("warehouse.release_expired") as rel_span:
                rel_span.set_attribute("warehouse.reservation_id", res["id"])
                rel_span.set_attribute("product.sku", res["sku"])
                rel_span.set_attribute("warehouse.held_minutes",
                    (time.time() - res["created_at"].timestamp()) / 60)
                stock_db.release_reservation(res["id"])
                released_quantity += res["quantity"]

        span.set_attribute("warehouse.total_released_units", released_quantity)
```

## What to Watch For

Build alerts around these signals:

- **Reservation failure rate above 2%**: Indicates stock data is drifting from reality
- **Cross-warehouse routing frequency**: If the nearest warehouse is frequently out of stock, your demand forecasting or rebalancing needs attention
- **Reservation-to-order conversion rate**: A low rate means checkout is failing after inventory is locked, wasting capacity
- **Cleanup job releasing large quantities**: Suggests checkout timeouts or payment failures are happening at scale

Distributed tracing across warehouse services turns inventory problems from "we oversold somehow" into "warehouse-3 had a 200ms database lock contention at 14:32 that caused 47 reservation timeouts." That specificity is what lets you fix things quickly.
