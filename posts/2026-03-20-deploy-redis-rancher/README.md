# How to Deploy Redis on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rancher, Kubernetes, Helm, StatefulSet, Caching, Database, SUSE Rancher

Description: Learn how to deploy a production-ready Redis cluster on a Rancher-managed Kubernetes cluster using the Bitnami Helm chart with persistent storage, authentication, and Sentinel for high availability.

---

Redis on Kubernetes with Rancher provides a highly available, in-memory data store for caching, session management, and pub/sub messaging. The Bitnami chart supports both standalone and Redis Sentinel deployments.

---

## Step 1: Add the Bitnami Repository

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

---

## Step 2: Create a Values File

```yaml
# redis-values.yaml

architecture: replication   # Deploy 3 Redis nodes managed by Sentinel (1 master + 2 replicas after election)

auth:
  enabled: true
  password: ""              # Auto-generated; retrieve with kubectl get secret

replica:
  replicaCount: 3
  persistence:
    enabled: true
    storageClass: longhorn   # Replace if your cluster uses a different StorageClass
    size: 10Gi
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Redis Sentinel for automatic failover
sentinel:
  enabled: true
  masterSet: mymaster
  quorum: 2

# Enable Prometheus metrics
metrics:
  enabled: true
  serviceMonitor:
    enabled: true            # Requires Prometheus Operator CRDs
    namespace: monitoring
```

---

## Step 3: Deploy Redis

```bash
# Create namespace
kubectl create namespace redis

# Install Redis
helm install redis bitnami/redis \
  --namespace redis \
  --values redis-values.yaml \
  --wait

# Verify pods
kubectl get pods -n redis
```

---

## Step 4: Get the Redis Password

```bash
# Retrieve the auto-generated password
kubectl get secret redis \
  -n redis \
  -o jsonpath='{.data.redis-password}' | base64 -d
```

---

## Step 5: Connect to Redis

```bash
# Discover the current Redis master through Sentinel
REDIS_PASSWORD=$(kubectl get secret redis -n redis \
  -o jsonpath='{.data.redis-password}' | base64 -d)
MASTER_HOST=$(kubectl exec -n redis redis-node-0 -- \
  redis-cli -a "$REDIS_PASSWORD" -p 26379 SENTINEL get-master-addr-by-name mymaster | sed -n '1p')
MASTER_PORT=$(kubectl exec -n redis redis-node-0 -- \
  redis-cli -a "$REDIS_PASSWORD" -p 26379 SENTINEL get-master-addr-by-name mymaster | sed -n '2p')

# Connect to the current Redis master
kubectl exec -it redis-node-0 -n redis -- \
  redis-cli -h "$MASTER_HOST" -p "$MASTER_PORT" -a "$REDIS_PASSWORD"

# In redis-cli:
SET mykey "hello"
GET mykey
INFO replication
```

---

## Step 6: Check Sentinel Status

```bash
# Connect to Sentinel and verify master discovery
REDIS_PASSWORD=$(kubectl get secret redis -n redis \
  -o jsonpath='{.data.redis-password}' | base64 -d)
kubectl exec -n redis redis-node-0 -- \
  redis-cli -a "$REDIS_PASSWORD" -p 26379 SENTINEL masters

# Expected output includes:
# name: mymaster
# ... the current master hostname or IP ...
# ... port 6379 ...
# ... flags: master ...
```

---

## Step 7: Connect from an Application

When Redis Sentinel is enabled, use a Sentinel-aware client library so the application can discover the current master automatically:

```bash
# Create a connection secret for Sentinel-aware applications
kubectl create secret generic redis-connection \
  --namespace default \
  --from-literal=sentinel-hosts="redis.redis.svc.cluster.local:26379" \
  --from-literal=sentinel-master="mymaster" \
  --from-literal=password="$(
    kubectl get secret redis -n redis \
    -o jsonpath='{.data.redis-password}' | base64 -d
  )"
```

Use the secret in your application deployment:

```yaml
env:
  - name: REDIS_SENTINEL_HOSTS
    valueFrom:
      secretKeyRef:
        name: redis-connection
        key: sentinel-hosts
  - name: REDIS_SENTINEL_MASTER_SET
    valueFrom:
      secretKeyRef:
        name: redis-connection
        key: sentinel-master
  - name: REDIS_PASSWORD
    valueFrom:
      secretKeyRef:
        name: redis-connection
        key: password
```

---

## Step 8: Monitor Redis Performance

```promql
# Redis memory usage
redis_memory_used_bytes

# Redis commands per second
rate(redis_commands_processed_total[5m])

# Redis connected clients
redis_connected_clients

# Keyspace hit rate
rate(redis_keyspace_hits_total[5m]) /
  (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

---

## Persistence Configuration for Caching vs. Data Store

```yaml
# For pure caching (no persistence needed - faster, lower storage cost)
replica:
  persistence:
    enabled: false

# For session storage or queues, keep AOF enabled.
# The Bitnami chart enables this in commonConfiguration by default.
commonConfiguration: |-
  appendonly yes
  save ""
```

---

## Best Practices

- Enable Redis Sentinel (`sentinel.enabled: true`) for production deployments when you need automatic failover, and use a Sentinel-aware client library to follow master changes.
- Use a dedicated namespace for Redis and restrict network access using NetworkPolicy.
- For caching workloads, disable persistence to improve write performance and reduce storage costs; for session storage or queues, keep the default AOF configuration in place for durability.
