# How to Implement Message Deduplication with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Message Deduplication, Idempotency, Pub/Sub, Microservice

Description: Learn how to implement idempotent message processing with Dapr State Store to prevent duplicate message handling in distributed microservices.

---

In distributed systems, messages can be delivered more than once due to network retries, consumer restarts, or broker failures. Without deduplication, processing the same message twice can lead to data corruption, double charges, or incorrect state. This guide shows how to use Dapr State Store as a deduplication registry to build idempotent message consumers.

## Understanding Message Deduplication

The core idea is to record a unique message ID in the state store before processing, and check for its existence before handling any new message. If the ID already exists, the message is a duplicate and can be safely discarded.

The deduplication pattern involves:
- Assigning a unique ID to each message at publish time
- Storing processed message IDs with a TTL in the state store
- Checking the state store before processing any message
- Using atomic state operations to prevent race conditions

## Setting Up Dapr State Store

Configure a Redis-backed state store for deduplication tracking.

```yaml
# dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: dedup-store
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: actorStateStore
    value: "false"
  - name: keyPrefix
    value: "dedup"
  - name: ttlInSeconds
    value: "86400"
```

## Publishing Messages with Unique IDs

Assign a unique ID to every message at publish time. UUIDs are a reliable choice.

```python
import uuid
import json
import requests
from datetime import datetime

DAPR_HTTP_PORT = 3500
PUBSUB_NAME = "order-pubsub"
TOPIC = "orders"

def publish_message(payload: dict) -> str:
    """Publish a message with a guaranteed unique message ID."""
    message_id = str(uuid.uuid4())

    message = {
        "messageId": message_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": payload
    }

    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/{PUBSUB_NAME}/{TOPIC}"
    response = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "X-Message-Id": message_id
        },
        data=json.dumps(message)
    )
    response.raise_for_status()
    print(f"Published message {message_id}: {payload}")
    return message_id

# Test - publish the same logical order multiple times (simulating retries)
order = {"orderId": "ORD-999", "amount": 250.00, "customerId": "C42"}

msg_id_1 = publish_message(order)
msg_id_2 = publish_message(order)  # Same order, new message ID - not a duplicate
print(f"Published {msg_id_1} and {msg_id_2}")
```

## Implementing the Deduplication Check

Before processing any message, check the state store. If the key exists, the message has been processed before.

```python
import requests
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

DAPR_HTTP_PORT = 3500
STATE_STORE_NAME = "dedup-store"
DEDUP_TTL_SECONDS = 86400  # 24 hours


def is_duplicate(message_id: str) -> bool:
    """Check if this message has already been processed."""
    key = f"processed:{message_id}"
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{STATE_STORE_NAME}/{key}"
    response = requests.get(url)

    if response.status_code == 200 and response.text:
        return True  # Key exists, this is a duplicate
    return False


def mark_as_processed(message_id: str, metadata: dict) -> bool:
    """Record the message ID in the state store with a TTL."""
    key = f"processed:{message_id}"
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{STATE_STORE_NAME}"

    state_entry = {
        "key": key,
        "value": {
            "processedAt": metadata.get("timestamp"),
            "messageId": message_id
        },
        "metadata": {
            "ttlInSeconds": str(DEDUP_TTL_SECONDS)
        },
        "options": {
            "concurrency": "first-write",  # ETag-based optimistic concurrency
            "consistency": "strong"
        }
    }

    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps([state_entry])
    )
    return response.status_code == 204


@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    """Tell Dapr which topics to subscribe to."""
    return jsonify([
        {
            "pubsubname": "order-pubsub",
            "topic": "orders",
            "route": "/orders/handle"
        }
    ])


@app.route('/orders/handle', methods=['POST'])
def handle_order():
    """Handle incoming order messages with deduplication."""
    envelope = request.json
    message = envelope.get("data", {})

    message_id = message.get("messageId")
    if not message_id:
        print("Message missing messageId - rejecting")
        return jsonify({"status": "DROP"}), 200

    # Step 1: Check if already processed
    if is_duplicate(message_id):
        print(f"Duplicate message {message_id} - skipping")
        return jsonify({"status": "SUCCESS"}), 200  # Return success to Dapr

    # Step 2: Atomically mark as processed (first-write wins)
    marked = mark_as_processed(message_id, message)
    if not marked:
        # Another consumer won the race - treat as duplicate
        print(f"Lost race for message {message_id} - skipping")
        return jsonify({"status": "SUCCESS"}), 200

    # Step 3: Process the message (safe to process now)
    order_data = message.get("data", {})
    process_order(order_data, message_id)

    return jsonify({"status": "SUCCESS"}), 200


def process_order(order: dict, message_id: str):
    """Process a verified unique order."""
    order_id = order.get("orderId")
    amount = order.get("amount", 0)
    print(f"Processing unique order {order_id} (msg: {message_id}), amount: ${amount:.2f}")
    # Add real order processing logic here


if __name__ == "__main__":
    app.run(port=5000)
```

