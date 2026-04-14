# How to Invoke Services Using Dapr HTTP API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Service Invocation, API, Microservice

Description: Learn how to invoke other Dapr-enabled services using the Dapr HTTP API, including routing, headers, error handling, and practical curl examples.

---

## How Dapr HTTP Service Invocation Works

Dapr intercepts HTTP calls between services and handles service discovery, retries, and mTLS encryption transparently. Instead of calling a service directly, you call the Dapr sidecar, which routes the request to the target service.

The URL format is:

```yaml
http://localhost:3500/v1.0/invoke/{app-id}/method/{method-name}
```

## Basic Service Invocation Example

Assume you have a service with app ID `order-service` that exposes a `POST /orders` endpoint.

From another service, invoke it via Dapr:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/orders \
  -H "Content-Type: application/json" \
  -d '{"item": "widget", "qty": 5}'
```

Dapr resolves `order-service` using its name resolution component and forwards the request.

## Using GET, PUT, and DELETE

```bash
# GET request
curl http://localhost:3500/v1.0/invoke/inventory-service/method/items/42

# PUT request
curl -X PUT http://localhost:3500/v1.0/invoke/user-service/method/users/123 \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# DELETE request
curl -X DELETE http://localhost:3500/v1.0/invoke/cart-service/method/carts/789
```

## Passing Query Parameters

Append query parameters to the method path:

```bash
curl "http://localhost:3500/v1.0/invoke/search-service/method/search?q=dapr&limit=10"
```

## Calling from Node.js

```javascript
const axios = require('axios');

async function createOrder() {
  const response = await axios.post(
    'http://localhost:3500/v1.0/invoke/order-service/method/orders',
    { item: 'widget', qty: 5 },
    { headers: { 'Content-Type': 'application/json' } }
  );

  console.log(response.data);
}

createOrder();
```

## Handling Errors

Dapr propagates HTTP status codes from the target service. Non-2xx responses indicate failure:

```bash
# 400 - method name not given
# 403 - invocation forbidden by access control
# 500 - request failed (e.g., app-id not found or target service error)
```

Always check the response status in your code:

```javascript
try {
  const res = await axios.post('http://localhost:3500/v1.0/invoke/order-service/method/orders', data);
} catch (err) {
  if (err.response?.status === 404) {
    console.error('Service or method not found');
  }
}
```

## Summary

Use the Dapr HTTP API at `http://localhost:3500/v1.0/invoke/{app-id}/method/{method}` to invoke services by name. Dapr handles service discovery, load balancing, retries, and mTLS automatically. All standard HTTP methods and query parameters are supported.
