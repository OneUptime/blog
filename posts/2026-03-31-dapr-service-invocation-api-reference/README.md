# How to Use the Dapr Service Invocation API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, API, REST, gRPC

Description: A practical reference for the Dapr Service Invocation API covering HTTP and gRPC invocation, namespaces, resiliency, and headers.

---

## Overview

The Dapr Service Invocation API enables direct service-to-service calls through the Dapr sidecar. The sidecar handles service discovery, mTLS encryption, automatic retries, and distributed tracing. Applications make calls as simple HTTP or gRPC requests without needing to know the target service's IP or port.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0/invoke/{appId}/method/{methodName}
```

## Basic HTTP GET Invocation

```bash
curl http://localhost:3500/v1.0/invoke/inventory-service/method/items
```

## POST Invocation with Body

```bash
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod-123", "quantity": 2}'
```

## PUT and DELETE

```bash
# Update a resource
curl -X PUT http://localhost:3500/v1.0/invoke/product-service/method/products/prod-123 \
  -H "Content-Type: application/json" \
  -d '{"price": 29.99}'

# Delete a resource
curl -X DELETE http://localhost:3500/v1.0/invoke/product-service/method/products/prod-old
```

## Invoking Across Namespaces

When calling a service in a different Kubernetes namespace:

```bash
curl http://localhost:3500/v1.0/invoke/order-service.production/method/orders
```

The format is `{appId}.{namespace}`.

## Passing Custom Headers

Custom headers are forwarded to the target application:

```bash
curl http://localhost:3500/v1.0/invoke/user-service/method/profile \
  -H "X-Correlation-ID: req-abc-123" \
  -H "X-User-ID: user-456"
```

## Query Parameters

Query parameters are passed through transparently:

```bash
curl "http://localhost:3500/v1.0/invoke/product-service/method/products?category=electronics&limit=10"
```

## Using the SDK

```javascript
const { DaprClient, HttpMethod } = require("@dapr/dapr");
const client = new DaprClient();

// GET
const products = await client.invoker.invoke(
  "product-service",
  "products",
  HttpMethod.GET
);

// POST
const order = await client.invoker.invoke(
  "order-service",
  "orders",
  HttpMethod.POST,
  { productId: "prod-123", quantity: 2 }
);
```

## Configuring Resiliency

Apply retry and timeout policies with a Resiliency resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: invocation-resiliency
spec:
  policies:
    retries:
      retryThrice:
        policy: constant
        maxRetries: 3
        duration: 1s
    timeouts:
      short: 5s
  targets:
    apps:
      order-service:
        timeout: short
        retry: retryThrice
```

## Response Codes

| Status | Meaning |
|---|---|
| XXX | Upstream status returned from target app |
| 400 | Method name not given |
| 403 | Invocation forbidden by access control |
| 500 | Request failed or target app unreachable |

## Summary

The Dapr Service Invocation API provides a location-transparent HTTP and gRPC proxy for service-to-service calls. All calls get automatic mTLS, distributed tracing headers, and optional resiliency policies. The namespace-aware routing format makes cross-namespace calls in Kubernetes straightforward without additional configuration.
