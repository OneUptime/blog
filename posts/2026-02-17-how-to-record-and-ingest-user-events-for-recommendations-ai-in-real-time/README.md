# How to Record and Ingest User Events for Recommendations AI in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations AI, User Events, Real-Time Analytics, Retail API

Description: Learn how to capture and send user interaction events to Google Cloud Recommendations AI in real time to power personalized product recommendations.

---

Recommendations AI learns from what your users do. Every product view, search query, add-to-cart action, and purchase tells the system something about user preferences and product relationships. Without user events, the recommendation models have nothing to learn from. The more events you send, and the better their quality, the more accurate your recommendations become.

This guide covers how to capture, format, and send user events to Recommendations AI in real time from both your backend and frontend.

## Types of User Events

Recommendations AI accepts several event types, each providing different signals:

| Event Type | Description | Signal Value |
|-----------|-------------|--------------|
| detail-page-view | User viewed a product page | Shows interest |
| add-to-cart | User added item to cart | Strong purchase intent |
| purchase-complete | User completed a purchase | Strongest signal |
| search | User performed a search | Shows intent |
| home-page-view | User visited the home page | Session start |
| category-page-view | User browsed a category | Category interest |
| shopping-cart-page-view | User viewed their cart | Purchase consideration |
| remove-from-cart | User removed an item | Negative signal |

Purchase events are the most valuable, but all event types contribute to recommendation quality.

## Setting Up the Client

Install the Retail API client library and configure access.

```bash
# Install the client library
pip install google-cloud-retail
```

```python
from google.cloud import retail_v2
from google.protobuf.timestamp_pb2 import Timestamp
from datetime import datetime

# Initialize the user event service client
user_event_client = retail_v2.UserEventServiceClient()

# Your project's default catalog
DEFAULT_CATALOG = (
    "projects/my-gcp-project/locations/global"
    "/catalogs/default_catalog"
)
```

## Recording a Product View Event

When a user views a product detail page, record it as a detail-page-view event.

```python
def record_product_view(visitor_id, product_id, user_id=None):
    """Record when a user views a product detail page."""
    # Build the user event
    user_event = retail_v2.UserEvent(
        event_type="detail-page-view",
        visitor_id=visitor_id,  # Session or device ID
        product_details=[
            retail_v2.ProductDetail(
                product=retail_v2.Product(id=product_id),
                quantity=1
            )
        ]
    )

    # Set the authenticated user ID if available
    if user_id:
        user_event.user_info = retail_v2.UserInfo(
            user_id=user_id
        )

    # Set the event timestamp
    event_time = Timestamp()
    event_time.FromDatetime(datetime.utcnow())
    user_event.event_time = event_time

    # Send the event
    request = retail_v2.WriteUserEventRequest(
        parent=DEFAULT_CATALOG,
        user_event=user_event
    )

    written_event = user_event_client.write_user_event(request=request)
    print(f"Recorded product view: {product_id} by visitor {visitor_id}")
    return written_event

# Record a product view
record_product_view(
    visitor_id="session-abc123",
    product_id="SKU-12345",
    user_id="user-789"
)
```

## Recording Add-to-Cart Events

Cart actions are strong purchase signals. Capture them when users modify their cart.

```python
def record_add_to_cart(visitor_id, product_id, quantity=1, user_id=None):
    """Record when a user adds a product to their cart."""
    user_event = retail_v2.UserEvent(
        event_type="add-to-cart",
        visitor_id=visitor_id,
        product_details=[
            retail_v2.ProductDetail(
                product=retail_v2.Product(id=product_id),
                quantity=quantity
            )
        ]
    )

    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    event_time = Timestamp()
    event_time.FromDatetime(datetime.utcnow())
    user_event.event_time = event_time

    request = retail_v2.WriteUserEventRequest(
        parent=DEFAULT_CATALOG,
        user_event=user_event
    )

    result = user_event_client.write_user_event(request=request)
    print(f"Recorded add-to-cart: {product_id} (qty: {quantity})")
    return result
```

## Recording Purchase Events

Purchase events are the most valuable signal. Include all items in the order.

