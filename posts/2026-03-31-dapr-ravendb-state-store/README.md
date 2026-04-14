# How to Configure Dapr with RavenDB State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RavenDB, State Store, NoSQL, Microservice

Description: Learn how to configure Dapr with RavenDB as a state store, using RavenDB's ACID-compliant document database for reliable microservice state persistence.

---

## Overview

RavenDB is a fully transactional NoSQL document database designed for high availability and performance. It offers ACID transactions across documents, automatic indexing, and a rich query language. When used as a Dapr state store, RavenDB provides durable and consistent state storage backed by its document model.

## Prerequisites

- A running RavenDB server (version 5.x or later)
- Dapr CLI and runtime installed
- kubectl access if deploying to Kubernetes

## Setting Up RavenDB

Run RavenDB using Docker for development:

```bash
docker run -d \
  --name ravendb \
  -p 8080:8080 \
  -p 38888:38888 \
  -e RAVEN_Setup_Mode=None \
  -e RAVEN_License_Eula_Accepted=true \
  -e RAVEN_Security_UnsecuredAccessAllowed=PrivateNetwork \
  ravendb/ravendb:latest
```

Create a database for Dapr state via the RavenDB Studio at http://localhost:8080 or using the REST API:

```bash
curl -X PUT http://localhost:8080/admin/databases \
  -H "Content-Type: application/json" \
  -d '{"DatabaseName": "DaprState", "Settings": {}, "Disabled": false}'
```

## Configuring the Dapr Component

Create the component manifest:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ravendb-statestore
  namespace: default
spec:
  type: state.ravendb
  version: v1
  metadata:
  - name: serverURL
    value: "http://localhost:8080"
  - name: databaseName
    value: "DaprState"
```

For secured RavenDB with a client certificate:

```yaml
  - name: certPath
    value: "/path/to/client.crt"
  - name: keyPath
    value: "/path/to/client.key"
```

Apply the component:

```bash
kubectl apply -f ravendb-statestore.yaml
```

## Using the RavenDB State Store

Store and retrieve state from your application:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Save product catalog state
await client.state.save("ravendb-statestore", [
  {
    key: "product-sku-1001",
    value: {
      name: "Premium Headphones",
      price: 149.99,
      stock: 42,
      category: "Electronics"
    }
  }
]);

// Get product state
const product = await client.state.get("ravendb-statestore", "product-sku-1001");
console.log("Product:", product);
```

## Transactional Multi-Key Operations

RavenDB's ACID support makes it a strong choice for transactional state updates:

```bash
curl -X POST http://localhost:3500/v1.0/state/ravendb-statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {"operation": "upsert", "request": {"key": "inventory-101", "value": {"qty": 10}}},
      {"operation": "upsert", "request": {"key": "order-501", "value": {"status": "confirmed"}}}
    ]
  }'
```

## Summary

RavenDB provides a robust, ACID-compliant document database backend for Dapr state management. Its automatic indexing, rich querying capabilities, and strong consistency model make it an excellent choice for microservices that need more sophisticated state storage than a simple key-value store can provide.
