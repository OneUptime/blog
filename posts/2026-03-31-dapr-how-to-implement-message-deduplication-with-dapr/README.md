# How to Implement Message Deduplication with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Idempotency, Message Deduplication, Event-Driven, Microservice

Description: Learn how to implement message deduplication in Dapr pub/sub to prevent duplicate processing of events, ensuring exactly-once semantics in event-driven microservices.

---

In distributed event-driven systems, at-least-once delivery is the norm: message brokers guarantee that a message will be delivered, but they may deliver it more than once due to retries, consumer restarts, or network partitions. If your handlers are not idempotent, duplicate messages can cause double charges, duplicate records, or inconsistent state. Dapr provides hooks for deduplication both at the broker level and at the application level. This guide covers both approaches.

## Understanding the Duplicate Problem

Dapr's pub/sub uses at-least-once delivery by default. A subscriber receives the same message multiple times when:

- The subscriber processes the message but crashes before acknowledging it
- The broker times out waiting for an ACK and retries
- A consumer group rebalance causes a message to be re-delivered
- The subscriber returns a non-SUCCESS response and Dapr retries

```text
Publisher --> Broker --> Subscriber (processes but crashes before ACK)
                    \--> Subscriber (receives message again on restart)
```

To be safe, your message handler must be idempotent: processing the same message twice produces the same result as processing it once.

## Approach 1 - Idempotent Handler Using State Store

The simplest approach: before processing, check whether you have already seen this message ID. Store processed IDs in Dapr's state store with a TTL:

```python
# order_handler.py
import json
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
DAPR_PORT = os.environ.get("DAPR_HTTP_PORT", 3500)
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"

def is_duplicate(message_id: str) -> bool:
    """Check if we have already processed this message."""
    resp = requests.get(f"{DAPR_URL}/state/statestore/dedup-{message_id}")
    return resp.status_code == 200 and resp.text != "" and resp.text != "null"

def mark_processed(message_id: str, ttl_seconds: int = 86400):
    """Mark a message as processed with a TTL to avoid unbounded growth."""
    requests.post(
        f"{DAPR_URL}/state/statestore",
        json=[{
            "key": f"dedup-{message_id}",
            "value": "processed",
            "metadata": {
                "ttlInSeconds": str(ttl_seconds)
            }
        }]
    )

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/handle-order"
        }
    ])

@app.route("/handle-order", methods=["POST"])
def handle_order():
    event = request.json
    
    # Dapr CloudEvent includes a unique 'id' field
    message_id = event.get("id")
    order_data = event.get("data", {})
    order_id = order_data.get("orderId", "unknown")
    
    if not message_id:
        print(f"Warning: missing message ID for order {order_id}")
        message_id = f"order-{order_id}"
    
    # Check for duplicate
    if is_duplicate(message_id):
        print(f"Duplicate message {message_id} for order {order_id} - skipping")
        # Return SUCCESS to prevent redelivery of a known duplicate
        return jsonify({"status": "SUCCESS"}), 200
    
    # Process the order (actual business logic)
    try:
        process_order(order_data)
        # Mark as processed AFTER successful processing
        mark_processed(message_id)
        print(f"Order {order_id} processed successfully (message {message_id})")
        return jsonify({"status": "SUCCESS"}), 200
    except Exception as e:
        print(f"Error processing order {order_id}: {e}")
        # Return RETRY to redeliver (we did NOT mark as processed)
        return jsonify({"status": "RETRY"}), 500

def process_order(order: dict):
    """Actual order processing logic."""
    print(f"Processing order: {order.get('orderId')}")
    # Database writes, external API calls, etc.

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## Approach 2 - Database-Level Unique Constraint

For SQL-backed services, use a unique constraint on the message ID column as the deduplication mechanism:

```python
# db_handler.py
import os
import psycopg2
from contextlib import contextmanager

