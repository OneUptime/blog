# How to Implement API Caching with Dapr and API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Caching, API, Gateway, Performance

Description: Learn how to implement API response caching for Dapr microservices using API gateway plugins and Dapr state store caching to reduce latency and backend load.

---

## Overview

Caching API responses at the gateway layer reduces latency, lowers backend load, and improves throughput for read-heavy Dapr microservices. You can implement caching at the API gateway using plugins or inside your Dapr services using the state store API.

## Gateway-Level Caching with Kong

Kong's proxy cache plugin caches responses in memory or Redis:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: response-cache
plugin: proxy-cache
config:
  response_code:
    - 200
    - 301
  request_method:
    - GET
    - HEAD
  content_type:
    - application/json
  cache_ttl: 300
  strategy: memory
```

Attach to a specific service route:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: product-ingress
  annotations:
    konghq.com/plugins: "response-cache"
spec:
  ingressClassName: kong
  rules:
    - http:
        paths:
          - path: /products
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 3500
```

## Redis-Backed Caching for Distributed Deployments

For multi-node gateway deployments, use Redis as the cache backend. Note that the Redis strategy requires the `proxy-cache-advanced` plugin (Kong Enterprise), not the open-source `proxy-cache` plugin:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: response-cache
plugin: proxy-cache-advanced
config:
  strategy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
    database: 0
  cache_ttl: 600
  cache_control: true
```

## Application-Level Caching with Dapr State Store

Cache expensive computation results inside your service using the Dapr state API:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function getProductCached(productId) {
  const cacheKey = `product:${productId}`;

  // Try cache first
  const cached = await client.state.get('redis-statestore', cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const product = await fetchFromDatabase(productId);

  // Store in cache with TTL via metadata
  await client.state.save('redis-statestore', [
    {
      key: cacheKey,
      value: JSON.stringify(product),
      metadata: {
        ttlInSeconds: '300'
      }
    }
  ]);

  return product;
}
```

## Cache Invalidation via Pub/Sub

When a product is updated, invalidate the cache using a Dapr pub/sub event:

```javascript
// Publisher - on product update
await client.pubsub.publish('pubsub', 'product-updated', {
  productId: '123',
  action: 'invalidate-cache'
});

// Subscriber - cache invalidation handler
app.post('/product-updated', async (req, res) => {
  const { productId } = req.body.data;
  await client.state.delete('redis-statestore', `product:${productId}`);
  console.log(`Cache invalidated for product ${productId}`);
  res.sendStatus(200);
});
```

## Verifying Cache Hits with Kong

Kong adds `X-Cache-Status` headers to responses. Check for cache hits:

```bash
# First request - cache miss
curl -v http://api.example.com/products/123 2>&1 | grep "X-Cache-Status"
# X-Cache-Status: Miss

# Second request - cache hit
curl -v http://api.example.com/products/123 2>&1 | grep "X-Cache-Status"
# X-Cache-Status: Hit
```

## Setting Cache-Control Headers in Your Dapr Service

Instruct the gateway to respect your service's caching directives:

```javascript
app.get('/products/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  res.set('Cache-Control', 'public, max-age=300');
  res.set('ETag', `"${product.version}"`);
  res.json(product);
});
```

## Summary

API caching for Dapr microservices works best as a layered strategy: gateway-level caching with Kong or NGINX handles repeated identical requests efficiently, while application-level caching using the Dapr state store handles business-logic-aware cache management. Combining these with pub/sub-driven cache invalidation gives you a robust, distributed caching architecture.
