# How to Configure Dapr with etcd State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, etcd, State Store, Kubernetes, Microservice

Description: Learn how to configure Dapr to use etcd as a state store, leveraging etcd's strongly consistent distributed key-value storage for your microservices.

---

## Overview

etcd is a distributed key-value store that powers Kubernetes itself, providing strong consistency guarantees using the Raft consensus algorithm. Using etcd as a Dapr state store is ideal for scenarios requiring strict consistency, such as configuration management or leader election state.

## Prerequisites

- A running etcd cluster (version 3.4 or later)
- Dapr CLI and runtime installed
- kubectl access to your cluster

## Setting Up etcd

If you need a standalone etcd for development, run it using Docker:

```bash
docker run -d \
  --name etcd \
  -p 2379:2379 \
  -p 2380:2380 \
  quay.io/coreos/etcd:v3.5.0 \
  /usr/local/bin/etcd \
  --advertise-client-urls http://0.0.0.0:2379 \
  --listen-client-urls http://0.0.0.0:2379
```

Verify etcd is running:

```bash
etcdctl --endpoints=http://localhost:2379 endpoint health
```

## Configuring the Dapr Component

Create the Dapr state store component manifest:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: etcd-statestore
  namespace: default
spec:
  type: state.etcd
  version: v2
  metadata:
  - name: endpoints
    value: "localhost:2379"
  - name: keyPrefixPath
    value: "dapr"
```

For a TLS-secured etcd cluster, add certificate configuration:

```yaml
  - name: tlsEnable
    value: "true"
  - name: ca
    secretKeyRef:
      name: etcd-tls
      key: ca.crt
  - name: cert
    secretKeyRef:
      name: etcd-tls
      key: tls.crt
  - name: key
    secretKeyRef:
      name: etcd-tls
      key: tls.key
```

Apply the component:

```bash
kubectl apply -f etcd-statestore.yaml
```

## Using etcd State Store

Interact with the etcd state store through the Dapr HTTP API:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/etcd-statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "config-feature-flag", "value": {"enabled": true, "rollout": 50}}]'

# Get state
curl http://localhost:3500/v1.0/state/etcd-statestore/config-feature-flag
```

Or using JavaScript:

```javascript
// Using Dapr HTTP client approach
const response = await fetch('http://localhost:3500/v1.0/state/etcd-statestore/config-feature-flag');
const config = await response.json();
console.log("Feature flag:", config);
```

## Verifying State in etcd

You can inspect stored keys directly using etcdctl:

```bash
etcdctl --endpoints=http://localhost:2379 get --prefix dapr
```

## Summary

Configuring Dapr with etcd as a state store gives your microservices access to a strongly consistent, distributed key-value store with proven reliability in production Kubernetes environments. The `state.etcd` component supports TLS authentication and is well-suited for configuration and coordination state that requires strict consistency guarantees.
