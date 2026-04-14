# How to Configure Dapr with In-Memory State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, In-Memory, Testing, Local Development

Description: Learn how to configure Dapr's in-memory state store for fast local development and testing without any external database dependencies.

---

## Overview

Dapr's in-memory state store is the simplest possible state backend - it stores all state in the Dapr sidecar's memory with no external dependencies. This makes it ideal for local development, unit testing, and quick prototyping. Because state is stored in the sidecar process, it does not survive restarts and cannot be shared across multiple instances.

## When to Use the In-Memory State Store

Use the in-memory state store when:
- Developing locally and you want zero setup overhead
- Writing integration tests that need isolated state
- Prototyping a new microservice before choosing a production backend
- Running demos or tutorials

Do not use it in production - all state is lost when the process restarts.

## Configuring the Component

The in-memory state store requires minimal configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.in-memory
  version: v1
  metadata: []
```

Save this as `statestore.yaml` and place it in the Dapr components directory:

```bash
# Self-hosted mode
mkdir -p ~/.dapr/components
cp statestore.yaml ~/.dapr/components/
```

## Running Your App with In-Memory State

Start your application with the Dapr sidecar:

```bash
dapr run \
  --app-id myservice \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- node server.js
```

## Using the State Store

Save and retrieve state using the HTTP API:

```bash
# Save a value
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "user-pref-42", "value": {"theme": "dark", "lang": "en"}}]'

# Read it back
curl http://localhost:3500/v1.0/state/statestore/user-pref-42
```

Or using the JavaScript SDK in a test:

```javascript
import { DaprClient } from "@dapr/dapr";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";

describe("Order Service", () => {
  let client;

  before(async () => {
    client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });
  });

  it("should save and retrieve order state", async () => {
    await client.state.save("statestore", [
      { key: "order-test-1", value: { amount: 25.00, status: "pending" } }
    ]);

    const result = await client.state.get("statestore", "order-test-1");
    assert.strictEqual(result.status, "pending");
    assert.strictEqual(result.amount, 25.00);
  });
});
```

## Using with Docker Compose

For a local development stack, add Dapr with in-memory state to your compose file:

```yaml
services:
  myservice:
    build: .
    ports:
      - "8080:8080"

  dapr-sidecar:
    image: daprio/daprd:1.13.0
    command: ["./daprd", "-app-id", "myservice", "-app-port", "8080",
              "-components-path", "/components"]
    volumes:
      - ./components:/components
    network_mode: "service:myservice"
```

## Summary

The Dapr in-memory state store eliminates all external dependencies, making it the fastest way to start building and testing stateful microservices locally. While it is not suitable for production use due to its non-persistent nature, it provides a great developer experience for iteration and testing before switching to a persistent backend.
