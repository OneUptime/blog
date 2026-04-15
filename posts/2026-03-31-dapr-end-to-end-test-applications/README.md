# How to End-to-End Test Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, End-to-End Test, Testing, Multi-App Run, Test Automation

Description: Learn how to write end-to-end tests for Dapr applications that start all services together and verify complete business flows across multiple microservices.

---

## What End-to-End Tests Cover

End-to-end (E2E) tests verify complete business workflows across multiple services. For a Dapr application, this means starting all services with their sidecars, then testing the full flow: place an order, verify inventory was reserved, payment was processed, and the customer received a confirmation.

## Setting Up the E2E Environment

Use Dapr Multi-App Run to start all services:

```yaml
# dapr-e2e.yaml
version: 1
common:
  resourcesPath: ./components/e2e

apps:
  - appID: order-service
    appDirPath: ./order-service
    appPort: 3000
    daprHTTPPort: 3500
    command: ["node", "server.js"]
    env:
      NODE_ENV: e2e

  - appID: inventory-service
    appDirPath: ./inventory-service
    appPort: 3001
    daprHTTPPort: 3501
    command: ["node", "server.js"]

  - appID: payment-service
    appDirPath: ./payment-service
    appPort: 3002
    daprHTTPPort: 3502
    command: ["node", "server.js"]

  - appID: notification-service
    appDirPath: ./notification-service
    appPort: 3003
    daprHTTPPort: 3503
    command: ["node", "server.js"]
```

E2E component with Redis (or in-memory for CI):

```yaml
# components/e2e/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
```

## Writing E2E Tests (Jest / Node.js)

```javascript
// e2e/order-flow.test.js
const axios = require('axios');

const ORDER_SERVICE = 'http://localhost:3000';
const INVENTORY_SERVICE = 'http://localhost:3001';

describe('Order Placement Flow', () => {
  let orderId;

  beforeAll(async () => {
    // Seed inventory
    await axios.post(`${INVENTORY_SERVICE}/inventory/seed`, {
      productId: 'sku-e2e-001',
      stock: 100
    });
  });

  it('places an order successfully', async () => {
    const response = await axios.post(`${ORDER_SERVICE}/orders`, {
      customerId: 'e2e-customer-1',
      items: [{ productId: 'sku-e2e-001', quantity: 2 }],
      paymentMethod: { type: 'card', token: 'tok_test' }
    });

    expect(response.status).toBe(201);
    expect(response.data.orderId).toBeDefined();
    orderId = response.data.orderId;
  });

  it('inventory is reserved after order placement', async () => {
    const response = await axios.get(
      `${INVENTORY_SERVICE}/inventory/sku-e2e-001`
    );
    expect(response.data.available).toBe(98); // 100 - 2 reserved
  });

  it('order status transitions to completed', async () => {
    // Poll for completion (workflow takes a moment)
    let status;
    for (let i = 0; i < 10; i++) {
      const res = await axios.get(`${ORDER_SERVICE}/orders/${orderId}`);
      status = res.data.status;
      if (status === 'Completed') break;
      await new Promise(r => setTimeout(r, 500));
    }
    expect(status).toBe('Completed');
  });
});
```

## Running E2E Tests in CI

```yaml
# .github/workflows/e2e.yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: Install dependencies
      run: npm install

    - name: Install Dapr CLI
      run: wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

    - name: Initialize Dapr
      run: dapr init

    - name: Start all services
      run: dapr run -f dapr-e2e.yaml &

    - name: Wait for services
      run: sleep 10

    - name: Run E2E tests
      run: npm test -- --testPathPattern=e2e

    - name: Stop services
      run: dapr stop -f dapr-e2e.yaml
```

## Teardown and Cleanup

```javascript
afterAll(async () => {
  // Clean up test data from state store
  await axios.delete(`${INVENTORY_SERVICE}/inventory/sku-e2e-001`);
  if (orderId) {
    await axios.delete(`${ORDER_SERVICE}/orders/${orderId}`);
  }
});
```

## Summary

End-to-end testing Dapr applications uses Multi-App Run to start all services and sidecars from a single command. Tests make real HTTP calls across services and verify that the full business flow completes correctly. In CI, dapr init and dapr run provide the same environment as local development, making E2E tests reproducible and reliable.
