# How to Implement Message Ordering with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Message Ordering, Pub/Sub, Kafka, Microservice

Description: Learn how to implement guaranteed message ordering with Dapr pub/sub using Kafka partitioning and sequence numbers to process events in the correct order.

---

## Why Message Ordering Matters

Many business processes require events to be processed in the order they occurred. If "OrderCancelled" is processed before "OrderCreated" for the same order, the consumer ends up in an inconsistent state. Dapr pub/sub with a Kafka backend supports ordered message delivery through partition keys.

## Using Kafka with Dapr for Ordered Delivery

Configure a Kafka-backed Dapr pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ordered-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: consumerGroup
    value: order-processor
  - name: authType
    value: none
```

## Publishing with a Partition Key

Set the `partitionKey` metadata to route messages for the same entity to the same Kafka partition:

```python
import httpx

DAPR_HTTP_PORT = 3500

async def publish_order_event(event_type: str, order_id: str, payload: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/ordered-pubsub/order-events?metadata.partitionKey={order_id}",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

# All events for the same order_id go to the same partition and are consumed in order
await publish_order_event("OrderCreated", "order-123", {"orderId": "order-123", "status": "created"})
await publish_order_event("OrderPaid", "order-123", {"orderId": "order-123", "status": "paid"})
await publish_order_event("OrderShipped", "order-123", {"orderId": "order-123", "status": "shipped"})
```

## Including Sequence Numbers

Add a sequence number to events so consumers can detect and handle out-of-order delivery:

```python
from collections import defaultdict

sequence_counters = defaultdict(int)

async def publish_ordered_event(order_id: str, event_type: str, data: dict):
    sequence_counters[order_id] += 1
    seq = sequence_counters[order_id]

    event = {
        "eventType": event_type,
        "orderId": order_id,
        "sequenceNumber": seq,
        "data": data
    }

    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/ordered-pubsub/order-events?metadata.partitionKey={order_id}",
            json=event,
            headers={"Content-Type": "application/json"}
        )
```

## Consumer with Sequence Validation

The consumer tracks the last processed sequence number and rejects out-of-order messages:

```python
from fastapi import FastAPI, Request

app = FastAPI()
last_sequence = {}  # In production, persist this in Dapr state store

@app.post("/process-order-event")
async def process_order_event(request: Request):
    body = await request.json()
    event = body.get("data", {})

    order_id = event.get("orderId")
    seq = event.get("sequenceNumber", 0)
    last_seq = last_sequence.get(order_id, 0)

    if seq != last_seq + 1:
        # Out-of-order or duplicate - retry or dead letter
        print(f"Out-of-order event: expected {last_seq + 1}, got {seq}")
        return {"status": "RETRY"}

    # Process the event
    await handle_order_event(event)

    # Update last processed sequence
    last_sequence[order_id] = seq

    return {"status": "SUCCESS"}
```

## Persisting Sequence State in Dapr

For production, persist the sequence tracker in the Dapr state store so it survives restarts:

```python
async def get_last_sequence(order_id: str) -> int:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore/seq:{order_id}"
        )
        return resp.json() if resp.status_code == 200 and resp.text else 0

async def set_last_sequence(order_id: str, seq: int):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore",
            json=[{"key": f"seq:{order_id}", "value": seq}]
        )
```

## Summary

Message ordering in Dapr is achieved by using a Kafka-backed pub/sub component and setting `partitionKey` metadata to route messages for the same entity to the same Kafka partition. Including sequence numbers in events and validating them on the consumer side provides an additional safety net against the rare cases where ordering guarantees are not perfectly maintained. Persisting sequence state in Dapr ensures correctness across service restarts.
