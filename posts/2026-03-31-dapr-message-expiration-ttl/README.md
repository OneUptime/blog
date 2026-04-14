# How to Implement Message Expiration with Dapr TTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, TTL, Pub/Sub, Message Expiration, Messaging

Description: Learn how to set time-to-live (TTL) on Dapr pub/sub messages so expired messages are automatically discarded before processing, preventing stale event handling.

---

## Why Message Expiration Matters

Not all messages are useful forever. A "price update" event from 10 minutes ago is irrelevant if a newer update already arrived. A "flash sale started" event should not be processed hours after the sale ended. Dapr pub/sub supports per-message TTL using the `ttlInSeconds` metadata field. Expired messages are dropped by the Dapr runtime when the sidecar receives them, preventing stale events from reaching your application.

## Setting TTL When Publishing a Message

Add `ttlInSeconds` as a query parameter to the publish URL:

```python
import httpx
from datetime import datetime, timezone

DAPR_HTTP_PORT = 3500

async def publish_price_update(product_id: str, new_price: float):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/price-updates?metadata.ttlInSeconds=60",
            json={
                "productId": product_id,
                "newPrice": new_price,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            },
            headers={
                "Content-Type": "application/json"
            }
        )
```

Any message that sits in the broker for more than 60 seconds is automatically discarded.

## Setting TTL on Flash Sale Events

Flash sale notifications must not be processed after the sale ends:

```python
from datetime import datetime, timezone
import httpx

async def publish_flash_sale_start(sale_id: str, duration_minutes: int):
    sale_ends_at = datetime.now(timezone.utc).timestamp() + (duration_minutes * 60)

    ttl_seconds = duration_minutes * 60

    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/flash-sales?metadata.ttlInSeconds={ttl_seconds}",
            json={
                "saleId": sale_id,
                "discountPercent": 30,
                "endsAt": datetime.fromtimestamp(sale_ends_at, tz=timezone.utc).isoformat()
            },
            headers={
                "Content-Type": "application/json"
            }
        )
```

## Application-Level Expiry Check

Even with broker-level TTL, add an application-level check for extra protection. Some message buses may not fully support TTL, or messages may have been queued before TTL was set:

```python
from fastapi import FastAPI, Request
from datetime import datetime, timezone

app = FastAPI()

@app.post("/handle-price-update")
async def handle_price_update(request: Request):
    body = await request.json()
    event = body.get("data", {})

    # Check event timestamp
    updated_at = datetime.fromisoformat(event.get("updatedAt", ""))
    age_seconds = (datetime.now(timezone.utc) - updated_at).total_seconds()

    if age_seconds > 120:
        # Message is too old, discard it
        print(f"Dropping stale price update for product {event['productId']}, age: {age_seconds}s")
        return {"status": "DROP"}

    # Process the fresh price update
    await update_product_price(event["productId"], event["newPrice"])
    return {"status": "SUCCESS"}
```

## TTL with Different Dapr Pub/Sub Backends

All Dapr pub/sub components support message TTL because the Dapr runtime handles the expiration logic. When the sidecar receives a message, it checks the TTL and discards expired messages before forwarding them to your application. Some backends also support native TTL at the broker level:

| Backend | Native Broker TTL | Notes |
|---|---|---|
| Redis Streams | No | TTL handled by Dapr runtime |
| Kafka | No | TTL handled by Dapr runtime |
| RabbitMQ | Yes | Also supports native x-message-ttl |
| Azure Service Bus | Yes | Dapr forwards TTL to native TimeToLive property |
| Google Cloud Pub/Sub | No | TTL handled by Dapr runtime |

Check the Dapr documentation for your specific component for details on native TTL behavior.

## Combining TTL with Dead Letter Topics

When a message expires in the broker, you can capture it in a dead letter topic for monitoring:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: price-updates-sub
spec:
  pubsubname: pubsub
  topic: price-updates
  route: /handle-price-update
  deadLetterTopic: price-updates-expired
```

Subscribe to `price-updates-expired` to alert or log when messages expire too frequently, which may indicate consumer lag or broker bottlenecks.

## Summary

Dapr pub/sub message TTL prevents stale events from being processed by setting `metadata.ttlInSeconds` as a query parameter at publish time. The Dapr runtime checks message age when the sidecar receives them and discards expired messages before delivering them to your application. Combining runtime-level TTL with an application-level age check and dead letter monitoring creates a robust expiration strategy for time-sensitive messaging scenarios.