@contextmanager
def get_db():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def process_order_idempotent(message_id: str, order: dict) -> bool:
    """Returns True if processed, False if duplicate."""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            # Insert with ON CONFLICT DO NOTHING
            cursor.execute("""
                INSERT INTO processed_orders 
                    (message_id, order_id, customer_id, amount, processed_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (message_id) DO NOTHING
                RETURNING message_id
            """, (message_id, order["orderId"], order["customerId"], order["amount"]))
            
            if cursor.fetchone() is None:
                # Conflict - this was a duplicate
                return False
            
            # Not a duplicate - continue processing
            cursor.execute("""
                UPDATE inventory SET quantity = quantity - %s WHERE item_id = %s
            """, (order["quantity"], order["itemId"]))
            
            return True
            
        except psycopg2.IntegrityError:
            # Unique constraint violation = duplicate
            return False
```

The table schema:

```sql
CREATE TABLE processed_orders (
    message_id   VARCHAR(255) PRIMARY KEY,
    order_id     VARCHAR(255) NOT NULL,
    customer_id  VARCHAR(255) NOT NULL,
    amount       DECIMAL(10, 2),
    processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optional: auto-expire old records
CREATE INDEX idx_processed_at ON processed_orders (processed_at);
```

## Approach 3 - Outbox Pattern for Guaranteed Exactly-Once Publishing

Prevent duplicate publishing (not just consuming) using the transactional outbox pattern with Dapr:

```python
# outbox_publisher.py
def create_order_with_outbox(order: dict):
    """
    Atomically create order and queue the outbox event.
    A separate worker publishes from the outbox table, ensuring
    the event is published exactly once even if the service crashes.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Create the order record
        cursor.execute("""
            INSERT INTO orders (order_id, customer_id, status)
            VALUES (%s, %s, 'pending')
        """, (order["orderId"], order["customerId"]))
        
        # 2. Write to outbox in the same transaction
        cursor.execute("""
            INSERT INTO outbox (event_id, topic, payload, created_at, published)
            VALUES (gen_random_uuid(), 'orders', %s::jsonb, NOW(), false)
        """, (json.dumps(order),))
        
        # Both inserts commit atomically - no event lost, no duplicate

def publish_outbox_events():
    """Polling worker that publishes unpublished outbox events."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT event_id, topic, payload 
            FROM outbox 
            WHERE published = false 
            ORDER BY created_at 
            LIMIT 100
        """)
        events = cursor.fetchall()
        
        for event_id, topic, payload in events:
            response = requests.post(
                f"{DAPR_URL}/publish/pubsub/{topic}",
                json=payload
            )
            if response.status_code in (200, 204):
                cursor.execute(
                    "UPDATE outbox SET published = true WHERE event_id = %s",
                    (event_id,)
                )
```

## Configuring Dapr Pub/Sub Retry and Dead Letter Topics

Configure Dapr subscription resiliency to control retry behavior:

```yaml
# components/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
spec:
  policies:
    retries:
      pubsubRetry:
        policy: exponential
        maxInterval: 15s
        maxRetries: 3
  targets:
    components:
      pubsub:
        inbound:
          retry: pubsubRetry
```

Configure a dead letter topic for messages that fail after all retries:

```yaml
# components/subscription.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /handle-order
  deadLetterTopic: orders-dead-letter
```

Handle dead letters for investigation and manual replay:

```python
@app.route("/handle-dead-letter", methods=["POST"])
def handle_dead_letter():
    event = request.json
    message_id = event.get("id")
    original_topic = event.get("topic")
    
    print(f"Dead letter received: {message_id} from topic {original_topic}")
    # Save to a dead letter database table for manual inspection
    # Alert on-call team
    return jsonify({"status": "SUCCESS"}), 200
```

## Summary

Message deduplication in Dapr requires application-level idempotency because the underlying message brokers provide at-least-once delivery. The three primary strategies are: state-store-based deduplication using the Dapr CloudEvent message ID with a TTL, database unique constraints for services backed by a relational database, and the transactional outbox pattern to prevent duplicate publishing. Configure dead letter topics to capture messages that exceed retry limits, and tune resiliency policies to match the acceptable redelivery window for your workload.
