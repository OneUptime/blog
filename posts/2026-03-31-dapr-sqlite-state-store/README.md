# How to Configure Dapr with SQLite State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQLite, State Store, Microservice, Local Development

Description: Learn how to configure Dapr with SQLite as a local state store, perfect for development, testing, and edge deployments that need persistent state without a server.

---

## Overview

SQLite is a self-contained, serverless database engine that stores data in a single file. As a Dapr state store, SQLite is excellent for local development, testing, and edge computing scenarios where running a dedicated database server is impractical. It supports full ACID transactions and provides persistent storage without any network dependencies.

## Prerequisites

- Dapr CLI installed (version 1.11 or later)
- No additional server setup required - SQLite is file-based

## Configuring the Dapr SQLite State Store

Create the component manifest for local development:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqlite-statestore
  namespace: default
spec:
  type: state.sqlite
  version: v1
  metadata:
  - name: connectionString
    value: "file:./dapr-state.db"
  - name: tableName
    value: "state"
  - name: timeout
    value: "20s"
  - name: busyTimeout
    value: "800ms"
  - name: disableWAL
    value: "false"
```

For production edge deployments, use an absolute path:

```yaml
  - name: connectionString
    value: "file:/var/data/dapr-state.db"
```

Apply the component in your local Dapr environment:

```bash
# For self-hosted mode
mkdir -p ~/.dapr/components
cp sqlite-statestore.yaml ~/.dapr/components/
```

## Using the SQLite State Store

Run your app with Dapr sidecar:

```bash
dapr run --app-id myapp --app-port 3000 -- node app.js
```

Interact with state from your application:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Save order state
await client.state.save("sqlite-statestore", [
  { key: "order-2001", value: { product: "Widget", qty: 3, status: "new" } },
  { key: "order-2002", value: { product: "Gadget", qty: 1, status: "shipped" } }
]);

// Bulk get
const orders = await client.state.getBulk("sqlite-statestore", ["order-2001", "order-2002"]);
orders.forEach(o => console.log(o.key, o.data));
```

## Inspecting the SQLite Database

Since SQLite stores data in a local file, you can inspect it directly:

```bash
sqlite3 dapr-state.db ".schema"
sqlite3 dapr-state.db "SELECT key, value FROM state LIMIT 10;"
```

## Transactional Operations

SQLite fully supports Dapr's transactional state operations:

```bash
curl -X POST http://localhost:3500/v1.0/state/sqlite-statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {"operation": "upsert", "request": {"key": "counter", "value": 100}},
      {"operation": "delete", "request": {"key": "temp-key"}}
    ]
  }'
```

## Summary

Dapr's SQLite state store component is the simplest way to get persistent state management running locally without any external services. Its file-based nature makes it ideal for development, testing pipelines, and edge deployments, while its ACID compliance ensures data integrity for transactional workloads.
