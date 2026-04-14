# How to Implement Priority Queue with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Priority Queue, Microservice, Messaging

Description: Learn how to implement a priority-based message queue using Dapr Pub/Sub with multiple topics, routing rules, and consumer priority logic.

---

Dapr Pub/Sub provides reliable message delivery between microservices, but it does not natively support message priority ordering. However, you can implement priority queue behavior by leveraging multiple Dapr topics, message routing, and consumer-side prioritization logic. This guide shows several practical patterns for achieving priority-based processing with Dapr Pub/Sub.

## Understanding the Priority Queue Pattern

A priority queue processes messages based on their importance rather than their arrival order. In a Dapr-based architecture, you can achieve this by using separate topics for different priority levels and controlling how consumers process messages from each topic.

The three common approaches are:
- Multiple topics per priority level (simplest)
- Routing rules with a single topic (metadata-driven)
- Consumer-controlled polling (most flexible)

## Setting Up Multiple Priority Topics

Configure a Dapr pub/sub component using Redis Streams. You will use a single component with separate topics for each priority level.

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
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
  - name: maxLenApprox
    value: "10000"
```

Define three topics in your subscription configuration:

```yaml
# dapr/subscriptions.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: high-priority-orders
spec:
  pubsubname: order-pubsub
  topic: orders-high
  routes:
    default: /orders/process
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: medium-priority-orders
spec:
  pubsubname: order-pubsub
  topic: orders-medium
  routes:
    default: /orders/process
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: low-priority-orders
spec:
  pubsubname: order-pubsub
  topic: orders-low
  routes:
    default: /orders/process
```

## Publishing Messages to Priority Topics

Publishers route messages to different topics based on their priority level.

```python
import requests
import json
from enum import IntEnum

DAPR_HTTP_PORT = 3500
PUBSUB_NAME = "order-pubsub"

class Priority(IntEnum):
    HIGH = 1
    MEDIUM = 2
    LOW = 3

PRIORITY_TOPICS = {
    Priority.HIGH: "orders-high",
    Priority.MEDIUM: "orders-medium",
    Priority.LOW: "orders-low"
}

def publish_order(order: dict, priority: Priority) -> bool:
    topic = PRIORITY_TOPICS[priority]
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/{PUBSUB_NAME}/{topic}"

    payload = {
        "orderId": order["orderId"],
        "customerId": order["customerId"],
        "amount": order["amount"],
        "priority": priority.name,
        "timestamp": order.get("timestamp", "")
    }

    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload)
    )
    response.raise_for_status()
    print(f"Published {priority.name} order {order['orderId']} to topic {topic}")
    return True

# Example usage
publish_order(
    {"orderId": "VIP-001", "customerId": "C1", "amount": 5000.00, "timestamp": "2026-03-31T10:00:00Z"},
    Priority.HIGH
)

publish_order(
    {"orderId": "STD-002", "customerId": "C2", "amount": 150.00, "timestamp": "2026-03-31T10:01:00Z"},
    Priority.MEDIUM
)

publish_order(
    {"orderId": "BULK-003", "customerId": "C3", "amount": 30.00, "timestamp": "2026-03-31T10:02:00Z"},
    Priority.LOW
)
```

## Building a Priority-Aware Consumer

The consumer polls topics in priority order, always draining higher-priority queues before processing lower-priority messages.

```python
import time
import threading
from collections import deque
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory queues (in production, use a persistent queue)
priority_queues = {
    "HIGH": deque(),
    "MEDIUM": deque(),
    "LOW": deque()
}
queue_lock = threading.Lock()

@app.route('/orders/process', methods=['POST'])
def receive_order():
    """Dapr calls this endpoint when a message arrives on any subscribed topic."""
    message = request.json
    order_data = message.get("data", {})
    topic = message.get("topic", "")

    # Map topic to priority
    priority_map = {
        "orders-high": "HIGH",
        "orders-medium": "MEDIUM",
        "orders-low": "LOW"
    }
    priority = priority_map.get(topic, "LOW")

    with queue_lock:
        priority_queues[priority].append(order_data)
        print(f"Queued {priority} priority order: {order_data.get('orderId')}")

    return jsonify({"status": "SUCCESS"}), 200

