# How to Configure Dapr with JetStream KV State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, NATS, JetStream, State Store, Microservice

Description: Learn how to configure Dapr with NATS JetStream's Key-Value store as a state backend, combining messaging and state management in a single infrastructure component.

---

## Overview

NATS JetStream KV is a key-value store built on top of the JetStream persistence layer in NATS. It provides a distributed, low-latency key-value API with history, TTL, and watch capabilities. Using JetStream KV as a Dapr state store lets you consolidate messaging and state into a single NATS deployment, reducing operational complexity.

## Prerequisites

- NATS server (version 2.2 or later) with JetStream enabled
- Dapr CLI and runtime installed
- nats CLI tool for verification

## Setting Up NATS with JetStream

Run NATS with JetStream enabled using Docker:

```bash
docker run -d \
  --name nats \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:2.10 \
  -js \
  -m 8222
```

Verify JetStream is enabled:

```bash
nats --server nats://localhost:4222 server info | grep JetStream
```

Create a JetStream KV bucket for Dapr:

```bash
nats --server nats://localhost:4222 kv add dapr-state \
  --history 5 \
  --ttl 0
```

## Configuring the Dapr Component

Create the state store component manifest:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jetstream-statestore
  namespace: default
spec:
  type: state.jetstream
  version: v1
  metadata:
  - name: natsURL
    value: "nats://localhost:4222"
  - name: jwt
    value: ""
  - name: seedKey
    value: ""
  - name: bucket
    value: "dapr-state"
```

For authenticated NATS deployments, provide credentials:

```yaml
  - name: jwt
    secretKeyRef:
      name: nats-creds
      key: jwt
  - name: seedKey
    secretKeyRef:
      name: nats-creds
      key: seed
```

Apply the component:

```bash
kubectl apply -f jetstream-statestore.yaml
```

## Using JetStream KV State Store

Save and retrieve state:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store service discovery state
await client.state.save("jetstream-statestore", [
  {
    key: "svc-registry-payment",
    value: {
      host: "payment-service",
      port: 8080,
      healthEndpoint: "/health",
      version: "2.1.0"
    }
  }
]);

const svc = await client.state.get("jetstream-statestore", "svc-registry-payment");
console.log("Service info:", svc);
```

## Watching for State Changes

One of JetStream KV's unique features is the ability to watch keys for changes:

```bash
# Watch all keys in the bucket
nats --server nats://localhost:4222 kv watch dapr-state
```

## Viewing State Directly

Inspect stored state using the NATS CLI:

```bash
# List all keys
nats --server nats://localhost:4222 kv ls dapr-state

# Get a specific key
nats --server nats://localhost:4222 kv get dapr-state svc-registry-payment
```

## Summary

NATS JetStream KV as a Dapr state store is an excellent choice when you are already using NATS for messaging, allowing you to consolidate your infrastructure. It provides low-latency distributed key-value storage with built-in history, TTL support, and change notifications that extend beyond what standard Dapr state operations offer.
