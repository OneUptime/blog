# How to Implement Fanout Exchange with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Fanout, Messaging, Event-Driven

Description: Learn how to implement a fanout exchange pattern with Dapr Pub/Sub so that a single published message is delivered to all subscriber services simultaneously.

---

## What Is a Fanout Exchange?

A fanout exchange broadcasts every message to all bound subscribers. Unlike work queues where each message goes to one consumer, fanout delivers the same message to every subscriber. This is useful for cache invalidation, live notification broadcasting, audit logging, or event-driven synchronization across multiple services.

In Dapr, fanout is achieved by having multiple services subscribe to the same topic.

## Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: broadcast-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Publishing a Broadcast Message

```python
import asyncio
from dapr.clients import DaprClient
import json

def publish_product_update(product_id: str, changes: dict) -> None:
    with DaprClient() as client:
        event_data = {
            "eventId": f"evt-{product_id}-{int(asyncio.get_event_loop().time())}",
            "productId": product_id,
            "changes": changes,
            "timestamp": "2026-03-31T12:00:00Z",
        }
        client.publish_event(
            pubsub_name="broadcast-pubsub",
            topic_name="product-updates",
            data=json.dumps(event_data),
            data_content_type="application/json",
        )
        print(f"Broadcast sent for product {product_id}")

publish_product_update("prod-100", {"price": 29.99, "stock": 500})
```

## Subscriber 1: Cache Service

```javascript
// cache-service/index.js
const { DaprServer } = require('@dapr/dapr');

async function main() {
  const server = new DaprServer({ serverPort: '3001' });

  server.pubsub.subscribe('broadcast-pubsub', 'product-updates', async (data) => {
    console.log(`[Cache] Invalidating cache for product ${data.productId}`);
    await cacheStore.delete(`product:${data.productId}`);
    await cacheStore.delete(`product-list`);
    return { status: 'SUCCESS' };
  });

  await server.start();
}

main().catch(console.error);
```

## Subscriber 2: Search Index Service

```javascript
// search-service/index.js
const { DaprServer } = require('@dapr/dapr');

async function main() {
  const server = new DaprServer({ serverPort: '3002' });

  server.pubsub.subscribe('broadcast-pubsub', 'product-updates', async (data) => {
    console.log(`[Search] Updating index for product ${data.productId}`);
    await searchIndex.updateDocument('products', data.productId, data.changes);
    return { status: 'SUCCESS' };
  });

  await server.start();
}

main().catch(console.error);
```

## Subscriber 3: Audit Log Service

```javascript
// audit-service/index.js
const { DaprServer } = require('@dapr/dapr');

async function main() {
  const server = new DaprServer({ serverPort: '3003' });

  server.pubsub.subscribe('broadcast-pubsub', 'product-updates', async (data) => {
    console.log(`[Audit] Recording update for product ${data.productId}`);
    await auditLog.record({
      entityType: 'product',
      entityId: data.productId,
      action: 'updated',
      changes: data.changes,
      timestamp: data.timestamp,
    });
    return { status: 'SUCCESS' };
  });

  await server.start();
}

main().catch(console.error);
```

## Kubernetes Deployment for Fanout

Each service runs independently and subscribes to the same topic:

```yaml
# Each service has its own dapr app-id and subscribes to the same topic
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "cache-service"
        dapr.io/app-port: "3001"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: search-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "search-service"
        dapr.io/app-port: "3002"
```

## Important: App IDs and Consumer Groups

Each service with a unique `app-id` forms its own consumer group. This ensures all services receive every message. If you run multiple replicas of the same service (same `app-id`), only one replica receives each message within that service's consumer group.

## Summary

Dapr fanout exchange is achieved by subscribing multiple services to the same topic using different `app-id` values. Each service receives every published message independently. This pattern is ideal for broadcasting state changes across caches, search indexes, audit logs, and notification systems without coupling the publisher to its consumers.
