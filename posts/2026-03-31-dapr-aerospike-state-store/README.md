# How to Configure Dapr with Aerospike State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Aerospike, State Store, High Performance, Microservice

Description: Learn how to configure Dapr with Aerospike as a state store, leveraging Aerospike's high-throughput, low-latency NoSQL database for demanding microservice workloads.

---

## Overview

Aerospike is a high-performance NoSQL database designed for sub-millisecond latency at scale. It uses a hybrid memory architecture that keeps indexes in RAM and data on SSDs, delivering consistent performance under heavy load. As a Dapr state store, Aerospike is ideal for latency-sensitive applications such as ad tech, financial services, and real-time personalization.

## Prerequisites

- A running Aerospike server (version 6.x or later)
- Dapr CLI and runtime installed
- aql or aerospike-tools for verification

## Setting Up Aerospike

Run Aerospike using Docker:

```bash
docker run -d \
  --name aerospike \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  aerospike/aerospike-server
```

Verify the server is running:

```bash
aql -h localhost -p 3000 -c "SHOW NAMESPACES"
```

## Configuring the Dapr Component

Create the Dapr Aerospike state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aerospike-statestore
  namespace: default
spec:
  type: state.Aerospike
  version: v1
  metadata:
  - name: hosts
    value: "localhost:3000"
  - name: namespace
    value: "test"
  - name: set
    value: "dapr-state"
```

For a multi-node cluster:

```yaml
  - name: hosts
    value: "aerospike-0:3000,aerospike-1:3000,aerospike-2:3000"
```

Apply the component:

```bash
kubectl apply -f aerospike-statestore.yaml
```

## Using the Aerospike State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store high-frequency ad bid state
await client.state.save("aerospike-statestore", [
  {
    key: "bid-campaign-9001",
    value: {
      campaignId: 9001,
      maxBid: 2.50,
      impressions: 150000,
      clicks: 3200,
      ctr: 0.0213
    }
  }
]);

const campaign = await client.state.get("aerospike-statestore", "bid-campaign-9001");
console.log("Campaign state:", campaign);
```

## Bulk Operations

Aerospike excels at batch operations. Use Dapr's bulk state API for best performance:

```bash
curl -X POST http://localhost:3500/v1.0/state/aerospike-statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user-profile-1", "value": {"tier": "gold", "score": 920}},
    {"key": "user-profile-2", "value": {"tier": "silver", "score": 750}},
    {"key": "user-profile-3", "value": {"tier": "bronze", "score": 440}}
  ]'
```

## Verifying Data in Aerospike

Use aql to inspect stored state:

```bash
aql -h localhost -p 3000 \
  -c "SELECT * FROM test.dapr-state LIMIT 10"
```

## Summary

Aerospike as a Dapr state store delivers exceptional throughput and sub-millisecond latency, making it the right choice for microservices operating at internet scale. Its hybrid memory architecture ensures consistent performance even under extreme read and write load, while the Dapr integration provides a clean abstraction for managing this state.
