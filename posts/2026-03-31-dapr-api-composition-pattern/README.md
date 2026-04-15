# How to Implement API Composition with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Composition, Microservice, Service Invocation, Pattern

Description: Learn how to implement the API Composition pattern with Dapr to aggregate data from multiple microservices into a single cohesive response for clients.

---

## What is API Composition?

The API Composition pattern aggregates data from several downstream microservices into one response. Instead of a client calling five services and stitching results together, a dedicated composer service or API gateway does that work. Dapr's service invocation building block makes this straightforward by providing a uniform way to call any service regardless of where it runs.

## Setting Up the Composer Service

Create a lightweight Node.js service that acts as the composer. It calls three downstream services - `user-service`, `order-service`, and `inventory-service` - and merges their responses:

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || 3500;

function invokeService(appId, method, params = {}) {
  const url = `http://localhost:${DAPR_HTTP_PORT}/v1.0/invoke/${appId}/method/${method}`;
  return axios.get(url, { params });
}

app.get('/customer-dashboard/:userId', async (req, res) => {
  const { userId } = req.params;

  const [userRes, ordersRes, inventoryRes] = await Promise.all([
    invokeService('user-service', `users/${userId}`),
    invokeService('order-service', `orders?userId=${userId}`),
    invokeService('inventory-service', `wishlist/${userId}`)
  ]);

  res.json({
    user: userRes.data,
    recentOrders: ordersRes.data,
    wishlist: inventoryRes.data
  });
});

app.listen(3000);
```

Run the composer alongside Dapr:

```bash
dapr run --app-id composer-service --app-port 3000 -- node composer.js
```

## Handling Partial Failures

Not every downstream service needs to succeed for the composition to be useful. Use `Promise.allSettled` to handle partial failures gracefully:

```javascript
app.get('/customer-dashboard/:userId', async (req, res) => {
  const { userId } = req.params;

  const results = await Promise.allSettled([
    invokeService('user-service', `users/${userId}`),
    invokeService('order-service', `orders?userId=${userId}`),
    invokeService('inventory-service', `wishlist/${userId}`)
  ]);

  const [userResult, ordersResult, inventoryResult] = results;

  res.json({
    user: userResult.status === 'fulfilled' ? userResult.value.data : null,
    recentOrders: ordersResult.status === 'fulfilled' ? ordersResult.value.data : [],
    wishlist: inventoryResult.status === 'fulfilled' ? inventoryResult.value.data : [],
    partial: results.some(r => r.status === 'rejected')
  });
});
```

## Configuring Retries for Downstream Calls

Dapr's resiliency policies protect downstream calls. Create a resiliency spec to retry transient failures:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: composer-resiliency
spec:
  policies:
    retries:
      fast-retry:
        policy: constant
        duration: 200ms
        maxRetries: 3
    timeouts:
      short-timeout: 2s
  targets:
    apps:
      user-service:
        retry: fast-retry
        timeout: short-timeout
      order-service:
        retry: fast-retry
        timeout: short-timeout
```

Apply this manifest in your Kubernetes namespace or place it in your Dapr components folder for self-hosted mode.

## Caching Composed Responses

To avoid hammering downstream services on every request, cache composed results using Dapr state management:

```javascript
async function getCachedDashboard(userId) {
  const stateUrl = `http://localhost:${DAPR_HTTP_PORT}/v1.0/state/redis-statestore/${userId}-dashboard`;
  try {
    const cached = await axios.get(stateUrl);
    if (cached.data) return cached.data;
  } catch (_) {}
  return null;
}

async function cacheDashboard(userId, data) {
  const stateUrl = `http://localhost:${DAPR_HTTP_PORT}/v1.0/state/redis-statestore`;
  await axios.post(stateUrl, [{ key: `${userId}-dashboard`, value: data, metadata: { ttlInSeconds: "60" } }]);
}
```

## Summary

API Composition with Dapr lets you build clean aggregator services without coupling to specific transport protocols or service discovery mechanisms. Dapr provides automatic mTLS encryption and trace context propagation for every downstream call, and supports configurable retry policies through resiliency specs, so the composer only needs to focus on combining the data. Pairing composition with Dapr state management adds caching with minimal extra code.
