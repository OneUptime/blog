# How to Handle Errors in Dapr JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Error Handling, JavaScript, Node.js, Resilience

Description: Learn how to handle errors, timeouts, and retries in the Dapr JavaScript SDK for building resilient Node.js microservices.

---

## Introduction

Network failures, timeouts, and unavailable services are realities in distributed systems. The Dapr JavaScript SDK throws errors that you can catch and handle with retry logic, fallbacks, and circuit-breaker patterns to build resilient Node.js services.

## Basic Error Handling

Wrap Dapr calls in try-catch blocks:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({ daprHost: "http://localhost", daprPort: "3500" });

async function getOrder(orderId) {
  try {
    const order = await client.state.get("statestore", orderId);
    return order;
  } catch (err) {
    console.error("Failed to get order:", err.message);
    console.error("Error code:", err.code);
    return null;
  }
}
```

## Identifying Error Types

Dapr SDK errors carry a message and an HTTP/gRPC status code:

```javascript
async function saveOrderSafe(order) {
  try {
    await client.state.save("statestore", [{ key: order.id, value: order }]);
  } catch (err) {
    if (err.message.includes("state store") || err.code === 500) {
      console.error("State store unavailable, queuing for retry:", err.message);
      await queueForRetry(order);
    } else {
      throw err; // re-throw unexpected errors
    }
  }
}
```

## Retry with Exponential Backoff

Implement a simple retry utility:

```javascript
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 200) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Usage
const order = await withRetry(() =>
  client.state.get("statestore", "order-123")
);
```

## Timeout Handling

Wrap calls with a timeout using `Promise.race`:

```javascript
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function getOrderWithTimeout(orderId) {
  try {
    return await withTimeout(
      client.state.get("statestore", orderId),
      3000  // 3 second timeout
    );
  } catch (err) {
    if (err.message.includes("timed out")) {
      console.error("State store timeout, returning cached value");
      return cache.get(orderId) ?? null;
    }
    throw err;
  }
}
```

## Dapr Resiliency Policies

Define server-side retry and circuit-breaker policies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
spec:
  policies:
    retries:
      state-retry:
        policy: exponential
        maxInterval: 5s
        maxRetries: 3
    circuitBreakers:
      state-cb:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    components:
      statestore:
        outbound:
          retry: state-retry
          circuitBreaker: state-cb
```

## Handling Pub/Sub Errors

Return retry/drop status from subscription handlers:

```javascript
const { DaprPubSubStatusEnum } = require("@dapr/dapr");

await server.pubsub.subscribe("pubsub", "orders", async (data) => {
  try {
    await processOrder(data);
    return DaprPubSubStatusEnum.SUCCESS;
  } catch (err) {
    console.error("Order processing failed:", err.message);
    // Signal Dapr to redeliver the message
    return DaprPubSubStatusEnum.RETRY;
  }
});
```

## Summary

Resilient error handling in Dapr Node.js applications combines application-level try-catch and retry logic with Dapr's server-side resiliency policies. Use explicit error catching for fallbacks and custom retry logic, and rely on Dapr ResiliencyPolicy for infrastructure-level retries and circuit breaking to avoid cascading failures across services.
