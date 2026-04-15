# How to Handle Event Ordering Guarantees with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Ordering, Pub/Sub, Kafka, Partition, Sequence

Description: Implement and enforce event ordering guarantees in Dapr pub/sub systems using partition keys, sequence numbers, and ordering-aware consumers.

---

## Overview

Event ordering guarantees ensure that consumers process events in the order they were produced. Dapr pub/sub inherits ordering guarantees from the underlying message broker - Kafka provides per-partition ordering, Redis Streams provides per-stream ordering, while SNS/SQS provides no ordering by default. Understanding these guarantees is essential for building correct event-driven systems.

## Ordering Guarantee Matrix

| Broker | Guarantee | How |
|---|---|---|
| Kafka | Per-partition FIFO | Partition key assignment |
| Redis Streams | Per-stream FIFO | Single consumer per stream |
| Azure Service Bus | Per-session FIFO | Session ID assignment |
| RabbitMQ | Per-queue FIFO | Single consumer |
| SNS/SQS | No guarantee | Use FIFO queues instead |
| GCP Pub/Sub | Per-ordering-key | `enableMessageOrdering: true` |

## Kafka Partition Key for Per-Customer Ordering

```python
from dapr.clients import DaprClient
import json

def publish_order_event_ordered(order: dict):
    """Publish with partition key to ensure per-customer ordering"""
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="kafka-pubsub",
            topic_name="OrderEvents",
            data=json.dumps(order),
            publish_metadata={
                # All events for the same customer go to the same partition
                "partitionKey": order["customerId"]
            }
        )
        print(f"Published order {order['orderId']} with partition key {order['customerId']}")

# Multiple events for same customer are ordered
publish_order_event_ordered({"orderId": "001", "customerId": "C123", "event": "OrderPlaced"})
publish_order_event_ordered({"orderId": "001", "customerId": "C123", "event": "PaymentProcessed"})
publish_order_event_ordered({"orderId": "001", "customerId": "C123", "event": "OrderShipped"})
```

## Dapr Kafka Component with Single Partition Consumer

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "order-processor"
  - name: consumeRetryEnabled
    value: "true"
  - name: initialOffset
    value: "oldest"
```

Ensure ordering by deploying only one instance per partition key:

```yaml
# Use StatefulSet with one consumer per partition
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: order-processor
spec:
  replicas: 4  # Match number of Kafka partitions
  serviceName: order-processor
```

## Sequence Number Validation

Add a sequence number to events and validate ordering on the consumer:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

# In-memory sequence tracker (use Redis in production)
sequence_tracker = {}

@app.route('/orders/events', methods=['POST'])
def handle_order_event():
    event_data = request.json.get("data", {})
    customer_id = event_data.get("customerId")
    sequence = event_data.get("sequence", 0)
    order_id = event_data.get("orderId")

    # Check if sequence is in order
    expected = sequence_tracker.get(customer_id, 0) + 1

    if sequence < expected:
        print(f"Duplicate event (seq {sequence} < expected {expected}), skipping")
        return jsonify({"status": "SUCCESS"}), 200

    if sequence > expected:
        print(f"Out-of-order event (seq {sequence} > expected {expected}), retrying later")
        return jsonify({"status": "RETRY"}), 500

    # Process in-order event
    process_order_event(event_data)
    sequence_tracker[customer_id] = sequence

    return jsonify({"status": "SUCCESS"}), 200

def process_order_event(data: dict):
    print(f"Processing event: {data.get('event')} for order {data.get('orderId')}")

app.run(port=8080)
```

## Azure Service Bus FIFO with Sessions

For Azure Service Bus ordered delivery, use message sessions:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus.queues
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: maxConcurrentHandlers
    value: "1"
```

Publish with session ID:

```javascript
const client = new DaprClient();

await client.pubsub.publish('servicebus-pubsub', 'orders', orderData, {
  metadata: {
    SessionId: customerId  // All messages for a customer processed in order
  }
});
```

## Monitoring Out-of-Order Events

```bash
# Alert when out-of-order events are detected
kubectl logs -l app=order-processor | grep "Out-of-order event" | wc -l
```

## Summary

Event ordering guarantees with Dapr depend on the message broker and your partition strategy. Using customer ID or aggregate ID as the partition key ensures that all events for a given entity are processed in order within a single partition. Sequence number validation in consumers provides an additional safety net to detect and handle ordering violations at the application level. For strict ordering requirements, Azure Service Bus sessions provide strong guarantees, and Kafka's per-partition FIFO ordering can be further reinforced by limiting consumer concurrency to one instance per partition.
