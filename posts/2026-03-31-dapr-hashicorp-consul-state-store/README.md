# How to Configure Dapr with HashiCorp Consul State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Consul, State Store, Service Discovery, HashiCorp

Description: Learn how to configure Dapr with HashiCorp Consul as a state store, using Consul's distributed key-value store for microservice configuration and coordination.

---

## Overview

HashiCorp Consul is a multi-networking tool that provides service discovery, health checking, and a distributed key-value store. When used as a Dapr state store, Consul's KV store provides a strongly consistent storage backend, perfect for storing configuration, feature flags, and coordination state in environments where Consul is already deployed for service mesh or service discovery.

## Prerequisites

- A running Consul cluster (version 1.14 or later)
- Dapr CLI and runtime installed
- Consul CLI or HTTP API for verification

## Setting Up Consul

Start Consul in development mode for local testing:

```bash
docker run -d \
  --name consul \
  -p 8500:8500 \
  -p 8600:8600/udp \
  hashicorp/consul:1.17 \
  agent -dev -bind=0.0.0.0 -client=0.0.0.0
```

Verify Consul is running:

```bash
curl http://localhost:8500/v1/status/leader
```

## Configuring the Dapr Component

Create the Dapr Consul state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: consul-statestore
  namespace: default
spec:
  type: state.consul
  version: v1
  metadata:
  - name: datacenter
    value: "dc1"
  - name: httpAddr
    value: "localhost:8500"
  - name: aclToken
    secretKeyRef:
      name: consul-secret
      key: acl-token
  - name: scheme
    value: "http"
  - name: keyPrefixPath
    value: "dapr/state"
```

For ACL-enabled Consul, create the required token:

```bash
consul acl token create \
  -description "Dapr state store token" \
  -policy-name global-management
```

Store it as a Kubernetes secret:

```bash
kubectl create secret generic consul-secret \
  --from-literal=acl-token=your-token-here
```

Apply the component:

```bash
kubectl apply -f consul-statestore.yaml
```

## Using the Consul State Store

Interact with the state store through the Dapr HTTP API:

```bash
# Store service configuration
curl -X POST http://localhost:3500/v1.0/state/consul-statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "payment-service-config",
    "value": {
      "maxRetries": 3,
      "timeoutMs": 5000,
      "circuitBreakerThreshold": 10
    }
  }]'

# Read configuration
curl http://localhost:3500/v1.0/state/consul-statestore/payment-service-config
```

Using the JavaScript SDK:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

await client.state.save("consul-statestore", [
  {
    key: "app-global-config",
    value: { maintenanceMode: false, version: "3.2.1", region: "us-west-2" }
  }
]);

const config = await client.state.get("consul-statestore", "app-global-config");
console.log("Config:", config);
```

## Verifying State in Consul

```bash
# View all Dapr state keys
consul kv get -recurse dapr/state/

# Get a specific key
consul kv get dapr/state/payment-service-config
```

## Summary

HashiCorp Consul as a Dapr state store is a natural fit for organizations already using Consul for service mesh or service discovery. By storing Dapr state in Consul's KV store, you consolidate your infrastructure and benefit from Consul's ACL system, multi-datacenter replication, and strong consistency model.