def priority_worker():
    """Worker that processes messages in priority order."""
    while True:
        order = None
        priority = None

        with queue_lock:
            # Always drain HIGH priority first
            if priority_queues["HIGH"]:
                order = priority_queues["HIGH"].popleft()
                priority = "HIGH"
            elif priority_queues["MEDIUM"]:
                order = priority_queues["MEDIUM"].popleft()
                priority = "MEDIUM"
            elif priority_queues["LOW"]:
                order = priority_queues["LOW"].popleft()
                priority = "LOW"

        if order:
            process_order(order, priority)
        else:
            time.sleep(0.1)

def process_order(order: dict, priority: str):
    """Process an order based on its priority."""
    order_id = order.get("orderId", "unknown")
    amount = order.get("amount", 0)
    print(f"[{priority}] Processing order {order_id} - amount: ${amount:.2f}")
    # Add actual order processing logic here
    time.sleep(0.05)  # Simulate processing time
    print(f"[{priority}] Completed order {order_id}")

# Start the background worker
worker_thread = threading.Thread(target=priority_worker, daemon=True)
worker_thread.start()

if __name__ == "__main__":
    app.run(port=5000)
```

Run the consumer:

```bash
dapr run --app-id order-consumer --app-port 5000 -- python consumer.py
```

## Using Dapr Message Routing for Priority

With Dapr routing rules, you can use a single topic and route messages based on their content to different handler paths.

```yaml
# dapr/subscriptions-routing.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-routing
spec:
  pubsubname: order-pubsub
  topic: orders
  routes:
    rules:
    - match: event.data.priority == "HIGH"
      path: /orders/high
    - match: event.data.priority == "MEDIUM"
      path: /orders/medium
    default: /orders/low
```

Handle different routes in your application:

```python
import queue
import threading
from flask import Flask, request, jsonify

app = Flask(__name__)

# Separate processing queues per priority
processing_queues = {
    "high": queue.Queue(),
    "medium": queue.Queue(),
    "low": queue.Queue()
}

@app.route('/orders/high', methods=['POST'])
def handle_high_priority():
    order = request.json.get("data", {})
    processing_queues["high"].put(order)
    print(f"HIGH priority order received: {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"}), 200

@app.route('/orders/medium', methods=['POST'])
def handle_medium_priority():
    order = request.json.get("data", {})
    processing_queues["medium"].put(order)
    return jsonify({"status": "SUCCESS"}), 200

@app.route('/orders/low', methods=['POST'])
def handle_low_priority():
    order = request.json.get("data", {})
    processing_queues["low"].put(order)
    return jsonify({"status": "SUCCESS"}), 200

def start_workers():
    """Start workers with different concurrency per priority."""
    # 4 workers for high, 2 for medium, 1 for low
    configs = [("high", 4), ("medium", 2), ("low", 1)]
    for priority, worker_count in configs:
        for i in range(worker_count):
            t = threading.Thread(
                target=worker_loop,
                args=(priority, processing_queues[priority]),
                daemon=True
            )
            t.start()

def worker_loop(priority: str, q: queue.Queue):
    while True:
        try:
            order = q.get(timeout=1)
            print(f"[{priority.upper()}] Worker processing {order.get('orderId')}")
            # Process the order here
            q.task_done()
        except queue.Empty:
            continue

start_workers()

if __name__ == "__main__":
    app.run(port=5000)
```

## Summary

Implementing a priority queue with Dapr Pub/Sub requires combining Dapr's messaging primitives with application-level prioritization logic. You learned three core patterns: using multiple topics per priority level for simplicity, applying Dapr routing rules to direct messages to different handler paths, and building a consumer that always drains higher-priority queues before lower-priority ones. By allocating more worker threads to high-priority topics and less to low-priority ones, you can tune throughput to match your business requirements while keeping the Dapr Pub/Sub architecture clean.
