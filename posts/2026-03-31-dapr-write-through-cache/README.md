# How to Implement Write-Through Cache with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cache, State Management, Write-Through, Pattern

Description: Learn how to implement the write-through cache pattern with Dapr state management so every write updates both the cache and the origin database atomically.

---

## What is Write-Through Caching?

In a write-through cache, every write to the application updates both the cache and the persistent store synchronously before returning to the caller. This guarantees the cache always contains fresh data, eliminating stale reads after writes. Dapr state management handles the cache layer, and your application coordinates the write to the origin database.

## Architecture Overview

The write path for a write-through cache looks like:

1. Application receives a write request
2. Application writes to the origin database
3. Application writes the same data to the Dapr state store (cache)
4. Application returns success to the caller

Reads always check Dapr state first and only fall through to the database on a cache miss.

## Implementing Write-Through Cache in Node.js

```javascript
const axios = require('axios');

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || 3500;
const CACHE_STORE = 'statestore';

async function writeToCache(key, value, ttlSeconds = 600) {
  await axios.post(`http://localhost:${DAPR_HTTP_PORT}/v1.0/state/${CACHE_STORE}`, [
    {
      key,
      value,
      metadata: { ttlInSeconds: String(ttlSeconds) }
    }
  ]);
}

async function readFromCache(key) {
  try {
    const resp = await axios.get(
      `http://localhost:${DAPR_HTTP_PORT}/v1.0/state/${CACHE_STORE}/${key}`
    );
    return resp.data || null;
  } catch {
    return null;
  }
}

async function saveProduct(product) {
  // Write to origin database first
  await db.products.save(product);

  // Write to cache (write-through)
  await writeToCache(`product:${product.id}`, product, 600);

  return product;
}

async function getProduct(productId) {
  // Read from cache
  const cached = await readFromCache(`product:${productId}`);
  if (cached) return { ...cached, source: 'cache' };

  // Cache miss - read from database
  const product = await db.products.findById(productId);
  if (product) {
    // Populate cache for future reads
    await writeToCache(`product:${productId}`, product, 600);
  }
  return product ? { ...product, source: 'database' } : null;
}
```

## Handling Write Failures

If the database write succeeds but the cache write fails, the cache becomes inconsistent. Use a try/catch to log cache failures without failing the entire request:

```javascript
async function saveProduct(product) {
  // Database write is mandatory - propagate failures
  await db.products.save(product);

  // Cache write is best-effort - log but don't fail
  try {
    await writeToCache(`product:${product.id}`, product, 600);
  } catch (err) {
    console.error(`Cache write failed for product ${product.id}:`, err.message);
    // The product is saved in the database, so the operation succeeded
  }

  return product;
}
```

## Updating Related Cache Keys on Write

When a product changes, related cached queries (like category listings) may become stale. Invalidate them on every write:

```javascript
async function saveProduct(product) {
  await db.products.save(product);

  await Promise.allSettled([
    writeToCache(`product:${product.id}`, product, 600),
    deleteFromCache(`category:${product.categoryId}:products`),
    deleteFromCache(`search:featured`)
  ]);

  return product;
}

async function deleteFromCache(key) {
  await axios.delete(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/state/${CACHE_STORE}/${key}`
  );
}
```

## Comparing Write-Through with Other Patterns

| Pattern | Consistency | Write Latency | Complexity |
|---|---|---|---|
| Write-Through | High | Higher (dual write) | Medium |
| Write-Behind | Eventually consistent | Lower | Higher |
| Cache-Aside | Medium | Lower | Low |

Write-through is best when read consistency is critical and write latency is acceptable.

## Summary

Write-through caching with Dapr state management ensures the cache stays consistent after every write by updating both the origin and the cache in the same request. Dapr's state API makes the cache write a single HTTP call, keeping the implementation clean. The key tradeoff is additional write latency in exchange for cache correctness that eliminates stale reads.