Run the consumer:

```bash
dapr run --app-id order-consumer --app-port 5000 -- python consumer.py
```

## Using Transactional State for Atomic Deduplication

For stronger guarantees, use Dapr's transactional state operations to atomically write the deduplication record and the business state in a single transaction.

```python
def process_order_transactional(message_id: str, order: dict) -> bool:
    """
    Atomically write deduplication key and order state in one transaction.
    If either write fails, neither is committed.
    """
    dedup_key = f"processed:{message_id}"
    order_key = f"order:{order['orderId']}"

    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{STATE_STORE_NAME}/transaction"

    transaction_body = {
        "operations": [
            {
                "operation": "upsert",
                "request": {
                    "key": dedup_key,
                    "value": {"processedAt": order.get("timestamp"), "messageId": message_id},
                    "metadata": {"ttlInSeconds": str(DEDUP_TTL_SECONDS)}
                }
            },
            {
                "operation": "upsert",
                "request": {
                    "key": order_key,
                    "value": {
                        "orderId": order.get("orderId"),
                        "amount": order.get("amount"),
                        "status": "processed",
                        "processedBy": "order-consumer"
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

    if response.status_code == 204:
        print(f"Transaction committed for message {message_id}")
        return True

    print(f"Transaction failed for message {message_id}: {response.status_code}")
    return False
```

## Testing Deduplication

Write a test that simulates duplicate message delivery:

```python
import unittest
import requests

class DeduplicationTest(unittest.TestCase):

    def setUp(self):
        self.base_url = "http://localhost:5000"

    def simulate_message(self, message_id: str, order_id: str) -> int:
        """Simulate Dapr delivering a message to our handler."""
        payload = {
            "id": f"dapr-{message_id}",
            "source": "orders-service",
            "topic": "orders",
            "data": {
                "messageId": message_id,
                "timestamp": "2026-03-31T10:00:00Z",
                "data": {
                    "orderId": order_id,
                    "amount": 100.00,
                    "customerId": "C1"
                }
            }
        }
        resp = requests.post(f"{self.base_url}/orders/handle", json=payload)
        return resp.status_code

    def test_first_delivery_succeeds(self):
        status = self.simulate_message("msg-unique-001", "ORD-001")
        self.assertEqual(status, 200)

    def test_duplicate_delivery_is_ignored(self):
        # Send the same message twice
        self.simulate_message("msg-unique-002", "ORD-002")
        status = self.simulate_message("msg-unique-002", "ORD-002")
        # Both should return 200 (SUCCESS) to prevent Dapr retries
        self.assertEqual(status, 200)

if __name__ == "__main__":
    unittest.main()
```

## Summary

Message deduplication with Dapr State Store provides a reliable, scalable mechanism for building idempotent message consumers. You learned how to assign unique IDs at publish time, check for duplicate IDs in the state store before processing, use first-write-wins concurrency options to handle concurrent consumer races, and combine deduplication with transactional state writes for atomic guarantees. Always return HTTP 200 to Dapr even for duplicates to prevent unnecessary redelivery. With a TTL on deduplication keys, your state store stays lean while protecting against duplicates within a meaningful time window.
