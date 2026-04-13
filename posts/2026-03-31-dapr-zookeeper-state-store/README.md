# How to Configure Dapr with Zookeeper State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, ZooKeeper, State Store, Distributed Coordination, Microservice

Description: Learn how to configure Dapr with Apache ZooKeeper as a state store for distributed coordination and configuration state in microservice architectures.

---

## Overview

Apache ZooKeeper is a centralized service for distributed coordination, configuration management, and leader election. While not a general-purpose database, its strong consistency model makes it useful as a Dapr state store for configuration data, distributed locks, and coordination state that must be consistent across all nodes.

## Prerequisites

- A running ZooKeeper ensemble (version 3.7 or later)
- Dapr CLI and runtime installed
- Familiarity with distributed systems concepts

## Setting Up ZooKeeper

Start a ZooKeeper instance using Docker:

```bash
docker run -d \
  --name zookeeper \
  -p 2181:2181 \
  -p 2888:2888 \
  -p 3888:3888 \
  -e ZOO_4LW_COMMANDS_WHITELIST=ruok \
  zookeeper:3.8
```

Verify ZooKeeper is accepting connections:

```bash
echo "ruok" | nc localhost 2181
# Expected output: imok
```

For a production ensemble, use a three-node configuration:

```yaml
version: "3.8"
services:
  zoo1:
    image: zookeeper:3.8
    environment:
      ZOO_MY_ID: 1
      ZOO_SERVERS: server.1=zoo1:2888:3888;2181 server.2=zoo2:2888:3888;2181 server.3=zoo3:2888:3888;2181
    ports:
      - "2181:2181"
```

## Configuring the Dapr Component

Create the ZooKeeper state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: zookeeper-statestore
  namespace: default
spec:
  type: state.zookeeper
  version: v1
  metadata:
  - name: servers
    value: "localhost:2181"
  - name: sessionTimeout
    value: "5s"
  - name: maxBufferSize
    value: "1048576"
  - name: maxConnBufferSize
    value: "1048576"
  - name: keyPrefixPath
    value: "/dapr/state"
```

Apply the component:

```bash
kubectl apply -f zookeeper-statestore.yaml
```

## Storing Configuration State

ZooKeeper is ideal for configuration and feature flag state:

```bash
# Save feature flag configuration
curl -X POST http://localhost:3500/v1.0/state/zookeeper-statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "feature-flags",
    "value": {
      "newCheckout": true,
      "betaSearch": false,
      "darkMode": true
    }
  }]'

# Read configuration
curl http://localhost:3500/v1.0/state/zookeeper-statestore/feature-flags
```

## Using the Dapr SDK

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Save distributed lock state
await client.state.save("zookeeper-statestore", [
  {
    key: "service-config",
    value: {
      maxConnections: 100,
      rateLimitRPS: 500,
      maintenanceMode: false
    },
    options: { consistency: "strong" }
  }
]);

const config = await client.state.get("zookeeper-statestore", "service-config");
console.log("Service config:", config);
```

## Inspecting State in ZooKeeper

You can view stored state directly using the ZooKeeper CLI:

```bash
docker exec -it zookeeper zkCli.sh -server localhost:2181
# Inside zkCli:
# ls /dapr/state
# get /dapr/state/feature-flags
```

## Summary

ZooKeeper as a Dapr state store provides strong consistency guarantees backed by ZooKeeper's proven consensus protocol. It is best suited for storing small, infrequently changing state like configuration values, feature flags, and coordination data rather than high-throughput application state.
