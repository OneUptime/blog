# How to Implement Cache Invalidation with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cache, Pub/Sub, Invalidation, Event-Driven

Description: Learn how to implement event-driven cache invalidation across multiple services using Dapr pub/sub to keep distributed caches consistent when data changes.

---

## The Cache Invalidation Problem

When multiple services cache the same data, updating one service's source data leaves other caches stale. The classic solution is to broadcast invalidation events. Dapr pub/sub is ideal for this because it decouples the publisher (the service that changed data) from the subscribers (any service that cached it).

## Architecture

1. Service A updates a product in the database
2. Service A publishes a `product-updated` event to Dapr pub/sub
3. Service B (which cached the product) receives the event
4. Service B deletes the stale cache entry from its Dapr state store
5. Service B's next read fetches fresh data and re-populates the cache

## Publishing Cache Invalidation Events

In the product service, publish an event after every successful update:

```python
import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
DAPR_HTTP_PORT = 3500

class Product(BaseModel):
    id: str
    name: str
    price: float

@app.put("/products/{product_id}")
async def update_product(product_id: str, product: Product):
    # Save to database
    await db.products.update(product_id, product.model_dump())

    # Publish invalidation event
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/cache-invalidation",
            json={
                "entityType": "product",
                "entityId": product_id,
                "operation": "update"
            }
        )

    return {"status": "updated"}
```

## Subscribing to Invalidation Events

Any service that caches products subscribes to the `cache-invalidation` topic and deletes the relevant entry:

```python
import httpx
from fastapi import FastAPI, Request

app = FastAPI()
DAPR_HTTP_PORT = 3500

@app.get("/dapr/subscribe")
def subscribe():
    return [{
        "pubsubname": "pubsub",
        "topic": "cache-invalidation",
        "route": "/invalidate-cache"
    }]

@app.post("/invalidate-cache")
async def invalidate_cache(request: Request):
    body = await request.json()
    data = body.get("data", {})
    entity_type = data.get("entityType")
    entity_id = data.get("entityId")

    cache_key = f"{entity_type}:{entity_id}"

    async with httpx.AsyncClient() as client:
        await client.delete(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore/{cache_key}"
        )

    print(f"Cache invalidated: {cache_key}")
    return {"status": "SUCCESS"}
```

## Bulk Invalidation for Related Keys

When a category changes, all products in that category may need to be invalidated. Include related keys in the event:

```python
await client.post(
    f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/cache-invalidation",
    json={
        "entityType": "category",
        "entityId": category_id,
        "relatedKeys": [
            f"product:{pid}" for pid in products_in_category
        ],
        "operation": "update"
    }
)
```

In the subscriber, invalidate all related keys:

```python
@app.post("/invalidate-cache")
async def invalidate_cache(request: Request):
    body = await request.json()
    data = body.get("data", {})
    keys_to_invalidate = [
        f"{data['entityType']}:{data['entityId']}",
        *data.get("relatedKeys", [])
    ]

    async with httpx.AsyncClient() as client:
        for key in keys_to_invalidate:
            await client.delete(
                f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore/{key}"
            )

    return {"status": "SUCCESS"}
```

## Idempotent Invalidation

Cache delete operations are naturally idempotent - deleting an already-absent key is a no-op. If the Dapr pub/sub delivers the message more than once, the subscriber deletes the (possibly already absent) cache entry and moves on safely.

## Summary

Dapr pub/sub provides a clean mechanism for cross-service cache invalidation. The data-owning service publishes an event on every update, and any service that caches that data subscribes and invalidates its local state. Because Dapr handles delivery and retries with at-least-once semantics, the invalidation logic in each subscriber stays simple. Since cache deletes are idempotent, duplicate deliveries are harmless.
