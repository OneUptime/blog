# How to Implement Fire-and-Forget with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Messaging, Microservice, Event-Driven

Description: Learn how to implement the fire-and-forget messaging pattern using Dapr Pub/Sub so publishers send events without waiting for subscriber acknowledgment.

---

The fire-and-forget pattern is one of the most common messaging patterns in distributed systems. A publisher sends a message and immediately continues processing without waiting for acknowledgment or a response. Dapr Pub/Sub makes this pattern straightforward to implement across any message broker.

## Setting Up the Pub/Sub Component

First, define a Dapr Pub/Sub component using Redis Streams as the broker:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

## Publishing a Fire-and-Forget Event

The publisher sends a message to a topic and does not block waiting for subscribers to process it. Here is an example using Python:

```python
import requests

DAPR_HOST = "http://localhost"
DAPR_HTTP_PORT = 3500
PUBSUB_NAME = "pubsub"
TOPIC_NAME = "orders"

def publish_order(order_id: str, amount: float):
    url = f"{DAPR_HOST}:{DAPR_HTTP_PORT}/v1.0/publish/{PUBSUB_NAME}/{TOPIC_NAME}"
    payload = {
        "orderId": order_id,
        "amount": amount,
        "timestamp": "2026-03-31T10:00:00Z"
    }
    # Fire and forget - we do not wait for subscriber processing
    response = requests.post(url, json=payload, timeout=5)
    response.raise_for_status()
    print(f"Event published for order {order_id}, continuing...")

publish_order("ORD-001", 149.99)
# Execution continues immediately after publish
```

## Subscribing to the Topic

The subscriber receives and processes the message independently:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [
        {
            'pubsubname': 'pubsub',
            'topic': 'orders',
            'routes': {
                'default': '/orders'
            }
        }
    ]
    return jsonify(subscriptions)

@app.route('/orders', methods=['POST'])
def process_order():
    event = request.json
    data = event.get('data', {})
    order_id = data.get('orderId')
    amount = data.get('amount')
    print(f"Processing order {order_id} for ${amount}")
    # Process the order asynchronously
    return jsonify({"status": "SUCCESS"})

if __name__ == '__main__':
    app.run(port=5001)
```

## Configuring Dead-Letter Topics

With fire-and-forget, failed message handling is critical. Configure a dead-letter topic to capture unprocessable messages:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
  deadLetterTopic: orders-dead-letter
```

## Running the Application

Deploy both services and verify the publisher fires without blocking:

```bash
# Start the subscriber
dapr run --app-id order-processor --app-port 5001 -- python subscriber.py

# Start the publisher
dapr run --app-id order-publisher -- python publisher.py

# Verify messages are flowing
dapr publish --publish-app-id order-publisher --pubsub pubsub --topic orders --data '{"orderId":"ORD-002","amount":75.00}'
```

## Summary

The fire-and-forget pattern with Dapr Pub/Sub decouples publishers from subscribers, enabling high-throughput event processing. Publishers send events and immediately continue, while subscribers process messages at their own pace. Always configure dead-letter topics to handle subscriber failures gracefully.