```python
def record_purchase(visitor_id, order_items, user_id=None, order_id=None):
    """Record a completed purchase with all line items."""
    # Build product details for each item in the order
    product_details = []
    for item in order_items:
        product_details.append(
            retail_v2.ProductDetail(
                product=retail_v2.Product(id=item["product_id"]),
                quantity=item.get("quantity", 1)
            )
        )

    user_event = retail_v2.UserEvent(
        event_type="purchase-complete",
        visitor_id=visitor_id,
        product_details=product_details
    )

    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    # Include the purchase transaction details
    if order_id:
        user_event.purchase_transaction = retail_v2.PurchaseTransaction(
            id=order_id,
            revenue=sum(
                item.get("price", 0) * item.get("quantity", 1)
                for item in order_items
            ),
            currency_code="USD"
        )

    event_time = Timestamp()
    event_time.FromDatetime(datetime.utcnow())
    user_event.event_time = event_time

    request = retail_v2.WriteUserEventRequest(
        parent=DEFAULT_CATALOG,
        user_event=user_event
    )

    result = user_event_client.write_user_event(request=request)
    print(f"Recorded purchase: {len(order_items)} items, order {order_id}")
    return result

# Record a purchase with multiple items
record_purchase(
    visitor_id="session-abc123",
    user_id="user-789",
    order_id="ORD-2026-001",
    order_items=[
        {"product_id": "SKU-12345", "quantity": 1, "price": 79.99},
        {"product_id": "SKU-67890", "quantity": 2, "price": 24.99}
    ]
)
```

## Recording Search Events

Search queries reveal user intent and help improve search-based recommendations.

```python
def record_search(visitor_id, search_query, product_ids_shown,
                   user_id=None):
    """Record a search event with the query and results shown."""
    # Include the products that appeared in search results
    product_details = [
        retail_v2.ProductDetail(
            product=retail_v2.Product(id=pid),
            quantity=1
        )
        for pid in product_ids_shown[:20]  # Limit to top 20 results
    ]

    user_event = retail_v2.UserEvent(
        event_type="search",
        visitor_id=visitor_id,
        search_query=search_query,
        product_details=product_details
    )

    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    event_time = Timestamp()
    event_time.FromDatetime(datetime.utcnow())
    user_event.event_time = event_time

    request = retail_v2.WriteUserEventRequest(
        parent=DEFAULT_CATALOG,
        user_event=user_event
    )

    result = user_event_client.write_user_event(request=request)
    print(f"Recorded search: '{search_query}' ({len(product_ids_shown)} results)")
    return result
```

## Frontend Integration with JavaScript

For client-side event collection, use the Retail API's JavaScript pixel or send events through your backend.

```python
# Backend API endpoint that receives events from your frontend
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/api/track-event", methods=["POST"])
def track_event():
    """Receive user events from the frontend and forward to Recommendations AI."""
    data = request.get_json()

    event_type = data.get("event_type")
    visitor_id = data.get("visitor_id")
    product_id = data.get("product_id")
    user_id = data.get("user_id")

    # Map frontend events to Retail API events
    event_handlers = {
        "product_view": record_product_view,
        "add_to_cart": record_add_to_cart,
    }

    handler = event_handlers.get(event_type)
    if handler:
        handler(visitor_id, product_id, user_id=user_id)
        return jsonify({"status": "recorded"})

    return jsonify({"error": "Unknown event type"}), 400
```

## Bulk Importing Historical Events

If you have historical event data, import it in bulk to give the model a head start.

```python
from google.cloud import retail_v2

def import_historical_events(project_id, gcs_uri):
    """Import historical user events from a JSONL file in Cloud Storage."""
    client = retail_v2.UserEventServiceClient()

    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
    )

    input_config = retail_v2.UserEventInputConfig(
        gcs_source=retail_v2.GcsSource(
            input_uris=[gcs_uri],
            data_schema="user_event"
        )
    )

    request = retail_v2.ImportUserEventsRequest(
        parent=parent,
        input_config=input_config
    )

    operation = client.import_user_events(request=request)
    print("Importing historical events...")

    result = operation.result(timeout=600)
    print(f"Import complete!")
    print(f"Joined events: {result.import_summary.joined_events_count}")
    print(f"Unjoined events: {result.import_summary.unjoined_events_count}")

    return result

import_historical_events(
    "my-gcp-project",
    "gs://my-bucket/events/historical_events.jsonl"
)
```

## Event Data Quality Tips

The quality of your events directly impacts recommendation quality:

- **Always include visitor_id**: Use a consistent session or device identifier so the system can track user journeys
- **Include user_id when available**: Authenticated user IDs help connect behavior across sessions and devices
- **Send events in real time**: Do not batch events for hours; the system works best with fresh data
- **Include all product interactions**: Do not just track purchases. Views and cart actions provide context
- **Validate product IDs**: Events with product IDs that do not match your catalog are marked as "unjoined" and are less useful
- **Set accurate timestamps**: If importing historical data, use the actual event timestamps, not the import time

## Wrapping Up

User events are the fuel for Recommendations AI. Without them, the system has no signals to learn from. Instrument your application to capture product views, cart actions, purchases, and searches as they happen. Use the real-time write API for live events and the bulk import API for historical data. Pay attention to event quality - consistent visitor IDs, valid product IDs, and accurate timestamps make the difference between mediocre and excellent recommendations. Once you have a steady stream of quality events flowing in, the recommendation models will start delivering increasingly personalized results.
