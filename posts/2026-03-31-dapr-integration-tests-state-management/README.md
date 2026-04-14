# How to Set Up Integration Tests for Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, State Management, Integration Test, JavaScript

Description: Write integration tests for Dapr state management that use real state store backends to verify save, get, delete, and transactional state operations end-to-end.

---

Mocking the Dapr state management API in unit tests is straightforward, but integration tests that run against a real state store catch serialization issues, TTL behavior, concurrency conflicts, and ETag mismatches that mocks cannot simulate.

## Test Setup with Redis

Redis is the most common Dapr state store and runs easily in Docker for local testing.

```yaml
# docker-compose.state-test.yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3500:3500"
    environment:
      - DAPR_HTTP_PORT=3500
    depends_on:
      - redis

  app-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "-app-id"
      - "state-test-app"
      - "-components-path"
      - "/components"
      - "-log-level"
      - "error"
    volumes:
      - ./components:/components
    network_mode: "service:app"
```

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: keyPrefix
      value: "integration-test"
```

## Basic CRUD Integration Test

```javascript
// state.integration.test.js
const axios = require('axios');

const DAPR_URL = 'http://localhost:3500';
const STORE = 'statestore';

async function waitForDapr() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await axios.get(`${DAPR_URL}/v1.0/healthz`);
      if (r.status === 204) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Dapr not ready');
}

beforeAll(async () => {
  await waitForDapr();
});

test('save and retrieve state', async () => {
  const key = 'test-order-1';
  const value = { orderId: key, amount: 100 };

  await axios.post(`${DAPR_URL}/v1.0/state/${STORE}`, [
    { key, value }
  ]);

  const resp = await axios.get(`${DAPR_URL}/v1.0/state/${STORE}/${key}`);
  expect(resp.data).toEqual(value);
});

test('delete state', async () => {
  const key = 'test-order-delete';
  await axios.post(`${DAPR_URL}/v1.0/state/${STORE}`, [
    { key, value: { data: 'to-delete' } }
  ]);

  await axios.delete(`${DAPR_URL}/v1.0/state/${STORE}/${key}`);

  const resp = await axios.get(`${DAPR_URL}/v1.0/state/${STORE}/${key}`);
  expect(resp.status).toBe(204); // Key not found = 204 in Dapr
});
```

## Testing ETags and Optimistic Concurrency

```javascript
test('ETag optimistic concurrency', async () => {
  const key = 'concurrent-key';
  await axios.post(`${DAPR_URL}/v1.0/state/${STORE}`, [
    { key, value: { version: 1 } }
  ]);

  const resp = await axios.get(`${DAPR_URL}/v1.0/state/${STORE}/${key}`);
  const etag = resp.headers['etag'];

  // Update with correct ETag - should succeed
  await axios.post(`${DAPR_URL}/v1.0/state/${STORE}`, [
    { key, value: { version: 2 }, etag, options: { concurrency: 'first-write' } }
  ]);

  // Update with old ETag - should fail
  try {
    await axios.post(`${DAPR_URL}/v1.0/state/${STORE}`, [
      { key, value: { version: 3 }, etag, options: { concurrency: 'first-write' } }
    ]);
    fail('Should have thrown');
  } catch (err) {
    expect(err.response.status).toBe(409);
  }
});
```

## Testing Transactions

```javascript
test('transactional state operations', async () => {
  await axios.post(`${DAPR_URL}/v1.0/state/${STORE}/transaction`, {
    operations: [
      { operation: 'upsert', request: { key: 'tx-a', value: { x: 1 } } },
      { operation: 'upsert', request: { key: 'tx-b', value: { x: 2 } } },
    ]
  });

  const a = await axios.get(`${DAPR_URL}/v1.0/state/${STORE}/tx-a`);
  const b = await axios.get(`${DAPR_URL}/v1.0/state/${STORE}/tx-b`);
  expect(a.data.x).toBe(1);
  expect(b.data.x).toBe(2);
});
```

## Cleanup Between Tests

Add a cleanup step to remove test keys so tests do not interfere with each other:

```javascript
afterEach(async () => {
  const keys = ['test-order-1', 'concurrent-key', 'tx-a', 'tx-b'];
  await Promise.all(keys.map(k =>
    axios.delete(`${DAPR_URL}/v1.0/state/${STORE}/${k}`).catch(() => {})
  ));
});
```

## Summary

Integration tests for Dapr state management verify the full save-get-delete cycle, optimistic concurrency with ETags, and transactional operations against a real backend. These tests catch serialization errors and concurrency issues that unit tests with mocked Dapr clients cannot detect.
