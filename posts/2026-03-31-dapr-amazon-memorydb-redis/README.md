# How to Use Dapr with Amazon MemoryDB for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Amazon MemoryDB, AWS, Redis, State Management

Description: Configure Dapr state management and pub/sub components with Amazon MemoryDB for Redis, leveraging its durable, multi-AZ Redis-compatible managed service for production workloads.

---

## Overview

Amazon MemoryDB for Redis is a durable, Redis-compatible in-memory database with multi-AZ persistence. Unlike ElastiCache, MemoryDB provides strong consistency and durability, making it a better fit for Dapr state stores that require data persistence across failures.

## Configuring Dapr State Store with MemoryDB

Create a Dapr Redis state store component pointing to your MemoryDB cluster:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: clustercfg.my-memorydb.abc123.memorydb.us-east-1.amazonaws.com:6379
  - name: redisPassword
    secretKeyRef:
      name: memorydb-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: failover
    value: "false"
```

Create the secret:

```bash
kubectl create secret generic memorydb-secret \
  --from-literal=password="your-memorydb-auth-token"
```

## Configuring Dapr Pub/Sub with MemoryDB

Use MemoryDB as a Redis Streams pub/sub backend:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: clustercfg.my-memorydb.abc123.memorydb.us-east-1.amazonaws.com:6379
  - name: redisPassword
    secretKeyRef:
      name: memorydb-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: consumerID
    value: "{podName}"
```

## TLS Configuration for MemoryDB

MemoryDB requires TLS. Ensure your application code handles TLS verification:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Dapr handles TLS to MemoryDB via the sidecar
// Your app only communicates with localhost:3500
async function saveState(key, value) {
  await client.state.save('statestore', [{ key, value: JSON.stringify(value) }]);
}

async function getState(key) {
  const raw = await client.state.get('statestore', key);
  return raw ? JSON.parse(raw) : null;
}
```

## Connecting from a VPC

MemoryDB only allows connections from within the same VPC. Configure your Dapr pods with the correct subnet and security group:

```yaml
# Ensure your Kubernetes nodes are in the same VPC as MemoryDB
# Add security group rule to allow inbound on port 6379
# from the EKS node security group

# Verify connectivity from a test pod
kubectl run redis-test --image=redis:7 --rm -it -- \
  redis-cli -h clustercfg.my-memorydb.abc123.memorydb.us-east-1.amazonaws.com \
  -p 6379 -a your-token --tls ping
```

## MemoryDB Multi-AZ Durability

Unlike standard Redis, MemoryDB persists data to a multi-AZ transaction log:

```bash
# Monitor MemoryDB cluster health in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/MemoryDB \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=ClusterName,Value=my-memorydb \
  --start-time 2026-03-31T00:00:00Z \
  --end-time 2026-03-31T01:00:00Z \
  --period 300 \
  --statistics Average
```

## Summary

Amazon MemoryDB for Redis integrates seamlessly with Dapr's Redis state store and pub/sub components, providing production-grade durability that standard Redis deployments lack. Enable TLS for all connections, store authentication tokens in Kubernetes secrets, and ensure your EKS nodes are in the same VPC as the MemoryDB cluster. MemoryDB's multi-AZ persistence makes it particularly well-suited for Dapr actor state stores.
