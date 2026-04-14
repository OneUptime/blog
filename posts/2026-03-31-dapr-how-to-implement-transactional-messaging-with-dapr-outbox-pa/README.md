# How to Implement Transactional Messaging with Dapr Outbox Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Outbox Pattern, Transactional Messaging, Pub/Sub, State Store, Microservice

Description: Learn how to implement the transactional outbox pattern with Dapr to ensure atomic state changes and message publishing without a two-phase commit.

---

The transactional outbox pattern solves one of the hardest problems in distributed systems: ensuring that a database update and a message publication are either both applied or both abandoned. Without it, a service can save state and crash before sending the event, or send an event before successfully saving state. Dapr provides a built-in outbox feature that uses its state store and pub/sub components to solve this atomically.

## The Problem the Outbox Pattern Solves

Consider an order service that saves an order to state and publishes an `OrderCreated` event. Without the outbox pattern:

```text
1. Save order to state store  (success)
2. Publish OrderCreated event  (CRASH)
   -> Event never sent, downstream services never notified
```

Or in reverse:

```text
1. Publish OrderCreated event  (success)
2. Save order to state store   (CRASH)
   -> Event sent but order does not exist
```

The outbox pattern writes both the state and the pending event within one atomic transaction, then a relay process publishes the event after the transaction commits.

## Enabling Dapr's Built-In Outbox Feature

Dapr 1.12+ supports a native outbox pattern. Enable it on the state store component.

```yaml
# dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    value: "host=localhost user=postgres password=secret dbname=orders port=5432"
  - name: outboxPublishPubsub
    value: "order-pubsub"
  - name: outboxPublishTopic
    value: "orders-events"
  - name: outboxDiscardWhenMissingState
    value: "false"
```

Configure the pub/sub component:

```yaml
# dapr/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
```

## Writing Transactions with the Outbox

When you use Dapr's transactional state API with outbox enabled, Dapr automatically publishes a message to the configured pub/sub topic for each state operation in the transaction. You do not need to create separate outbox records — just save your state normally and Dapr handles the rest. You can optionally customize the CloudEvent envelope using `cloudevent.*` metadata on individual operations.

```python
import requests
import json
import uuid
from datetime import datetime

DAPR_HTTP_PORT = 3500
STATE_STORE = "order-statestore"

def create_order_with_outbox(order: dict) -> str:
    """
    Save an order to state and atomically schedule an OrderCreated event.
    Dapr's outbox will publish the event after the transaction commits.
    """
    order_id = order.get("orderId", str(uuid.uuid4()))

    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{STATE_STORE}/transaction"

    transaction_body = {
        "operations": [
            {
                "operation": "upsert",
                "request": {
                    "key": f"order:{order_id}",
                    "value": {
                        "orderId": order_id,
                        "customerId": order.get("customerId"),
                        "amount": order.get("amount"),
                        "status": "created",
                        "createdAt": datetime.utcnow().isoformat() + "Z"
                    },
                    "metadata": {
                        "cloudevent.type": "OrderCreated",
                        "cloudevent.source": "order-service"
                    }
                }
            }
        ]
    }

    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(transaction_body)
    )
    response.raise_for_status()
    print(f"Transaction committed for order {order_id}")
    return order_id

# Test it
order = {
    "orderId": "ORD-2026-001",
    "customerId": "CUST-42",
    "amount": 299.99
}
order_id = create_order_with_outbox(order)
print(f"Created order: {order_id}")
```

## Consuming Outbox Events Downstream

Subscribers receive events from the Dapr pub/sub topic that Dapr publishes outbox messages to.

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "order-pubsub",
            "topic": "orders-events",
            "route": "/events/orders"
        }
    ])

@app.route('/events/orders', methods=['POST'])
def handle_order_event():
    envelope = request.json
    event_data = envelope.get("data", {})
    event_type = envelope.get("type", "")

    print(f"Received event: {event_type}")

    if event_type == "OrderCreated":
        handle_order_created(event_data)
    elif event_type == "OrderCancelled":
        handle_order_cancelled(event_data)

    return jsonify({"status": "SUCCESS"}), 200

def handle_order_created(event: dict):
    order_id = event.get("orderId")
    customer_id = event.get("customerId")
    amount = event.get("amount", 0)
    print(f"Order created downstream - ID: {order_id}, Customer: {customer_id}, Amount: ${amount:.2f}")
    # Trigger fulfillment, send confirmation email, update analytics, etc.

def handle_order_cancelled(event: dict):
    order_id = event.get("orderId")
    print(f"Order cancelled downstream - ID: {order_id}")
    # Trigger refund, update inventory, etc.

if __name__ == "__main__":
    app.run(port=5001)
```

Run the subscriber:

```bash
dapr run --app-id order-subscriber --app-port 5001 -- python subscriber.py
```

## Implementing a Manual Outbox Relay

For state stores that do not support Dapr's native outbox, implement a manual relay that polls for pending events.

```python
import time
import requests
import json

DAPR_HTTP_PORT = 3500
STATE_STORE = "order-statestore"
PUBSUB = "order-pubsub"

def get_pending_outbox_events(limit: int = 100) -> list:
    """Query the state store for pending outbox records."""
    # Use Dapr state query API (requires state store that supports queries)
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/state/{STATE_STORE}/query"
    query = {
        "filter": {
            "EQ": {"status": "pending"}
        },
        "sort": [{"key": "timestamp", "order": "ASC"}],
        "page": {"limit": limit}
    }
    response = requests.post(url, json=query)
    if response.status_code == 200:
        return response.json().get("results", [])
    return []

def publish_outbox_event(event: dict) -> bool:
    """Publish a single outbox event to the pub/sub broker."""
    topic = event.get("publishTopic", "orders-events")
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/{PUBSUB}/{topic}"
    response = requests.post(url, json=event.get("payload", {}))
    return response.status_code == 204

def mark_outbox_event_published(event_key: str):
    """Remove the outbox record after successful publish."""
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{STATE_STORE}"
    body = [{"operation": "delete", "request": {"key": event_key}}]
    requests.post(url + "/transaction", json={"operations": body})

def outbox_relay_loop():
    """Continuously poll and publish pending outbox events."""
    print("Outbox relay started")
    while True:
        try:
            events = get_pending_outbox_events(limit=50)
            for record in events:
                key = record.get("key")
                event = record.get("data", {})

                if publish_outbox_event(event):
                    mark_outbox_event_published(key)
                    print(f"Published and cleared outbox event: {key}")
                else:
                    print(f"Failed to publish outbox event: {key}")

        except Exception as e:
            print(f"Relay error: {e}")

        time.sleep(0.1)  # Poll every 100ms

if __name__ == "__main__":
    outbox_relay_loop()
```

## Summary

The Dapr outbox pattern eliminates the dual-write problem in distributed microservices by atomically persisting state changes and publishing events in a single transaction. You learned how to enable Dapr's native outbox feature using state store metadata, write transactional state operations that Dapr automatically publishes as events, build downstream subscribers that consume reliably delivered events, and implement a manual outbox relay for scenarios where the native feature is unavailable. This approach ensures your microservices publish exactly the events that correspond to committed state changes, making your system data-consistent and resilient to failures.
