# How to Configure Dapr with Oracle Coherence State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Oracle, Coherence, State Store, In-Memory Grid

Description: Learn how to configure Dapr with Oracle Coherence as a state store, using Coherence's in-memory data grid for high-performance distributed state management.

---

## Overview

Oracle Coherence is a distributed in-memory data management platform used in large enterprise applications. It provides a highly scalable, clustered key-value store with automatic data partitioning, redundancy, and near-zero latency. As a Dapr state store, Coherence is the right choice for enterprises already using it as part of their Oracle infrastructure.

## Prerequisites

- Oracle Coherence Community Edition (CE) 22.06 or later (free) or Coherence Grid Edition
- Dapr CLI and runtime installed
- Java 11 or later for running Coherence

## Setting Up Oracle Coherence

Run a Coherence cluster using Docker:

```bash
# Pull Coherence CE
docker pull ghcr.io/oracle/coherence-ce:22.06.8

# Start a Coherence cluster (2 members)
docker network create coherence-net

docker run -d --name coherence-1 \
  --network coherence-net \
  -p 1408:1408 \
  -p 30000:30000 \
  ghcr.io/oracle/coherence-ce:22.06.8

docker run -d --name coherence-2 \
  --network coherence-net \
  ghcr.io/oracle/coherence-ce:22.06.8
```

Verify cluster membership using the Management over REST API:

```bash
curl http://localhost:30000/management/coherence/cluster/members
```

## Configuring the Dapr Component

Create the Dapr Coherence state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: coherence-statestore
  namespace: default
spec:
  type: state.coherence
  version: v1
  metadata:
  - name: serverAddress
    value: "coherence-1:1408"
  - name: nearCacheTTL
    value: "60s"
  - name: requestTimeout
    value: "10s"
```

For a multi-node Coherence cluster, specify multiple addresses:

```yaml
  - name: serverAddress
    value: "coherence-1:1408,coherence-2:1408"
```

Apply the component:

```bash
kubectl apply -f coherence-statestore.yaml
```

## Using the Coherence State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store Java EE application session state
await client.state.save("coherence-statestore", [
  {
    key: "http-session-enterprise-8821",
    value: {
      userId: "enterprise-8821",
      roles: ["ADMIN", "BILLING", "REPORTS"],
      locale: "en-US",
      corporateId: "CORP-001",
      lastActivity: new Date().toISOString()
    }
  }
]);

const session = await client.state.get("coherence-statestore", "http-session-enterprise-8821");
console.log("Session:", session);
```

## Near Cache for Read Performance

Coherence's near cache stores frequently accessed items in the application process memory, eliminating network round trips for hot keys:

```yaml
  - name: nearCacheTTL
    value: "30s"
  - name: nearCacheUnits
    value: "10000"
```

With a non-zero `nearCacheTTL`, repeated reads of the same key are served from local memory:

```bash
# First read - fetched from cluster
curl http://localhost:3500/v1.0/state/coherence-statestore/http-session-enterprise-8821
# ~2ms

# Second read - served from near cache
curl http://localhost:3500/v1.0/state/coherence-statestore/http-session-enterprise-8821
# ~0.1ms
```

## Summary

Oracle Coherence as a Dapr state store delivers in-memory data grid performance with enterprise-grade data redundancy and automatic cluster management. Its near cache feature can reduce read latency to microseconds for frequently accessed state, making it exceptional for high-throughput microservices with hot key patterns.
