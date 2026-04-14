# How to Use Redis Sentinel with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Redis Sentinel, State Store, High Availability

Description: Learn how to configure Dapr to use Redis Sentinel for automatic primary failover, ensuring high availability of your microservice state store without data loss.

---

## Overview

Redis Sentinel provides high availability for a single Redis primary through automatic monitoring and failover. When the primary node fails, Sentinel promotes a replica to become the new primary and updates clients automatically. This is distinct from Redis Cluster, which shards data - Sentinel replicates the full dataset for failover protection.

## Deploying Redis with Sentinel

Use the Bitnami Redis chart with Sentinel mode enabled:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install redis bitnami/redis \
  --set architecture=replication \
  --set sentinel.enabled=true \
  --set sentinel.quorum=2 \
  --set replica.replicaCount=3 \
  --set auth.password=sentinelpassword \
  --namespace redis \
  --create-namespace
```

Verify Sentinel is monitoring the primary:

```bash
kubectl exec -n redis redis-node-0 -- \
  redis-cli -p 26379 -a sentinelpassword sentinel masters
```

## Configuring Dapr to Use Sentinel

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis.redis.svc.cluster.local:26379"
  - name: sentinelMasterName
    value: "mymaster"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: failover
    value: "true"
  - name: maxRetries
    value: "5"
  - name: maxRetryBackoff
    value: "3s"
```

The critical settings are:
- `redisHost` pointing to the Sentinel port (26379, not 6379)
- `sentinelMasterName` matching your Sentinel configuration
- `failover: "true"` to enable Sentinel mode

Create the secret:

```bash
kubectl create secret generic redis-secret \
  --from-literal=password=sentinelpassword -n default
```

## Testing Failover

Simulate a primary failure to verify automatic failover:

```bash
# Identify the current primary
kubectl exec -n redis redis-node-0 -- \
  redis-cli -p 26379 -a sentinelpassword sentinel get-master-addr-by-name mymaster

# Kill the primary
kubectl exec -n redis redis-node-0 -- \
  redis-cli -a sentinelpassword DEBUG sleep 60
```

Watch Sentinel elect a new primary:

```bash
kubectl logs -n redis redis-node-1 -f | grep "failover\|elected-leader"
```

Your Dapr application should continue serving state requests within seconds of the failover.

## Application-Level Verification

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// This will transparently reconnect after Sentinel failover
async function resilientStateGet(key) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await client.state.get("redis-statestore", key);
    } catch (err) {
      attempts++;
      console.warn(`Attempt ${attempts} failed, retrying...`);
      await new Promise(r => setTimeout(r, 1000 * attempts));
    }
  }
  throw new Error(`Failed to get state for ${key} after 3 attempts`);
}
```

## Sentinel vs Cluster Comparison

| Feature | Redis Sentinel | Redis Cluster |
|---------|---------------|---------------|
| Scaling | Vertical | Horizontal |
| Failover | Automatic | Automatic |
| Data sharding | No | Yes |
| Multi-key ops | Unrestricted | Hash slot limited |
| Setup complexity | Lower | Higher |

## Summary

Redis Sentinel with Dapr provides automatic high availability through primary-replica replication and automatic failover with no data sharding. Configure Dapr by pointing `redisHost` to the Sentinel port and setting `failover: "true"` and `sentinelMasterName`. This setup is ideal for workloads that need guaranteed failover without the complexity of Redis Cluster.
