# How to Implement Serverless API with Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Serverless, API, Kubernetes

Description: Build serverless API backends using Dapr service invocation with Knative or KEDA for scale-to-zero, load balancing, and automatic retry on the API layer.

---

## Serverless APIs with Dapr Service Invocation

Dapr's service invocation building block provides service discovery, load balancing, retries, and distributed tracing for inter-service calls. When applied to serverless API patterns on Kubernetes, it replaces the need for a service mesh while enabling scale-to-zero with Knative or KEDA.

## Architecture

```text
Client -> API Gateway -> Dapr Sidecar
                              |
                    Service Discovery (Kubernetes DNS)
                              |
                    Target Service Sidecar (scale 0->N)
                              |
                         Target App
```

## Setting Up a Serverless API Service

Deploy a Node.js API backend with Knative and Dapr:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: product-api
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "product-api"
        dapr.io/app-port: "3000"
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "50"
        autoscaling.knative.dev/target: "10"  # 10 concurrent requests per pod
    spec:
      containers:
        - image: myorg/product-api:latest
          ports:
            - containerPort: 3000
```

## Product API Service

```javascript
// product-api/server.js
const express = require('express');
const app = express();
app.use(express.json());

// Get product details
app.get('/product/:id', async (req, res) => {
  const { id } = req.params;

  // Use Dapr state store for product data
  const response = await fetch(
    `http://localhost:3500/v1.0/state/statestore/product:${id}`
  );

  if (response.status === 204) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await response.json();
  res.json(product);
});

// Create a product
app.post('/product', async (req, res) => {
  const product = { ...req.body, id: crypto.randomUUID(), createdAt: new Date() };

  await fetch('http://localhost:3500/v1.0/state/statestore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ key: `product:${product.id}`, value: product }])
  });

  res.status(201).json(product);
});

app.listen(3000);
```

## Calling the Serverless API via Dapr

From another service, invoke the product API using Dapr service invocation:

```go
// Go - invoke product API via Dapr
package main

import (
    "context"
    "encoding/json"

    dapr "github.com/dapr/go-sdk/client"
)

func getProduct(productId string) (*Product, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    // Dapr handles discovery, retries, mTLS, and tracing
    resp, err := client.InvokeMethod(
        context.Background(),
        "product-api",        // Dapr app-id (Knative service name)
        "product/"+productId, // Method path
        "get",
    )
    if err != nil {
        return nil, err
    }

    var product Product
    json.Unmarshal(resp, &product)
    return &product, nil
}
```

## Resiliency for Serverless APIs

Configure retry policies for cold start handling:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: serverless-resiliency
spec:
  policies:
    retries:
      coldStartRetry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 5
        duration: 1s   # Start retrying after 1s (cold start typically < 5s)

    timeouts:
      serverlessTimeout: 30s  # Generous timeout for cold starts

  targets:
    apps:
      product-api:
        timeout: serverlessTimeout
        retry: coldStartRetry
```

## API Gateway Integration

Expose the Dapr-invoked services through an API Gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-gateway
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /products
      route:
        - destination:
            host: dapr-api-proxy
            port:
              number: 3500
```

## Summary

Dapr service invocation combined with Knative Serving creates a serverless API pattern where backend services scale to zero between requests and scale up automatically under load. Dapr handles service discovery, mTLS, retries, and distributed tracing transparently - while Knative manages the scale-to-zero lifecycle. Resiliency policies account for cold start latency with generous timeouts and automatic retries.
