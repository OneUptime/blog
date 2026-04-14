# How to Handle Message Deduplication with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Deduplication, Idempotency, Messaging, Reliability, Microservice

Description: Implement message deduplication in Dapr pub/sub to handle at-least-once delivery and ensure your application processes each event exactly once.

---

## Overview

Dapr's pub/sub building block provides at-least-once delivery guarantees. In practice, this means your subscribers may receive the same message more than once due to network retries, broker restarts, or consumer rebalancing. Building idempotent consumers or implementing deduplication logic prevents duplicate processing from causing data inconsistencies.

## Why Duplicates Occur

At-least-once delivery is the standard guarantee across most brokers (Kafka, RabbitMQ, Azure Service Bus). A message is redelivered when:
- The consumer crashes before acknowledging
- The broker fails over between delivery and acknowledgment
- Network partition causes a retry

## Strategy 1: Idempotent Operations

The simplest approach is designing operations that produce the same result regardless of how many times they run.

```python
import os
from flask import Flask, request
import psycopg2

app = Flask(__name__)
db = psycopg2.connect(os.getenv('DATABASE_URL'))

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    data = event.get('data', {})
    order_id = data['orderId']

    with db.cursor() as cur:
        # INSERT ... ON CONFLICT DO NOTHING is idempotent
        cur.execute("""
            INSERT INTO orders (id, customer_id, total, status)
            VALUES (%s, %s, %s, 'pending')
            ON CONFLICT (id) DO NOTHING
        """, (order_id, data['customerId'], data['total']))
        db.commit()

    return '', 200
```

## Strategy 2: Deduplication with Redis

Track processed message IDs with a TTL:

```python
import redis
import json
from flask import Flask, request

app = Flask(__name__)
r = redis.Redis(host='redis', port=6379, decode_responses=True)

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    # Dapr provides a unique message ID in the CloudEvent
    message_id = event.get('id')

    dedup_key = f"processed:{message_id}"
    if r.set(dedup_key, '1', nx=True, ex=3600):
        # nx=True means only set if not exists
        data = event.get('data', {})
        process_order(data)
        return '', 200
    else:
        # Already processed - return success to ack the duplicate
        print(f"Duplicate message {message_id} skipped")
        return '', 200

def process_order(data):
    print(f"Processing order {data['orderId']}")
```

## Strategy 3: Database Deduplication Table

For durable deduplication across service restarts:

```sql
CREATE TABLE processed_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    topic VARCHAR(255)
);

-- Add TTL cleanup job
DELETE FROM processed_messages
WHERE processed_at < NOW() - INTERVAL '24 hours';
```

```python
@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    message_id = event.get('id')

    with db.cursor() as cur:
        try:
            cur.execute(
                "INSERT INTO processed_messages (message_id, topic) VALUES (%s, %s)",
                (message_id, 'orders')
            )
            db.commit()
        except psycopg2.errors.UniqueViolation:
            db.rollback()
            return '', 200  # Already processed

    process_order(event['data'])
    return '', 200
```

## Using CloudEvent ID for Deduplication

Dapr wraps messages in CloudEvents format, which includes a unique `id` field:

```json
{
  "specversion": "1.0",
  "type": "com.dapr.event.sent",
  "source": "order-service",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "time": "2026-03-31T10:00:00Z",
  "data": {"orderId": "ORD-1001"}
}
```

Always use `event['id']` as your deduplication key.

## Setting Custom Message IDs

When publishing, set a deterministic ID:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/kafka-pubsub/orders?metadata.cloudevent.id=order-ORD-1001-v1" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-1001"}'
```

## Summary

Dapr pub/sub delivers messages at least once, making deduplication essential for reliable systems. The simplest approach is idempotent operations using database upserts or conditional inserts. For more complex scenarios, track processed message IDs using the CloudEvent `id` field in Redis or a deduplication table. Always return HTTP 200 for duplicates so Dapr acknowledges the message and stops redelivery.
