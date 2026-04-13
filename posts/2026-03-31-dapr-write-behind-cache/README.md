# How to Implement Write-Behind Cache with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cache, State Management, Write-Behind, Pattern

Description: Learn how to implement the write-behind cache pattern with Dapr so writes go to the cache first and are asynchronously flushed to the database for lower latency.

---

## What is Write-Behind Caching?

In a write-behind (or write-back) cache, the application writes only to the cache and returns immediately. A background process asynchronously flushes dirty cache entries to the origin database. This reduces write latency significantly but introduces a window where data exists only in the cache.

Dapr enables this pattern by combining state management (as the cache) with pub/sub messaging (to trigger the async flush).

## Architecture

1. Application writes to Dapr state store (fast, in-memory)
2. Application publishes a `product-written` event to Dapr pub/sub
3. A flush consumer subscribes to `product-written` events
4. The consumer writes the data to the database
5. Reads hit the cache first and fall through to the database only on misses

## Writing to the Cache and Triggering Flush

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

@app.post("/products")
async def create_product(product: Product):
    async with httpx.AsyncClient() as client:
        # Write to cache
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore",
            json=[{"key": f"product:{product.id}", "value": product.dict()}]
        )

        # Publish event to trigger async database flush
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/product-written",
            json={"product": product.dict(), "operation": "upsert"}
        )

    return {"status": "accepted", "product_id": product.id}
```

## Implementing the Flush Consumer

The flush consumer subscribes to `product-written` events and writes to the database:

```python
from fastapi import FastAPI, Request
import databases

app = FastAPI()
database = databases.Database("postgresql://user:pass@localhost/products")

@app.get("/dapr/subscribe")
def subscribe():
    return [{"pubsubname": "pubsub", "topic": "product-written", "route": "/flush"}]

@app.post("/flush")
async def flush_to_database(request: Request):
    body = await request.json()
    product = body["data"]["product"]

    query = """
        INSERT INTO products (id, name, price)
        VALUES (:id, :name, :price)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, price = EXCLUDED.price
    """
    await database.execute(query=query, values=product)
    return {"status": "SUCCESS"}
```

## Handling Flush Failures

If the database flush fails, Dapr will retry the message delivery based on your resiliency policy. Configure a retry policy to handle transient database errors:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: flush-resiliency
spec:
  policies:
    retries:
      flush-retry:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
  targets:
    components:
      pubsub:
        inbound:
          retry: flush-retry
```

## Choosing a Dead Letter Topic for Persistent Failures

Configure a dead letter topic for messages that cannot be flushed after all retries:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: product-written-sub
spec:
  pubsubname: pubsub
  topic: product-written
  route: /flush
  deadLetterTopic: product-written-failed
```

Subscribe to `product-written-failed` to alert on persistent flush failures and trigger manual reconciliation.

## Summary

Write-behind caching with Dapr separates the write path (fast, cache-only) from database persistence (async, event-driven). Dapr pub/sub handles the asynchronous flush reliably with retries and dead letter topics. The tradeoff is potential data loss if the cache fails before a flush, making this pattern best suited for write-heavy workloads where some latency in database consistency is acceptable.
