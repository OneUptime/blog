# How to Use Dapr Service Invocation for Synchronous Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Synchronous, Service Invocation, HTTP, Microservice

Description: Learn when and how to use Dapr synchronous service invocation for real-time request processing, comparing it to async pub/sub and choosing the right pattern.

---

## Synchronous vs. Asynchronous Communication

Dapr supports two main communication patterns:

| Pattern | Use Case | Dapr Feature |
|---------|----------|--------------|
| Synchronous | User-facing APIs, real-time queries | Service Invocation |
| Asynchronous | Background processing, decoupled workflows | Pub/Sub |

Use synchronous invocation when:
- The caller needs an immediate result
- The operation must complete before continuing
- You are building request-response APIs

## Setting Up a Synchronous Service

```javascript
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Synchronous handler - responds immediately
app.post('/calculate-price', async (req, res) => {
  const { items } = req.body;

  let total = 0;
  for (const item of items) {
    // Call pricing-service synchronously
    const price = await axios.get(
      `http://localhost:3500/v1.0/invoke/pricing-service/method/prices/${item.sku}`
    );
    total += price.data.amount * item.qty;
  }

  res.json({ total, currency: 'USD' });
});

app.listen(3000);
```

## Chained Synchronous Calls

For a checkout flow requiring multiple synchronous steps:

```javascript
async function checkout(cartId, userId) {
  // Step 1: Get cart contents
  const cart = await axios.get(
    `http://localhost:3500/v1.0/invoke/cart-service/method/carts/${cartId}`
  );

  // Step 2: Reserve inventory
  const reservation = await axios.post(
    'http://localhost:3500/v1.0/invoke/inventory-service/method/reserve',
    { items: cart.data.items }
  );

  // Step 3: Process payment
  const payment = await axios.post(
    'http://localhost:3500/v1.0/invoke/payment-service/method/charge',
    { userId, amount: cart.data.total, reservationId: reservation.data.id }
  );

  return { orderId: payment.data.orderId };
}
```

## Avoiding Synchronous Call Chains

Deep synchronous chains increase latency and create tight coupling. Refactor fan-out calls to run in parallel:

```javascript
// Bad - sequential synchronous calls
const a = await invoke('service-a', 'getData');
const b = await invoke('service-b', 'getData');
const c = await invoke('service-c', 'getData');

// Good - parallel synchronous calls
const [a, b, c] = await Promise.all([
  invoke('service-a', 'getData'),
  invoke('service-b', 'getData'),
  invoke('service-c', 'getData'),
]);
```

## Configuring Synchronous Timeouts

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: checkout-resiliency
spec:
  policies:
    timeouts:
      checkoutTimeout: 3s
  targets:
    apps:
      payment-service:
        timeout: checkoutTimeout
```

## When to Switch to Async

Switch from synchronous to async when:
- Processing takes more than 5 seconds
- The operation is retryable and idempotent
- You need guaranteed delivery
- The caller does not need the result immediately

```javascript
// Convert slow sync to async with acknowledgment
app.post('/process-report', async (req, res) => {
  const jobId = uuidv4();
  await daprClient.pubsub.publish('pubsub', 'report-jobs', { ...req.body, jobId });
  res.status(202).json({ jobId, message: 'Processing started' });
});
```

## Summary

Dapr synchronous service invocation is ideal for user-facing APIs and real-time queries where the caller needs an immediate result. Keep synchronous chains shallow by running independent calls in parallel. For operations that take longer than a few seconds or require guaranteed delivery, switch to the Dapr pub/sub async pattern.
