# How to Implement Request-Reply Patterns with Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Request-Reply, Pattern, Service Invocation, Microservice

Description: Learn how to implement synchronous request-reply communication patterns between Dapr microservices, including correlation IDs, response routing, and timeout handling.

---

## What Is the Request-Reply Pattern?

The request-reply pattern is a synchronous communication model where a caller sends a request and waits for a response from a specific service. It is the simplest and most natural pattern for synchronous microservice communication.

Dapr service invocation is built for this pattern.

## Basic Request-Reply

```javascript
// Requester (client-service)
const axios = require('axios');

async function getOrderStatus(orderId) {
  const response = await axios.get(
    `http://localhost:3500/v1.0/invoke/order-service/method/orders/${orderId}`
  );
  return response.data;
}
```

```javascript
// Responder (order-service)
app.get('/orders/:id', async (req, res) => {
  const order = await db.getOrder(req.params.id);
  res.json({ id: order.id, status: order.status, total: order.total });
});
```

## Correlation IDs for Request Tracking

Always pass a correlation ID to trace requests across services:

```javascript
const { v4: uuidv4 } = require('uuid');

async function placeOrder(item, qty) {
  const correlationId = uuidv4();
  const response = await axios.post(
    'http://localhost:3500/v1.0/invoke/order-service/method/orders',
    { item, qty },
    {
      headers: {
        'X-Correlation-ID': correlationId,
        'Content-Type': 'application/json',
      }
    }
  );
  console.log(`Order placed. Correlation: ${correlationId}, Order: ${response.data.id}`);
  return response.data;
}
```

```javascript
// order-service logs the correlation ID
app.post('/orders', (req, res) => {
  const correlationId = req.headers['x-correlation-id'];
  console.log(`Processing order [${correlationId}]`);
  // process and respond
  res.json({ id: newOrderId, correlationId });
});
```

## Async Request-Reply via Pub/Sub

For long-running operations, use async request-reply with pub/sub:

```javascript
// Client sends request with a reply-to topic
await daprClient.pubsub.publish('pubsub', 'order-requests', {
  item: 'widget',
  qty: 5,
  replyTopic: `order-replies-${clientId}`,
  correlationId: uuidv4(),
});

// Subscribe to the reply topic (subscriptions use DaprServer, not DaprClient)
await daprServer.pubsub.subscribe('pubsub', `order-replies-${clientId}`, async (data) => {
  console.log('Order result:', data);
});
```

## Timeout Handling

```javascript
async function invokeWithTimeout(appId, method, data, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await axios.post(
      `http://localhost:3500/v1.0/invoke/${appId}/method/${method}`,
      data,
      { signal: controller.signal }
    );
    return response.data;
  } catch (err) {
    if (err.code === 'ERR_CANCELED') throw new Error(`Request to ${appId}/${method} timed out`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
```

## Scatter-Gather Pattern

Fan out requests to multiple services and collect responses:

```javascript
const [inventory, pricing, reviews] = await Promise.all([
  axios.get(`http://localhost:3500/v1.0/invoke/inventory-service/method/items/${sku}`),
  axios.get(`http://localhost:3500/v1.0/invoke/pricing-service/method/prices/${sku}`),
  axios.get(`http://localhost:3500/v1.0/invoke/review-service/method/reviews/${sku}`),
]);
```

## Summary

Dapr service invocation naturally implements the request-reply pattern through synchronous HTTP calls. Use correlation IDs in headers to trace requests, implement timeouts to avoid hanging callers, and consider async request-reply with pub/sub for long-running operations. The scatter-gather pattern uses `Promise.all` to fan out requests to multiple services in parallel.
