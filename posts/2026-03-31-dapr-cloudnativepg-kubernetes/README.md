# How to Use Dapr with CloudNativePG on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, CloudNativePG, Kubernetes, State

Description: Learn how to configure Dapr's state management component to use a CloudNativePG-managed PostgreSQL cluster for durable microservice state storage.

---

## Overview

CloudNativePG (CNPG) is a Kubernetes operator that manages the full lifecycle of PostgreSQL clusters. Dapr supports PostgreSQL as a state store backend, making CNPG an excellent choice for durable state in Kubernetes-native microservices.

## Installing CloudNativePG

```bash
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-1.23.0.yaml
```

Create a PostgreSQL cluster:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: dapr-pg-cluster
  namespace: default
spec:
  instances: 3
  storage:
    size: 10Gi
  bootstrap:
    initdb:
      database: daprstate
      owner: dapruser
      secret:
        name: dapr-pg-secret
```

Create the credentials secret:

```bash
kubectl create secret generic dapr-pg-secret \
  --from-literal=username=dapruser \
  --from-literal=password=SecurePassword123
```

Apply the cluster:

```bash
kubectl apply -f pg-cluster.yaml
kubectl wait cluster/dapr-pg-cluster --for=condition=Ready --timeout=300s
```

## Configuring Dapr PostgreSQL State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cnpg-statestore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      value: "host=dapr-pg-cluster-rw.default.svc.cluster.local user=dapruser password=SecurePassword123 dbname=daprstate sslmode=require"
    - name: tableName
      value: dapr_state
    - name: actorStateStore
      value: "true"
```

For production, reference a Kubernetes secret instead of an inline connection string:

```yaml
    - name: connectionString
      secretKeyRef:
        name: dapr-pg-secret
        key: connectionString
```

## Creating the State Table

Dapr automatically creates the state table on first use. To verify:

```bash
kubectl exec -it dapr-pg-cluster-1 -- psql -U dapruser -d daprstate -c "\dt"
```

## Using the State Store

Save and retrieve state from your application:

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    ctx := context.Background()

    // Save state
    err := client.SaveState(ctx, "cnpg-statestore", "user:123", []byte(`{"name":"Alice","email":"alice@example.com"}`), nil)
    if err != nil {
        panic(err)
    }

    // Get state
    item, err := client.GetState(ctx, "cnpg-statestore", "user:123", nil)
    if err != nil {
        panic(err)
    }
    fmt.Println(string(item.Value))
}
```

## Enabling Transactions

Dapr supports multi-key transactions with PostgreSQL:

```go
ops := make([]*dapr.StateOperation, 0)
ops = append(ops, &dapr.StateOperation{
    Type: dapr.StateOperationTypeUpsert,
    Item: &dapr.SetStateItem{Key: "account:debit", Value: []byte(`{"balance":500}`)},
})
ops = append(ops, &dapr.StateOperation{
    Type: dapr.StateOperationTypeUpsert,
    Item: &dapr.SetStateItem{Key: "account:credit", Value: []byte(`{"balance":1500}`)},
})
err := client.ExecuteStateTransaction(ctx, "cnpg-statestore", nil, ops)
```

## High Availability Considerations

CNPG manages automatic failover. Configure the Dapr component to use the read-write service endpoint (`-rw`) to ensure writes always go to the primary:

```bash
dapr-pg-cluster-rw.default.svc.cluster.local:5432
```

For read-heavy workloads, use the read-only endpoint (`-ro`) to route queries to replica instances only, or (`-r`) to route to any instance including the primary.

## Summary

CloudNativePG provides a highly available PostgreSQL cluster on Kubernetes with automated failover and backup. Dapr's PostgreSQL state store component connects seamlessly to a CNPG cluster, offering transactional state management for microservices. This combination delivers production-grade durable state with Kubernetes-native lifecycle management.
