# How to Implement Event Enrichment with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Enrichment, Pub/Sub, Service Invocation, Pipeline

Description: Enrich Dapr pub/sub events with additional context by fetching data from state stores and external services before re-publishing enhanced events downstream.

---

## Overview

Event enrichment adds contextual data to raw events before they reach downstream consumers. With Dapr, you can build enrichment pipelines that subscribe to raw events, augment them with data from state stores or service invocations, and publish enriched events to new topics.

## Basic Enrichment Pipeline

Subscribe to raw events, enrich with user data, and republish:

```javascript
const { DaprServer, DaprClient, HttpMethod } = require('@dapr/dapr');
const server = new DaprServer();
const client = new DaprClient();

await server.pubsub.subscribe('pubsub', 'raw-orders', async (rawOrder) => {
  // Fetch user profile from state store
  const user = await client.state.get('statestore', `user-${rawOrder.userId}`);

  // Fetch product details via service invocation
  const product = await client.invoker.invoke(
    'catalog-service',
    `products/${rawOrder.productId}`,
    HttpMethod.GET
  );

  // Enrich the event
  const enrichedOrder = {
    ...rawOrder,
    user: user ? {
      name: user.name,
      email: user.email,
      tier: user.tier || 'standard'
    } : null,
    product: {
      name: product.name,
      category: product.category,
      weight: product.weight
    },
    enrichedAt: Date.now()
  };

  // Publish enriched event downstream
  await client.pubsub.publish('pubsub', 'enriched-orders', enrichedOrder);
  console.log(`Enriched order ${rawOrder.orderId}`);
});
```

## Enrichment with Caching

Cache enrichment data to reduce service invocation overhead:

```javascript
async function getEnrichedProductData(productId) {
  const cacheKey = `product-cache-${productId}`;

  // Check cache first
  const cached = await client.state.get('statestore', cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from catalog service
  const product = await client.invoker.invoke('catalog-service', `products/${productId}`, HttpMethod.GET);

  // Cache for 5 minutes
  await client.state.save('statestore', [{
    key: cacheKey,
    value: product,
    metadata: { ttlInSeconds: '300' }
  }]);

  return product;
}
```

## Chained Enrichment with Multiple Services

Build a pipeline that enriches an event with data from multiple sources:

```javascript
async function enrichOrderEvent(rawOrder) {
  const [user, product, inventory, shipping] = await Promise.all([
    client.invoker.invoke('user-service', `users/${rawOrder.userId}`, HttpMethod.GET),
    client.invoker.invoke('catalog-service', `products/${rawOrder.productId}`, HttpMethod.GET),
    client.invoker.invoke('inventory-service', `stock/${rawOrder.productId}`, HttpMethod.GET),
    client.invoker.invoke('shipping-service', `rates/${rawOrder.destination}`, HttpMethod.GET)
  ]);

  return {
    ...rawOrder,
    userTier: user.tier,
    productCategory: product.category,
    stockAvailable: inventory.quantity > 0,
    estimatedDelivery: shipping.estimatedDays,
    enrichedAt: new Date().toISOString()
  };
}
```

## Error Handling in Enrichment

Handle partial enrichment failures gracefully:

```javascript
async function safeEnrich(rawOrder) {
  const enriched = { ...rawOrder };

  try {
    const user = await client.invoker.invoke('user-service', `users/${rawOrder.userId}`, HttpMethod.GET);
    enriched.userTier = user.tier;
  } catch (err) {
    console.warn(`Failed to enrich user data for ${rawOrder.userId}:`, err.message);
    enriched.userTier = 'unknown';
  }

  enriched.enrichmentStatus = 'partial';
  return enriched;
}
```

## Summary

Event enrichment with Dapr transforms raw events into information-rich messages by combining pub/sub subscriptions with state store lookups and service invocations. Use parallel enrichment with `Promise.all` for performance, add caching with TTL-enabled state entries to reduce load on upstream services, and always handle enrichment failures gracefully to prevent blocking the pipeline.
