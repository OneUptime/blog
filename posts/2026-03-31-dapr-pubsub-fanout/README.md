# How to Use Dapr Pub/Sub for Fan-Out Messaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Fan-Out, Event-Driven, Microservice

Description: Learn how to implement fan-out messaging patterns in Dapr pub/sub so a single published message is consumed by multiple independent subscribers simultaneously.

---

## What Is Fan-Out

Fan-out is a messaging pattern where one publisher sends a message to a topic, and multiple independent subscribers each receive and process their own copy. This is useful for broadcasting events to services that each handle them differently.

## How Dapr Fan-Out Works

Each Dapr application that subscribes to the same topic and uses a different consumer group (or app ID) receives an independent copy of every message. The broker delivers one copy per consumer group.

## Publisher

```javascript
// Order service publishes one event
async function placeOrder(order) {
  await fetch("http://localhost:3500/v1.0/publish/pubsub/order-placed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  console.log("Order event published:", order.orderId);
}
```

## Multiple Independent Subscribers

Each service defines its own subscription with its own app ID, ensuring a separate consumer group:

```yaml
# inventory-service subscription
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: inventory-order-sub
spec:
  pubsubname: pubsub
  topic: order-placed
  route: /inventory/reserve
scopes:
- inventory-service
```

```yaml
# notification-service subscription
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: notification-order-sub
spec:
  pubsubname: pubsub
  topic: order-placed
  route: /notifications/send
scopes:
- notification-service
```

```yaml
# analytics-service subscription
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: analytics-order-sub
spec:
  pubsubname: pubsub
  topic: order-placed
  route: /analytics/track
scopes:
- analytics-service
```

## Each Subscriber Handles Independently

```python
# inventory-service
@app.route("/inventory/reserve", methods=["POST"])
def reserve_inventory():
    order = request.json["data"]
    reserve_stock(order["productId"], order["quantity"])
    return "", 200
```

```python
# notification-service
@app.route("/notifications/send", methods=["POST"])
def send_notification():
    order = request.json["data"]
    send_confirmation_email(order["customerEmail"], order["orderId"])
    return "", 200
```

## Kafka Consumer Groups for Fan-Out

With Kafka, ensure each subscriber uses a different consumer group. Dapr uses the `app-id` as part of the consumer group name automatically, so different `app-id` values get independent message streams.

```bash
# Start inventory service
dapr run --app-id inventory-service --app-port 3001 -- python inventory.py

# Start notification service
dapr run --app-id notification-service --app-port 3002 -- python notification.py
```

## Verify Fan-Out Behavior

```bash
# Publish one message
curl -X POST http://localhost:3500/v1.0/publish/pubsub/order-placed \
  -H "Content-Type: application/json" \
  -d '{"orderId": "fan-test-1", "productId": "p100", "quantity": 2}'

# Both services should log receipt within seconds
```

## Fan-Out vs Competing Consumers

| Pattern | Multiple Replicas of Same Service | Result |
|---|---|---|
| Fan-out | Different app-ids | Each app gets a copy |
| Competing consumers | Same app-id | Only one replica processes each message |

## Summary

Dapr pub/sub fan-out is achieved by having multiple services with different app IDs subscribe to the same topic. Each subscriber receives an independent copy of every published message, enabling parallel processing across services without any additional broker configuration or application coordination.
