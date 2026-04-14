# How to Migrate from Direct HTTP Calls to Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, HTTP, Migration, Resilience

Description: Learn how to replace hardcoded HTTP service-to-service calls with Dapr Service Invocation to gain automatic retries, mTLS, and service discovery.

---

## The Problem with Direct HTTP Calls

When Service A calls Service B directly, you hardcode the hostname or rely on DNS. You write retry loops manually. There is no mutual TLS by default. Dapr Service Invocation solves all three: it routes through the sidecar, provides automatic retries, and enforces mTLS between sidecars.

## Before: Direct axios/fetch Calls

```javascript
// order-service/src/inventoryClient.js
const axios = require('axios');

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL
  || 'http://inventory-service:8080';

async function checkInventory(productId, quantity) {
  const response = await axios.get(
    `${INVENTORY_URL}/inventory/${productId}`,
    {
      params: { quantity },
      timeout: 5000
    }
  );
  return response.data;
}

async function reserveInventory(orderId, items) {
  const response = await axios.post(
    `${INVENTORY_URL}/reservations`,
    { orderId, items },
    { timeout: 5000 }
  );
  return response.data;
}
```

## After: Dapr Service Invocation

Route through the Dapr sidecar using the `v1.0/invoke` endpoint:

```javascript
// order-service/src/inventoryClient.js
const axios = require('axios');

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || 3500;
const DAPR_BASE = `http://localhost:${DAPR_HTTP_PORT}`;

async function checkInventory(productId, quantity) {
  const response = await axios.get(
    `${DAPR_BASE}/v1.0/invoke/inventory-service/method/inventory/${productId}`,
    { params: { quantity } }
  );
  return response.data;
}

async function reserveInventory(orderId, items) {
  const response = await axios.post(
    `${DAPR_BASE}/v1.0/invoke/inventory-service/method/reservations`,
    { orderId, items }
  );
  return response.data;
}
```

## Using the Dapr SDK

The JavaScript SDK wraps the HTTP call cleanly:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient({
  daprHost: 'localhost',
  daprPort: process.env.DAPR_HTTP_PORT || '3500'
});

async function checkInventory(productId, quantity) {
  return await client.invoker.invoke(
    'inventory-service',
    `inventory/${productId}?quantity=${quantity}`,
    'GET'
  );
}

async function reserveInventory(orderId, items) {
  return await client.invoker.invoke(
    'inventory-service',
    'reservations',
    'POST',
    { orderId, items }
  );
}
```

## Enabling Resiliency

Add a resiliency policy so Dapr automatically retries on network failures:

```yaml
# components/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
spec:
  policies:
    retries:
      DefaultRetry:
        policy: constant
        duration: 1s
        maxRetries: 3
    timeouts:
      DefaultTimeout: 5s
  targets:
    apps:
      inventory-service:
        retry: DefaultRetry
        timeout: DefaultTimeout
```

## Running the Services

```bash
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- node server.js
```

```bash
dapr run \
  --app-id inventory-service \
  --app-port 3001 \
  --dapr-http-port 3501 \
  --resources-path ./components \
  -- node inventory.js
```

## Summary

Replacing direct HTTP calls with Dapr Service Invocation requires only changing the URL in your HTTP client to route through the local Dapr sidecar. You gain automatic retries via resiliency policies, mTLS between sidecars in Kubernetes, and service discovery without hardcoded hostnames. The Dapr SDK simplifies this further with typed invocation helpers.
