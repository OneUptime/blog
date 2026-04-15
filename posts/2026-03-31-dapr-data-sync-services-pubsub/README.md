# How to Implement Data Synchronization Between Services with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Data Synchronization, Microservice, Eventual Consistency

Description: Learn how to synchronize data between microservices using Dapr pub/sub to maintain eventually consistent replicas across service boundaries without direct coupling.

---

## The Data Sync Challenge

Microservices own their data stores, but often need copies of data from other services. Polling APIs creates coupling and load. Dapr pub/sub lets the authoritative service broadcast changes and consuming services maintain their own synchronized replicas.

## Configure Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sync-pubsub
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: consumerGroup
      value: "data-sync-consumers"
    - name: authType
      value: "none"
```

## Publisher: Product Catalog Service

The authoritative service for products publishes every change:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function updateProduct(productId, updates) {
  const product = await db.products.update(productId, updates);

  await client.pubsub.publish('sync-pubsub', 'product.synced', {
    productId: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    categoryId: product.categoryId,
    updatedAt: product.updatedAt,
    version: product.version
  });

  return product;
}
```

## Consumer: Order Service Local Replica

The order service keeps a local copy of product data for fast checkout:

```javascript
const { DaprServer } = require('@dapr/dapr');
const server = new DaprServer();

await server.pubsub.subscribe('sync-pubsub', 'product.synced', async (event) => {
  await db.query(
    `INSERT INTO products_replica (id, name, price, stock, category_id, updated_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       price = EXCLUDED.price,
       stock = EXCLUDED.stock,
       category_id = EXCLUDED.category_id,
       updated_at = EXCLUDED.updated_at,
       version = EXCLUDED.version
     WHERE products_replica.version < EXCLUDED.version`,
    [event.productId, event.name, event.price, event.stock,
     event.categoryId, event.updatedAt, event.version]
  );
});
```

## Handling Out-of-Order Events

Use version numbers to discard stale updates:

```javascript
await server.pubsub.subscribe('sync-pubsub', 'product.synced', async (event) => {
  const existing = await db.products_replica.findOne({ id: event.productId });

  if (existing && existing.version >= event.version) {
    console.log(`Ignoring stale event v${event.version} for product ${event.productId}`);
    return;
  }

  await db.products_replica.upsert(event);
});
```

## Initial Full Sync on Service Startup

New service instances need a full sync before processing events:

```javascript
async function initialSync() {
  let page = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const products = await fetch(
      `http://localhost:3500/v1.0/invoke/product-service/method/products?page=${page}&size=${PAGE_SIZE}`
    ).then(r => r.json());

    if (products.length === 0) break;

    for (const p of products) {
      await db.products_replica.upsert(p);
    }
    page++;
  }

  console.log('Initial sync complete - subscribing to live events');
}

await initialSync();
await server.start();
```

## Monitoring Sync Lag

Track the difference between the event timestamp and the current time to measure sync lag:

```javascript
await server.pubsub.subscribe('sync-pubsub', 'product.synced', async (event) => {
  const lagMs = Date.now() - new Date(event.updatedAt).getTime();
  metrics.recordGauge('product_sync_lag_ms', lagMs);
  // Process event...
});
```

## Summary

Dapr pub/sub based data synchronization gives each service a local, fast replica of data it needs from other domains. Version-based conflict resolution prevents stale overwrites, while an initial full sync ensures new instances start with consistent state before processing live events.
