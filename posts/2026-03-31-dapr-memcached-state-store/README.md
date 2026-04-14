# How to Configure Dapr with Memcached State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Memcached, State Store, Caching, Microservice

Description: Learn how to configure Dapr's Memcached state store component for fast, in-memory caching in microservice applications with simple setup and usage examples.

---

## Overview

Memcached is a high-performance, in-memory caching system widely used to speed up dynamic web applications. As a Dapr state store, Memcached is ideal for ephemeral, short-lived state like session data, rate-limit counters, and temporary computation results. Note that Memcached does not persist data to disk, so it is not suitable for state that must survive restarts.

## Prerequisites

- A running Memcached instance or cluster
- Dapr CLI and runtime installed
- Basic familiarity with Dapr components

## Running Memcached

Start a Memcached instance using Docker:

```bash
docker run -d \
  --name memcached \
  -p 11211:11211 \
  memcached:1.6 \
  memcached -m 256
```

Verify it is running:

```bash
echo "stats" | nc localhost 11211 | head -5
```

## Configuring the Dapr Component

Create the Dapr Memcached state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: memcached-statestore
  namespace: default
spec:
  type: state.memcached
  version: v1
  metadata:
  - name: hosts
    value: "localhost:11211"
  - name: maxIdleConnections
    value: "10"
  - name: timeout
    value: "5000"
```

For a Memcached cluster with multiple nodes:

```yaml
  - name: hosts
    value: "memcached-0:11211,memcached-1:11211,memcached-2:11211"
```

Apply the component:

```bash
kubectl apply -f memcached-statestore.yaml
```

## Using Memcached State Store

Save and retrieve state using the Dapr SDK:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });

// Cache a user session
await client.state.save("memcached-statestore", [
  {
    key: "session-abc123",
    value: { userId: 42, role: "admin", lastAccess: Date.now() },
    options: { consistency: "eventual" }
  }
]);

// Read cached session
const session = await client.state.get("memcached-statestore", "session-abc123");
console.log("Session:", session);
```

Check the TTL behavior - set a per-request TTL and Memcached automatically expires keys after that duration:

```bash
# Using the HTTP API to save state with explicit metadata
curl -X POST http://localhost:3500/v1.0/state/memcached-statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "rate-limit-user-42", "value": 5, "metadata": {"ttlInSeconds": "60"}}]'
```

## Limitations to Know

Memcached does not support:
- Strong consistency (eventual consistency only)
- Transactional operations
- ETags for optimistic concurrency

These limitations make Memcached best suited for cache-aside patterns rather than primary state storage.

## Summary

Dapr's Memcached state store component is straightforward to configure and provides ultra-low latency reads and writes for ephemeral state. It works best as a caching layer for session data and short-lived values, where its lack of persistence and limited consistency model are acceptable trade-offs for raw performance.
