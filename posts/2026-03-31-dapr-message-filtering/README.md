# How to Implement Message Filtering with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Message Filtering, Subscription, Event-Driven

Description: Learn how to filter Dapr Pub/Sub messages so subscribers only receive relevant events using routing rules and CloudEvent attribute matching.

---

Message filtering lets subscribers selectively process only the messages they care about, reducing unnecessary processing and network overhead. Dapr supports filtering through routing rules that use CEL expressions to match CloudEvent attributes.

## Why Filter Messages?

In a large event-driven system, a single topic may carry many different event types. Without filtering, every subscriber must inspect each message to determine relevance. With Dapr routing rules, the sidecar handles filtering before the message reaches application code.

## Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker:9092"
  - name: consumerGroup
    value: "filtered-consumers"
```

## Subscription with Filtering Rules

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: payment-filter
  namespace: default
spec:
  pubsubname: pubsub
  topic: events
  routes:
    rules:
    - match: event.type == "payment.completed" && int(event.data.amount) > 1000
      path: /large-payments
    - match: event.type == "payment.completed" && event.data.currency == "EUR"
      path: /eur-payments
    - match: event.type == "payment.failed"
      path: /failed-payments
  scopes:
  - payment-processor
```

## Subscriber Application

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "events",
        "routes": {
            "rules": [
                {
                    "match": "event.type == 'payment.completed' && int(event.data.amount) > 1000",
                    "path": "/large-payments"
                },
                {
                    "match": "event.type == 'payment.failed'",
                    "path": "/failed-payments"
                }
            ],
            "default": "/ignored"
        }
    }])

@app.route('/large-payments', methods=['POST'])
def handle_large_payment():
    event = request.json
    data = event.get('data', {})
    amount = data.get('amount')
    print(f"Large payment alert: ${amount} - triggering fraud review")
    return jsonify({"status": "SUCCESS"})

@app.route('/failed-payments', methods=['POST'])
def handle_failed_payment():
    event = request.json
    data = event.get('data', {})
    print(f"Payment failed: {data.get('paymentId')} - sending retry notification")
    return jsonify({"status": "SUCCESS"})

@app.route('/ignored', methods=['POST'])
def handle_ignored():
    # Messages that match no filter are silently acknowledged
    return jsonify({"status": "SUCCESS"})
```

## Publishing Test Events

```bash
# Large payment - will be routed to /large-payments
curl -X POST http://localhost:3500/v1.0/publish/pubsub/events \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "payment.completed",
    "source": "payment-service",
    "id": "pay-001",
    "data": {"paymentId": "PAY-001", "amount": 5000, "currency": "USD"}
  }'

# Small payment - will hit the default route /ignored
curl -X POST http://localhost:3500/v1.0/publish/pubsub/events \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "payment.completed",
    "source": "payment-service",
    "id": "pay-002",
    "data": {"paymentId": "PAY-002", "amount": 25, "currency": "USD"}
  }'
```

## Using the DROP Status to Discard Messages

Return a DROP status to discard a message without retrying or dead-lettering it:

```python
@app.route('/ignored', methods=['POST'])
def silently_drop():
    return jsonify({"status": "DROP"})
```

## Summary

Dapr message filtering uses CEL routing rules to selectively deliver messages to appropriate handlers. Filtering at the sidecar level reduces application complexity and improves performance. Use the DROP status response for messages that should be silently discarded rather than retried.
