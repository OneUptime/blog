# How to Implement Event Storming Results with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Storming, Domain-Driven Design, Pub/Sub, Microservice, DDD

Description: Translate Event Storming workshop results into Dapr pub/sub configurations and microservice implementations for domain-driven systems.

---

## Overview

Event Storming is a collaborative workshop technique from Domain-Driven Design (DDD) that maps business processes as a sequence of domain events, commands, and aggregates. Once you have event storming results, Dapr's pub/sub building block is a natural implementation vehicle for the discovered event flows.

## Event Storming Output to Dapr Mapping

Event storming produces these artifacts, which map directly to Dapr concepts:

| Event Storming Artifact | Dapr Concept |
|---|---|
| Domain Event (orange sticky) | Published topic message |
| Command (blue sticky) | Trigger for event publication |
| Aggregate (yellow sticky) | Service that publishes/consumes events |
| Policy (lilac sticky) | Subscription + event handler |
| Read Model (green sticky) | State store consumer |
| External System (pink sticky) | Binding or external pub/sub component |

## Example: E-Commerce Order Flow

From an event storming session, you discover this flow:

```text
[Place Order Command] -> OrderPlaced Event
OrderPlaced -> [Reserve Inventory Policy] -> InventoryReserved Event
InventoryReserved -> [Charge Payment Policy] -> PaymentProcessed Event
PaymentProcessed -> [Fulfill Order Policy] -> OrderFulfilled Event
OrderFulfilled -> [Send Confirmation Policy] -> NotificationSent Event
```

## Implementing Events as Dapr Topics

Each orange sticky becomes a topic:

```bash
# Create topics in your message broker
kafka-topics.sh --create --topic OrderPlaced --partitions 6 --replication-factor 3
kafka-topics.sh --create --topic InventoryReserved --partitions 6 --replication-factor 3
kafka-topics.sh --create --topic PaymentProcessed --partitions 6 --replication-factor 3
kafka-topics.sh --create --topic OrderFulfilled --partitions 3 --replication-factor 3
```

## Implementing Policies as Dapr Subscriptions

Each lilac sticky (policy) becomes a Dapr subscription:

```yaml
# Reserve Inventory Policy
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: reserve-inventory-policy
spec:
  pubsubname: orders-pubsub
  topic: OrderPlaced
  routes:
    default: /inventory/reserve
scopes:
- inventory-service

---

# Charge Payment Policy
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: charge-payment-policy
spec:
  pubsubname: orders-pubsub
  topic: InventoryReserved
  routes:
    default: /payments/charge
scopes:
- payment-service
```

## Implementing Aggregates as Services

Each yellow aggregate becomes a Dapr-enabled microservice:

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json

app = Flask(__name__)

# Order Aggregate
@app.route('/orders', methods=['POST'])
def place_order():
    order_data = request.json
    order_id = generate_order_id()

    # Save aggregate state
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=f"order:{order_id}",
            value=json.dumps({
                "id": order_id,
                "status": "placed",
                "items": order_data["items"],
                "total": order_data["total"]
            })
        )

        # Publish domain event (orange sticky)
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="OrderPlaced",
            data=json.dumps({"orderId": order_id, "customerId": order_data["customerId"]}),
            data_content_type='application/json',
        )

    return jsonify({"orderId": order_id}), 201

# Inventory Policy handler (lilac sticky)
@app.route('/inventory/reserve', methods=['POST'])
def reserve_inventory():
    event = request.json
    order_id = event["data"]["orderId"]

    # Reserve inventory logic
    reserved = perform_inventory_reservation(order_id)

    if reserved:
        with DaprClient() as client:
            # Publish next event in chain
            client.publish_event(
                pubsub_name="orders-pubsub",
                topic_name="InventoryReserved",
                data=json.dumps({"orderId": order_id, "reservationId": reserved["id"]}),
                data_content_type='application/json',
            )

    return jsonify({"status": "SUCCESS"}), 200

def perform_inventory_reservation(order_id):
    return {"id": f"res-{order_id}"}

def generate_order_id():
    import uuid
    return str(uuid.uuid4())[:8]

if __name__ == '__main__':
    app.run(port=8080)
```

## Read Models from Event Streams

Green stickies (read models) are built by consuming events:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Read model: Order summary view
app.post('/readmodel/order-summary', async (req, res) => {
  const event = req.body;

  if (event.topic === 'OrderPlaced') {
    await updateOrderSummary(event.data.orderId, 'placed');
  } else if (event.topic === 'PaymentProcessed') {
    await updateOrderSummary(event.data.orderId, 'paid');
  } else if (event.topic === 'OrderFulfilled') {
    await updateOrderSummary(event.data.orderId, 'fulfilled');
  }

  res.status(200).json({ status: 'SUCCESS' });
});

async function updateOrderSummary(orderId, status) {
  console.log(`Updating order ${orderId} to status: ${status}`);
}

app.listen(8080);
```

## Summary

Translating event storming results to Dapr is straightforward: domain events become topics, policies become subscriptions, and aggregates become Dapr-enabled services. This mapping makes the code a direct representation of the business domain model discovered in the workshop. Dapr's pub/sub abstraction allows the team to start with a simple broker like Redis Streams in development and switch to Kafka in production without changing any application code.
