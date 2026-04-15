# How to Implement Distributed Cache with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Cache, Redis, Distributed System

Description: Learn how to implement a distributed cache using Dapr state management to share cached data across multiple service instances with TTL and consistency controls.

---

## Why Use Dapr State for Distributed Caching?

A distributed cache lets multiple service instances share computed results, database query results, or API responses. Dapr state management provides a uniform API over Redis, Memcached, or any supported store - so you can switch the backing store without changing application code.

## Configure the State Store with TTL Support

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cache-store
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: enableTLS
      value: "false"
    - name: ttlInSeconds
      value: "300"
```

## Writing to the Cache with TTL

Use the state API to write with a per-key TTL:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function cacheProductPrice(productId, price) {
  await client.state.save('cache-store', [
    {
      key: `product:${productId}:price`,
      value: { price, currency: 'USD', cachedAt: Date.now() },
      metadata: {
        ttlInSeconds: '600'   // override default TTL per key
      }
    }
  ]);
}
```

## Reading from the Cache with Fallback

Implement a cache-aside pattern - read from cache, fall back to the database on a miss:

```javascript
async function getProductPrice(productId) {
  const cached = await client.state.get('cache-store', `product:${productId}:price`);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const fresh = await db.query('SELECT price FROM products WHERE id = $1', [productId]);
  await cacheProductPrice(productId, fresh.price);
  return fresh;
}
```

## Bulk Cache Operations

Write multiple keys in one call to minimize round trips:

```javascript
async function warmCache(products) {
  const items = products.map(p => ({
    key: `product:${p.id}:price`,
    value: { price: p.price },
    metadata: { ttlInSeconds: '3600' }
  }));

  await client.state.save('cache-store', items);
}
```

## Cache Invalidation

Delete a cache entry when the underlying data changes:

```javascript
async function updateProductPrice(productId, newPrice) {
  await db.query('UPDATE products SET price = $1 WHERE id = $2', [newPrice, productId]);

  // Invalidate the cache entry
  await client.state.delete('cache-store', `product:${productId}:price`);
}
```

## Using Consistency Options

For read-your-writes guarantees within a single session, use strong consistency:

```javascript
const { StateConsistencyEnum } = require('@dapr/dapr');

const cached = await client.state.get('cache-store', key, {
  consistency: StateConsistencyEnum.CONSISTENCY_STRONG
});
```

## Summary

Dapr state management provides a straightforward distributed cache layer with TTL support, bulk operations, and pluggable backends. The cache-aside pattern - read from state, fall back to the source, write back on miss, invalidate on update - is easy to implement and works identically regardless of the underlying store.
