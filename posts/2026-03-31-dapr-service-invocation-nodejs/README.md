# How to Use Dapr Service Invocation with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Node.js, Microservice, HTTP

Description: Learn how to use Dapr's Service Invocation API in Node.js to call other microservices with built-in service discovery, retries, and mTLS.

---

## Introduction

Dapr's Service Invocation building block lets microservices call each other by app-id rather than by hostname or IP address. Dapr handles service discovery, load balancing, retries, and mutual TLS encryption automatically.

## Setting Up Client and Server

Install the SDK:

```bash
npm install @dapr/dapr
```

Create a client:

```javascript
const { DaprClient, HttpMethod } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_HTTP_PORT || "3500",
});
```

## Calling Another Service (GET)

Invoke a GET endpoint on the `inventory-service`:

```javascript
async function getInventory(productId) {
  const result = await client.invoker.invoke(
    "inventory-service",       // target app-id
    `stock?productId=${productId}`, // method/path
    HttpMethod.GET
  );
  console.log("Inventory:", result);
  return result;
}
```

## Calling Another Service (POST)

Send a POST request with a body:

```javascript
async function createOrder(orderData) {
  const result = await client.invoker.invoke(
    "order-service",
    "orders",
    HttpMethod.POST,
    orderData
  );
  console.log("Order created:", result);
  return result;
}
```

## Passing Headers

Include custom headers in the invocation:

```javascript
const result = await client.invoker.invoke(
  "auth-service",
  "validate",
  HttpMethod.POST,
  { token: "my-jwt-token" },
  { headers: { "x-correlation-id": "req-abc-123" } }
);
```

## Registering a Handler on the Receiver

On the `inventory-service`, register the invocable handler:

```javascript
const { DaprServer, HttpMethod } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3501" },
});

await server.invoker.listen("stock", async (data) => {
  const productId = data.query?.productId;
  const stock = await db.getStock(productId);
  return { productId, available: stock };
}, { method: HttpMethod.GET });

await server.start();
```

## Running Both Services

```bash
# Start inventory-service
dapr run --app-id inventory-service --app-port 3001 \
  -- node inventory.js

# Start order-service (caller)
dapr run --app-id order-service --app-port 3000 \
  -- node order.js
```

## Configuring Resiliency

Add a resiliency policy to retry failed invocations:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
spec:
  policies:
    retries:
      invocation-retry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 3
  targets:
    apps:
      inventory-service:
        retry: invocation-retry
```

## Summary

Dapr Service Invocation in Node.js replaces hardcoded URLs and custom retry logic with a simple `client.invoker.invoke()` call. Service discovery, load balancing, mTLS, and retries are all managed by Dapr, letting you focus on writing business logic rather than distributed systems plumbing.
