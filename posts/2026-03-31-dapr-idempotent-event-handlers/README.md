# How to Implement Idempotent Event Handlers with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Idempotency, Pub/Sub, Event Handler, Reliability, At-Least-Once

Description: Implement idempotent event handlers in Dapr pub/sub to safely process duplicate messages in at-least-once delivery systems.

---

## Overview

Dapr pub/sub uses at-least-once delivery semantics, meaning an event may be delivered more than once due to retries, rebalancing, or network issues. Idempotent event handlers process the same event multiple times without producing different outcomes, making them essential for reliable event-driven systems.

## Why Idempotency Matters

Without idempotency, duplicate delivery causes:
- Double charges in payment processing
- Duplicate emails to customers
- Incorrect inventory counts
- Duplicate records in databases

## Idempotency Key Strategies

Choose the right idempotency key based on your use case:

| Strategy | Key | Use Case |
|---|---|---|
| Event ID | `cloudEvent.id` | General purpose |
| Aggregate + Sequence | `orderId:seq:5` | Event sourcing |
| Request ID | `requestId` | Command handling |
| Content hash | SHA256(payload) | Deduplication by content |

## Redis-Based Idempotency Store

```python
import redis
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours

def is_duplicate_event(event_id: str) -> bool:
    """Check if event was already processed"""
    key = f"processed_event:{event_id}"
    # SET NX (only set if not exists) - atomic check and set
    result = redis_client.set(key, "1", nx=True, ex=IDEMPOTENCY_TTL_SECONDS)
    if result is None:
        # Key already existed - duplicate event
        return True
    return False

@app.route('/payments/charge', methods=['POST'])
def handle_charge_payment():
    cloud_event = request.json
    event_id = cloud_event.get("id")
    data = cloud_event.get("data", {})

    # Idempotency check
    if is_duplicate_event(event_id):
        print(f"Duplicate event {event_id}, skipping")
        return jsonify({"status": "SUCCESS"}), 200

    # Process payment (safe - only runs once)
    charge_customer(data["orderId"], data["amount"], data["customerId"])

    return jsonify({"status": "SUCCESS"}), 200

def charge_customer(order_id: str, amount: float, customer_id: str):
    print(f"Charging ${amount} for order {order_id} to customer {customer_id}")

app.run(port=8080)
```

## Dapr State Store for Idempotency

Use Dapr's state store instead of a separate Redis client:

```python
import dapr.clients as dapr
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/orders/fulfill', methods=['POST'])
def handle_fulfill_order():
    cloud_event = request.json
    event_id = cloud_event.get("id")
    data = cloud_event.get("data", {})

    with dapr.DaprClient() as client:
        idempotency_key = f"processed:{event_id}"

        # Check if already processed
        existing = client.get_state("statestore", idempotency_key)
        if existing.data:
            print(f"Duplicate event {event_id}, returning cached result")
            return jsonify(json.loads(existing.data)), 200

        # Process the event
        result = fulfill_order(data["orderId"])

        # Save result with TTL
        client.save_state(
            store_name="statestore",
            key=idempotency_key,
            value=json.dumps(result),
            state_metadata={"ttlInSeconds": "86400"}
        )

    return jsonify(result), 200

def fulfill_order(order_id: str) -> dict:
    print(f"Fulfilling order {order_id}")
    return {"orderId": order_id, "status": "fulfilled", "trackingId": f"TRK-{order_id}"}

app.run(port=8080)
```

## Database-Level Idempotency

For database inserts, use UNIQUE constraints:

```sql
-- Unique constraint on event_id prevents duplicate inserts
CREATE TABLE order_fulfillments (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) UNIQUE NOT NULL,
  order_id VARCHAR(50) NOT NULL,
  tracking_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Idempotent insert using ON CONFLICT
INSERT INTO order_fulfillments (event_id, order_id, tracking_id)
VALUES ('evt-001', 'ord-123', 'TRK-456')
ON CONFLICT (event_id) DO NOTHING;
```

## Testing Idempotency

```python
def test_idempotent_handler():
    event = {
        "id": "test-event-001",
        "data": {"orderId": "ord-test", "amount": 50.00, "customerId": "C001"}
    }

    # First call - should process
    result1 = handle_charge_payment_logic(event)
    assert result1["processed"] == True

    # Second call with same event ID - should skip
    result2 = handle_charge_payment_logic(event)
    assert result2["skipped"] == True

    # Verify charge only happened once
    assert get_charge_count("ord-test") == 1

def handle_charge_payment_logic(event: dict) -> dict:
    if is_duplicate_event(event["id"]):
        return {"skipped": True}
    charge_customer(event["data"]["orderId"], event["data"]["amount"], event["data"]["customerId"])
    return {"processed": True}

def get_charge_count(order_id: str) -> int:
    return 1  # Mock implementation
```

## Summary

Idempotent event handlers are non-negotiable in Dapr pub/sub systems with at-least-once delivery. Using a Redis SET NX command or Dapr state store with unique idempotency keys provides atomic duplicate detection. The TTL on idempotency records prevents unbounded growth while ensuring protection during the replay window. Database UNIQUE constraints provide idempotency at the persistence layer as an additional safety net.
