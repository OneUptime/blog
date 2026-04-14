# How to Configure MongoDB Replica Set for Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MongoDB, Replica Set, State Store, High Availability

Description: Learn how to configure a MongoDB Replica Set as a Dapr state store for high availability, strong consistency, and durable state management in production.

---

## MongoDB Replica Sets and Dapr

A MongoDB Replica Set consists of a primary node and one or more secondary nodes that replicate data continuously. Using a replica set as a Dapr state store provides automatic failover (promotion of a secondary when the primary fails) and read scaling (directing reads to secondaries). Dapr's MongoDB state store component supports replica set connection strings natively.

## Deploying MongoDB Replica Set in Kubernetes

Use the Bitnami MongoDB Helm chart with replication enabled:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install mongodb bitnami/mongodb \
  --namespace mongodb \
  --create-namespace \
  --set architecture=replicaset \
  --set replicaCount=3 \
  --set auth.rootPassword=rootSecret \
  --set auth.usernames[0]=dapr \
  --set auth.passwords[0]=daprSecret \
  --set auth.databases[0]=daprstate \
  --set persistence.size=20Gi
```

Verify the replica set is initialized:

```bash
kubectl exec -n mongodb mongodb-0 -- \
  mongosh -u root -p rootSecret --eval "rs.status().members.map(m => ({name: m.name, state: m.stateStr}))"
```

## Dapr State Store Component Configuration

Connect Dapr to the replica set using the MongoDB connection string with `replicaSet` parameter:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mongodb-statestore
  namespace: production
spec:
  type: state.mongodb
  version: v1
  metadata:
  - name: host
    value: "mongodb-0.mongodb-headless.mongodb:27017,mongodb-1.mongodb-headless.mongodb:27017,mongodb-2.mongodb-headless.mongodb:27017"
  - name: username
    secretKeyRef:
      name: mongodb-dapr-secret
      key: username
  - name: password
    secretKeyRef:
      name: mongodb-dapr-secret
      key: password
  - name: databaseName
    value: "daprstate"
  - name: collectionName
    value: "state"
  - name: writeConcern
    value: "majority"
  - name: readConcern
    value: "majority"
  - name: operationTimeout
    value: "5s"
  - name: params
    value: "?replicaSet=rs0&authSource=admin"
```

Create the secret:

```bash
kubectl create secret generic mongodb-dapr-secret \
  --namespace production \
  --from-literal=username=dapr \
  --from-literal=password=daprSecret
```

## Write and Read Concern for Consistency

Configure write concern `majority` to ensure state is durable on at least 2 nodes before acknowledging:

```yaml
- name: writeConcern
  value: "majority"
- name: readConcern
  value: "majority"
```

This prevents reading stale state after a failover event.

## Testing Replica Set Failover

Simulate primary failure and verify Dapr recovers:

```bash
# Step down the current primary
kubectl exec -n mongodb mongodb-0 -- \
  mongosh -u root -p rootSecret --eval "rs.stepDown()"

# Watch election
kubectl exec -n mongodb mongodb-1 -- \
  mongosh -u root -p rootSecret --eval "rs.status().members.map(m => m.stateStr)"

# Verify Dapr state operations still work (may see brief error during election)
curl -X POST http://localhost:3500/v1.0/state/mongodb-statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "failover-test", "value": "survived"}]'
```

## Indexes for Performance

Create indexes for frequently queried keys:

```javascript
// Connect to the daprstate database
use daprstate

// Index for TTL-based expiry (must be a single-field index)
db.state.createIndex(
  { "expireAt": 1 },
  { expireAfterSeconds: 0, name: "ttl_index" }
);

// Index for pattern-based key lookups
db.state.createIndex({ "_id": "text" }, { name: "key_text_index" });
```

## Summary

MongoDB Replica Set provides automatic failover and configurable read/write consistency for Dapr state stores. Setting `writeConcern: majority` ensures state survives a single node failure without data loss. The Dapr MongoDB component accepts standard replica set connection strings, so switching from a standalone instance requires only a connection string update and replica set parameter addition.
