# How to Implement Asynchronous Messaging with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Asynchronous Messaging, Pub/Sub, Pattern, Fire-and-Forget, Message Queue

Description: Implement asynchronous messaging patterns with Dapr pub/sub including fire-and-forget, competing consumers, and outbox patterns for reliable delivery.

---

## Overview

Asynchronous messaging decouples services by allowing producers to publish events without waiting for consumer responses. Dapr's pub/sub building block supports multiple async messaging patterns that solve different coordination challenges in distributed microservices. This guide covers the most important patterns with practical implementations.

## Pattern 1: Fire-and-Forget

Publish an event and continue without waiting for processing:

```python
import dapr.clients as dapr
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/orders', methods=['POST'])
def create_order():
    order_data = request.json
    order_id = generate_order_id()

    # Save order state synchronously
    with dapr.DaprClient() as client:
        client.save_state(
            "statestore",
            f"order:{order_id}",
            json.dumps({"status": "created", **order_data})
        )

        # Fire-and-forget: publish event, don't wait for handlers
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="OrderCreated",
            data=json.dumps({"orderId": order_id, **order_data})
        )

    # Return immediately - handlers run asynchronously
    return jsonify({"orderId": order_id, "status": "created"}), 202

def generate_order_id():
    import uuid
    return str(uuid.uuid4())[:8]

app.run(port=8080)
```

## Pattern 2: Competing Consumers

Multiple instances of the same service consume from the same topic for parallel processing:

```yaml
# Dapr automatically handles competing consumers via consumer groups
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "order-processor-group"
  # All instances of order-processor share this consumer group
  # Kafka distributes partitions across them automatically
```

Scale consumers to match processing demand:

```bash
# Scale order processor instances (Kafka distributes partitions)
kubectl scale deployment order-processor --replicas=6
```

## Pattern 3: Outbox Pattern for Reliable Publishing

Guarantee event delivery even if the service crashes after saving state but before publishing:

```python
import dapr.clients as dapr
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType
import json
import threading
import time

class OutboxPublisher:
    def __init__(self):
        self.store_name = "statestore"
        self.pubsub_name = "orders-pubsub"

    def save_with_outbox(self, state_key: str, state_value: dict,
                         event_topic: str, event_data: dict):
        """Atomically save state and queue event in outbox"""
        with dapr.DaprClient() as client:
            outbox_id = f"outbox:{state_key}:{int(time.time())}"

            operations = [
                # Save business state
                TransactionalStateOperation(
                    key=state_key,
                    data=json.dumps(state_value),
                    operation_type=TransactionOperationType.upsert,
                ),
                # Save outbox entry
                TransactionalStateOperation(
                    key=outbox_id,
                    data=json.dumps({
                        "topic": event_topic,
                        "data": event_data,
                        "createdAt": time.time()
                    }),
                    operation_type=TransactionOperationType.upsert,
                )
            ]

            client.execute_state_transaction(self.store_name, operations)

    def process_outbox(self):
        """Background processor publishes outbox entries"""
        with dapr.DaprClient() as client:
            # In production, query outbox entries from database
            # This is simplified for illustration
            pass

def start_outbox_processor():
    publisher = OutboxPublisher()
    while True:
        publisher.process_outbox()
        time.sleep(1)
```

## Pattern 4: Message Deduplication (Exactly-Once Semantics)

Achieve effective exactly-once processing with idempotency:

```python
import dapr.clients as dapr
import json

def process_payment_exactly_once(event_data: dict):
    """Idempotent payment processing"""
    event_id = event_data.get("id")  # CloudEvents ID
    order_id = event_data.get("data", {}).get("orderId")

    with dapr.DaprClient() as client:
        # Atomic check-and-set using ETag
        idempotency_key = f"payment-processed:{event_id}"
        existing = client.get_state("statestore", idempotency_key)

        if existing.data:
            print(f"Payment for event {event_id} already processed")
            return

        # Process payment
        payment_result = charge_payment(order_id, event_data["data"]["amount"])

        # Mark as processed with original ETag (first-write wins)
        client.save_state(
            "statestore",
            idempotency_key,
            json.dumps(payment_result),
            etag=existing.etag,
            state_metadata={"ttlInSeconds": "86400"}
        )

def charge_payment(order_id: str, amount: float) -> dict:
    print(f"Charging ${amount} for order {order_id}")
    return {"orderId": order_id, "status": "charged", "amount": amount}
```

## Pattern 5: Message Routing

Route messages to different handlers based on content:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-event-routing
spec:
  pubsubname: orders-pubsub
  topic: OrderEvents
  routes:
    rules:
    - match: 'event.data.priority == "high"'
      path: /orders/priority-processing
    - match: 'event.data.region == "eu"'
      path: /orders/eu-processing
    default: /orders/standard-processing
  scopes:
  - order-processor
```

## Pattern 6: Claim Check for Large Messages

Store large payloads in blob storage and pass a reference:

```python
def publish_large_order_event(order_with_attachments: dict):
    with dapr.DaprClient() as client:
        # Store large payload via binding
        attachment_key = f"attachments/order/{order_with_attachments['orderId']}"
        client.invoke_binding(
            "blob-storage",
            "create",
            data=json.dumps(order_with_attachments["attachments"]),
            binding_metadata={"key": attachment_key}
        )

        # Publish lightweight event with reference
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="OrderPlaced",
            data=json.dumps({
                "orderId": order_with_attachments["orderId"],
                "attachmentRef": attachment_key  # Claim check reference
            })
        )
```

## Summary

Dapr pub/sub supports a rich set of asynchronous messaging patterns that address different reliability and scaling requirements. The outbox pattern guarantees event delivery despite service crashes, while idempotent handlers with first-write-wins ETag semantics provide effective exactly-once processing. Message routing rules reduce coupling between producers and consumers by allowing content-based dispatch without separate topics per message type.
