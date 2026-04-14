# How to Implement Eventual Consistency with Dapr Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Eventual Consistency, Pub/Sub, Saga, Distributed System, Consistency

Description: Implement eventual consistency patterns with Dapr pub/sub events, managing distributed state across microservices without distributed transactions.

---

## Overview

Eventual consistency is a consistency model where distributed data will become consistent over time, without requiring synchronous coordination. In Dapr-based microservices, eventual consistency is achieved through event-driven communication and compensating transactions rather than distributed ACID transactions.

## The Consistency Trade-off

In distributed microservices, you choose between:
- Strong consistency: All services see the same data at the same time (requires distributed locking, high latency)
- Eventual consistency: Services may see stale data temporarily, but will converge (higher availability, lower latency)

Dapr pub/sub enables eventual consistency by decoupling producers from consumers.

## Saga Pattern for Distributed Consistency

The Saga pattern manages long-running transactions across services using a sequence of local transactions:

```python
import dapr.clients as dapr
import json

# Order Saga: coordinates across Order, Inventory, Payment services

def start_order_saga(order_data: dict):
    """Step 1: Place order and start saga"""
    with dapr.DaprClient() as client:
        # Save saga state
        saga_state = {
            "orderId": order_data["orderId"],
            "status": "started",
            "steps": {
                "order": "completed",
                "inventory": "pending",
                "payment": "pending"
            }
        }
        client.save_state("statestore", f"saga:{order_data['orderId']}", json.dumps(saga_state))

        # Publish event to trigger next saga step
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="OrderPlaced",
            data=json.dumps(order_data)
        )
        print(f"Saga started for order {order_data['orderId']}")

def handle_inventory_reserved(event_data: dict):
    """Step 2: Inventory reserved, proceed to payment"""
    order_id = event_data["orderId"]

    with dapr.DaprClient() as client:
        # Update saga state
        saga = json.loads(client.get_state("statestore", f"saga:{order_id}").data)
        saga["steps"]["inventory"] = "completed"
        client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))

        # Trigger payment step
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="InitiatePayment",
            data=json.dumps({"orderId": order_id, "amount": event_data["amount"]})
        )

def handle_payment_failed(event_data: dict):
    """Compensating transaction: payment failed, release inventory"""
    order_id = event_data["orderId"]

    with dapr.DaprClient() as client:
        # Update saga state to failed
        saga = json.loads(client.get_state("statestore", f"saga:{order_id}").data)
        saga["status"] = "failed"
        saga["steps"]["payment"] = "failed"
        client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))

        # Compensating transaction: release reserved inventory
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="ReleaseInventory",
            data=json.dumps({"orderId": order_id, "reason": "payment_failed"})
        )

        # Compensating transaction: cancel order
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="CancelOrder",
            data=json.dumps({"orderId": order_id, "reason": "payment_failed"})
        )
        print(f"Saga compensated for order {order_id}")
```

## Handling Stale Reads

When a service reads data that may be stale, provide user feedback:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function getOrderStatus(orderId) {
  const state = await client.state.get('statestore', `order:${orderId}`);

  if (!state) {
    return { status: 'not_found' };
  }

  const order = JSON.parse(state);

  // Add eventual consistency indicator
  return {
    ...order,
    _consistency: 'eventual',
    _lastUpdated: order.updatedAt,
    _note: 'Status may be up to 5 seconds behind'
  };
}
```

## Read-Your-Writes Consistency

Implement read-your-writes by checking local state before querying:

```python
def get_order_with_local_read(order_id: str, local_cache: dict):
    # Check if we have a recent local write
    local_write = local_cache.get(f"order:{order_id}")
    if local_write and local_write["age_seconds"] < 5:
        return local_write["data"]

    # Fall back to distributed state store
    with dapr.DaprClient() as client:
        result = client.get_state("statestore", f"order:{order_id}")
        return json.loads(result.data) if result.data else None
```

## Monitoring Saga State

```bash
# Check saga state for a specific order
curl http://localhost:3500/v1.0/state/statestore/saga:ord-001

# List all in-flight sagas (requires direct DB access)
psql -c "SELECT key, value->>'status' as status FROM state WHERE key LIKE 'order-service||saga:%'"
```

## Summary

Eventual consistency with Dapr events is implemented through the Saga pattern with compensating transactions. Each service maintains its own local consistency while Dapr pub/sub coordinates the eventual convergence of distributed state. The key to success is designing compensating transactions for every saga step that can fail, ensuring the system always returns to a consistent state even when individual steps fail.
