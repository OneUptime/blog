# How to Configure Redis Cluster Mode for Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, State Management, Cluster, High Availability, Microservice

Description: Learn how to configure Redis Cluster Mode as a Dapr state store for horizontal scalability, high availability, and fault tolerance in production environments.

---

Redis in standalone mode works well for development and small workloads, but production microservices often demand horizontal scalability and fault tolerance. Redis Cluster distributes data across multiple shards with automatic failover, making it ideal as the backing store for Dapr's state management API. This guide walks through setting up Redis Cluster and wiring it into Dapr so your stateful microservices can scale without downtime.

## Understanding Redis Cluster Architecture

Redis Cluster uses consistent hashing with 16,384 hash slots distributed across primary nodes. Each primary can have one or more replicas for failover. A write goes to the primary node responsible for the key's hash slot; reads can optionally be served from replicas.

For Dapr state store purposes, keys follow the pattern `<app-id>||<key>`, so all state for a single Dapr app-id is distributed across the cluster based on the hash of each composite key.

Minimum cluster topology for production:

```text
3 primary nodes + 3 replica nodes (1 replica per primary)
```

This provides:
- Horizontal write scaling across 3 shards
- Automatic failover if any primary fails
- No single point of failure

## Deploying a Redis Cluster on Kubernetes

Use the Bitnami Helm chart, which supports cluster mode out of the box:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm upgrade --install redis-cluster bitnami/redis-cluster \
  --namespace redis \
  --create-namespace \
  --set cluster.nodes=6 \
  --set cluster.replicas=1 \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set usePassword=true \
  --set password=mySecurePassword \
  --wait
```

Verify the cluster is healthy:

```bash
kubectl exec -it redis-cluster-0 -n redis -- \
  redis-cli -a mySecurePassword cluster info | grep cluster_state
# Expected: cluster_state:ok
```

Check slot distribution:

```bash
kubectl exec -it redis-cluster-0 -n redis -- \
  redis-cli -a mySecurePassword cluster nodes
```

## Configuring the Dapr State Store Component

Create a Dapr `Component` manifest pointing to the Redis Cluster. The key setting is `redisType: cluster`:

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
    value: "redis-cluster.redis.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: redisType
    value: "cluster"
  - name: enableTLS
    value: "false"
  - name: maxRetries
    value: "3"
  - name: maxRetryBackoff
    value: "2s"
  - name: ttlInSeconds
    value: "0"
  - name: keyPrefix
    value: "appid"
auth:
  secretStore: kubernetes
```

Create the secret:

```bash
kubectl create secret generic redis-secret \
  --from-literal=password=mySecurePassword
```

Apply the component:

```bash
kubectl apply -f statestore.yaml
```

## Handling Transactions in Redis Cluster Mode

Redis Cluster has an important constraint: multi-key operations (MSET, transactions) only work when all keys hash to the same slot. Dapr state transactions use Redis MULTI/EXEC under the hood, which can fail in cluster mode if keys land on different shards.

To guarantee transaction compatibility, use hash tags - wrap a common string in curly braces so Redis hashes only that part:

```python
import requests
import json

app_port = 3500

# Use hash tags to colocate related keys on the same shard
# Dapr key format: <app-id>||<key>
# Adding {userId} as a hash tag ensures all user keys go to same slot

def save_user_data(user_id: str, profile: dict, preferences: dict):
    # Dapr transactional state - keys must be on same shard
    # Use keyPrefix that includes hash tag
    operations = [
        {
            "operation": "upsert",
            "request": {
                "key": f"{{user:{user_id}}}.profile",
                "value": profile
            }
        },
        {
            "operation": "upsert", 
            "request": {
                "key": f"{{user:{user_id}}}.preferences",
                "value": preferences
            }
        }
    ]
    
    response = requests.post(
        f"http://localhost:{app_port}/v1.0/state/statestore/transaction",
        json={"operations": operations}
    )
    response.raise_for_status()
    print(f"Transaction successful for user {user_id}")

save_user_data(
    "user123",
    {"name": "Alice", "email": "alice@example.com"},
    {"theme": "dark", "language": "en"}
)
```

## Configuring Connection Pooling and Timeouts

For high-throughput services, tune the Redis connection pool via Dapr component metadata:

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
    value: "redis-cluster.redis.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: redisType
    value: "cluster"
  - name: dialTimeout
    value: "5s"
  - name: readTimeout
    value: "3s"
  - name: writeTimeout
    value: "3s"
  - name: poolSize
    value: "20"
  - name: minIdleConns
    value: "5"
  - name: poolTimeout
    value: "4s"
  - name: maxConnAge
    value: "0"
  - name: idleCheckFrequency
    value: "1m"
  - name: idleTimeout
    value: "5m"
```

Test state store performance with a simple benchmark:

```bash
# Using Dapr CLI to check component health
dapr components -k

# Check component in Dapr dashboard
dapr dashboard -k

# Test state read/write via Dapr HTTP API
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"testkey","value":"testvalue"}]'

curl http://localhost:3500/v1.0/state/statestore/testkey
```

## Monitoring Redis Cluster Health with Dapr

Dapr exposes metrics for state store operations via Prometheus. Set up alerts for cluster failures:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-redis-alerts
  namespace: monitoring
spec:
  groups:
  - name: dapr-state-store
    interval: 30s
    rules:
    - alert: DaprStateStoreHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(dapr_component_state_latencies_bucket[5m])) by (le)
        ) > 0.5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Dapr state store p99 latency > 500ms"
    - alert: DaprStateStoreErrors
      expr: |
        rate(dapr_component_state_count{success="false"}[5m]) > 0.1
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Dapr state store errors > 0.1 per second"
```

Monitor Redis Cluster slot rebalancing:

```bash
kubectl exec -it redis-cluster-0 -n redis -- \
  redis-cli -a mySecurePassword cluster slots
```

## Summary

Configuring Redis Cluster Mode for Dapr state store provides the scalability and fault tolerance needed for production microservices. The critical steps are deploying a 6-node Redis Cluster (3 primaries + 3 replicas), setting `redisType: cluster` in the Dapr component manifest, and handling the cluster's single-slot transaction constraint by using Redis hash tags for keys that participate in the same transaction. Fine-tune connection pool settings to match your workload, and set up Prometheus alerts on Dapr's state store metrics to catch latency spikes or errors before they impact users.
