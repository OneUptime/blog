# How to Use etcd for Distributed State with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, etcd, Distributed State, State Store, Kubernetes, Configuration

Description: Use etcd as a Dapr state store for lightweight distributed state management in Kubernetes-native environments with strong consistency guarantees.

---

## Overview

etcd is a distributed key-value store that serves as Kubernetes' backing store for all cluster state. While it's not typically used as an application state store, Dapr's etcd component enables microservices to leverage etcd for strongly consistent, lightweight state management, particularly in environments where etcd is already available.

## etcd Deployment

For standalone use (not the Kubernetes etcd), deploy a dedicated etcd cluster:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install etcd bitnami/etcd \
  --set auth.rbac.rootPassword=secret \
  --set replicaCount=3 \
  --set persistence.size=8Gi \
  --set auth.rbac.create=true \
  --set auth.token.type=jwt
```

Verify the cluster:

```bash
# Get the etcd pod
kubectl exec -it etcd-0 -- etcdctl endpoint health \
  --endpoints=https://etcd:2379 \
  --cacert=/opt/bitnami/etcd/certs/ca.crt \
  --cert=/opt/bitnami/etcd/certs/tls.crt \
  --key=/opt/bitnami/etcd/certs/tls.key
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: etcd-state
  namespace: default
spec:
  type: state.etcd
  version: v2
  metadata:
  - name: endpoints
    value: "etcd-0.etcd-headless:2379,etcd-1.etcd-headless:2379,etcd-2.etcd-headless:2379"
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
  - name: keyPrefixPath
    value: "dapr-state/"
```

## Using etcd for Coordination State

etcd is ideal for distributed coordination patterns like leader election state:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

type LeaderState struct {
    InstanceID string `json:"instanceId"`
    ElectedAt  string `json:"electedAt"`
    ExpiresAt  string `json:"expiresAt"`
}

func tryBecomeLeader(instanceID string) (bool, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    ctx := context.Background()

    // Try to save leader state with first-write wins
    state := LeaderState{
        InstanceID: instanceID,
        ElectedAt:  "2026-03-31T10:00:00Z",
        ExpiresAt:  "2026-03-31T10:01:00Z",
    }

    data, _ := json.Marshal(state)

    err := client.SaveState(ctx, "etcd-state", "leader",
        data, nil,
        dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite),
        dapr.WithConsistency(dapr.StateConsistencyStrong),
    )

    if err != nil {
        // Another instance won the election
        return false, nil
    }

    fmt.Printf("Instance %s is now leader\n", instanceID)
    return true, nil
}
```

## Configuration Watching with etcd

etcd supports watch operations for real-time configuration updates:

```bash
# Watch for key changes using etcdctl
kubectl exec -it etcd-0 -- etcdctl watch /dapr-state/config \
  --endpoints=https://etcd:2379 \
  --cacert=/certs/ca.crt
```

## Key Prefix Strategy

Organize state with meaningful key prefixes:

```python
from dapr.clients import DaprClient

def save_service_config(service_name: str, config: dict):
    with DaprClient() as client:
        # Keys are stored as: dapr-state/config/order-service
        client.save_state(
            store_name="etcd-state",
            key=f"config/{service_name}",
            value=str(config)
        )

def get_service_config(service_name: str):
    with DaprClient() as client:
        response = client.get_state(
            store_name="etcd-state",
            key=f"config/{service_name}"
        )
        return response.data
```

## Summary

etcd as a Dapr state store provides strongly consistent, Raft-backed key-value storage suitable for distributed coordination, leader election, and configuration state. The `keyPrefixPath` setting organizes all Dapr state under a dedicated path, preventing conflicts with Kubernetes cluster state when using a shared etcd instance. etcd is best suited for small amounts of highly consistent state rather than high-volume application data.
