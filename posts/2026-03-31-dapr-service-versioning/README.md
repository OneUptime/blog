# How to Implement Service Versioning with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Versioning, Service Invocation, Deployment, Strategy

Description: Learn how to implement service versioning with Dapr using app IDs, path-based versions, and canary deployments for zero-downtime service upgrades.

---

## Overview

Service versioning with Dapr allows you to run multiple versions of a service simultaneously, route traffic between them, and migrate consumers incrementally. Dapr's app ID system and service invocation model provide natural hooks for versioning strategies.

## Strategy 1: App ID Based Versioning

Run two versions as separate Dapr apps with different app IDs:

```yaml
# v1 deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service-v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: catalog-service
      version: v1
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "catalog-service-v1"
        dapr.io/app-port: "8080"
      labels:
        app: catalog-service
        version: v1
    spec:
      containers:
        - name: catalog-service
          image: myregistry/catalog-service:1.5.0
```

```yaml
# v2 deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: catalog-service
      version: v2
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "catalog-service-v2"
        dapr.io/app-port: "8080"
      labels:
        app: catalog-service
        version: v2
    spec:
      containers:
        - name: catalog-service
          image: myregistry/catalog-service:2.0.0
```

Callers invoke the specific version explicitly:

```javascript
// Call v2 for new features
const response = await daprClient.invoker.invoke(
  'catalog-service-v2',
  'products/list',
  HttpMethod.GET
);
```

## Strategy 2: Path-Based Versioning Within an App

Handle multiple API versions within a single Dapr service:

```javascript
const express = require('express');
const app = express();

// v1 endpoint
app.get('/v1/products', (req, res) => {
  const products = getProductsV1();
  res.json(products);
});

// v2 endpoint with enhanced response
app.get('/v2/products', (req, res) => {
  const products = getProductsV2();
  res.json({ data: products, pagination: getPagination(req) });
});

// Default to latest version
app.get('/products', (req, res) => {
  res.redirect('/v2/products');
});
```

Call the version via Dapr service invocation:

```bash
# Call v1
curl http://localhost:3500/v1.0/invoke/catalog-service/method/v1/products

# Call v2
curl http://localhost:3500/v1.0/invoke/catalog-service/method/v2/products
```

## Strategy 3: Canary Deployment with Dapr

Run both versions with the same Dapr app ID so that Dapr's name resolution discovers all pods and round-robins traffic across them. Traffic percentage is controlled by replica counts:

```yaml
# v1 canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service-v1
spec:
  replicas: 9
  selector:
    matchLabels:
      app: catalog-service
      version: v1
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "catalog-service"
        dapr.io/app-port: "8080"
      labels:
        app: catalog-service
        version: v1
    spec:
      containers:
        - name: catalog-service
          image: myregistry/catalog-service:1.5.0
---
# v2 canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: catalog-service
      version: v2
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "catalog-service"
        dapr.io/app-port: "8080"
      labels:
        app: catalog-service
        version: v2
    spec:
      containers:
        - name: catalog-service
          image: myregistry/catalog-service:2.0.0
```

Because both deployments share the same `dapr.io/app-id`, Dapr automatically discovers all pods through its internal headless service and distributes traffic via round-robin. Control the traffic split by scaling replica counts:

```bash
# 10% canary - 1 v2 replica vs 9 v1 replicas
kubectl scale deployment catalog-service-v1 --replicas=9
kubectl scale deployment catalog-service-v2 --replicas=1

# 50/50 split
kubectl scale deployment catalog-service-v1 --replicas=5
kubectl scale deployment catalog-service-v2 --replicas=5
```

## Migrating Pub/Sub Consumers Between Versions

Use separate topic subscriptions for different versions:

```yaml
# v1 subscription
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-v1
spec:
  topic: orders
  pubsubname: pubsub
  routes:
    default: /orders/v1/handle

---
# v2 subscription (migrating consumers)
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-v2
spec:
  topic: orders-v2
  pubsubname: pubsub
  routes:
    default: /orders/v2/handle
```

## Monitoring Version Traffic

Track which version is receiving traffic using Dapr metrics:

```bash
# Requests per app_id version
sum(rate(dapr_http_server_request_count[5m])) by (app_id)
# catalog-service-v1: 45 req/s
# catalog-service-v2: 5 req/s
```

## Summary

Service versioning with Dapr can be implemented through app ID separation (running v1 and v2 as distinct Dapr services), path-based versioning within a single service, or canary deployments using Kubernetes replica scaling. Choose the strategy that matches your migration complexity - app ID separation gives the most isolation, path-based versioning is simpler for gradual API evolution, and canary deployments work well for testing rollout stability.
