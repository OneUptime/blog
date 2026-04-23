# How to Deploy Redis on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Redis, Caching, Database

Description: Deploy Redis on Rancher-managed Kubernetes clusters with high availability using Redis Sentinel or Redis Cluster mode for caching, session management, and message brokering.

## Introduction

Redis is an in-memory data structure store used for caching, session management, real-time analytics, and as a message broker. Deploying Redis on Rancher provides automatic restarts, resource management, and integration with your existing monitoring stack. This guide covers both Redis Sentinel (for HA) and Redis Cluster deployment options.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.8+ installed
- kubectl access
- A StorageClass (for persistent storage)

## Step 1: Configure Redis with Sentinel (High Availability)

```yaml
# redis-values.yaml - Redis with Sentinel for HA

architecture: replication

auth:
  enabled: true
  password: "RedisP@ssw0rd"

commonConfiguration: |
  # Maximum memory policy for cache use case
  maxmemory-policy allkeys-lru
  # Set max memory to 800MB (leave headroom)
  maxmemory 800mb
  # Enable AOF for durability
  appendonly yes
  appendfsync everysec
  # Slow log threshold (microseconds)
  slowlog-log-slower-than 1000000
  save 900 1
  save 300 10
  save 60 10000

replica:
  replicaCount: 3
  persistence:
    enabled: true
    storageClass: "standard"
    size: 10Gi
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 500m

sentinel:
  enabled: true
  masterSet: redis-master
  quorum: 2
  resources:
    requests:
      memory: 64Mi
      cpu: 10m

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
    additionalLabels:
      release: rancher-monitoring
```

## Step 2: Deploy Redis

```bash
# Deploy Redis
helm install redis oci://registry-1.docker.io/bitnamicharts/redis \
  --namespace databases \
  --create-namespace \
  --values redis-values.yaml \
  --wait

# Check pods
kubectl get pods -n databases -l app.kubernetes.io/name=redis
```

## Step 3: Verify Redis Sentinel Deployment

```bash
# Check Sentinel state
kubectl exec -n databases redis-node-0 -c sentinel -- \
  redis-cli -p 26379 -a RedisP@ssw0rd sentinel masters

# Discover the current Redis master pod
MASTER_HOST=$(kubectl exec -n databases redis-node-0 -c sentinel -- \
  redis-cli -p 26379 -a RedisP@ssw0rd --raw sentinel get-master-addr-by-name redis-master | sed -n '1p')
MASTER_POD=$(printf '%s\n' "$MASTER_HOST" | cut -d. -f1)

# Connect to the current Redis master
kubectl exec -n databases -it "$MASTER_POD" -c redis -- \
  redis-cli -a RedisP@ssw0rd

# Inside redis-cli
PING
INFO replication
SET test-key "hello"
GET test-key
```

## Step 4: Deploy Redis Cluster Mode

For larger datasets requiring horizontal sharding:

```yaml
# redis-cluster-values.yaml - Redis Cluster with 6 nodes (3 primary + 3 replica)
cluster:
  init: true
  nodes: 6
  replicas: 1  # 1 replica per primary

usePassword: true
password: "ClusterRedisP@ss"

persistence:
  enabled: true
  storageClass: standard
  size: 10Gi

redis:
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 500m

metrics:
  enabled: true
```

```bash
# Deploy Redis Cluster
helm install redis-cluster oci://registry-1.docker.io/bitnamicharts/redis-cluster \
  --namespace databases \
  --create-namespace \
  --values redis-cluster-values.yaml \
  --wait

# Check cluster info
kubectl exec -n databases redis-cluster-0 -- \
  redis-cli -c -a ClusterRedisP@ss cluster info
```

## Step 5: Configure Applications to Use Redis

```yaml
# app-deployment.yaml - Application using Redis
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: registry.example.com/web-app:v1.0
          env:
            # For Sentinel mode
            - name: REDIS_SENTINEL_HOSTS
              value: "redis-node-0.redis-headless.databases.svc.cluster.local:26379,redis-node-1.redis-headless.databases.svc.cluster.local:26379,redis-node-2.redis-headless.databases.svc.cluster.local:26379"
            - name: REDIS_SENTINEL_MASTER_NAME
              value: "redis-master"
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis
                  key: redis-password
```

## Step 6: Session Management with Redis

```yaml
# session-config.yaml - Configure session storage using Redis
apiVersion: v1
kind: ConfigMap
metadata:
  name: session-config
  namespace: production
data:
  SESSION_STORE: redis
  # Reuse REDIS_SENTINEL_HOSTS and REDIS_PASSWORD from the Deployment env vars
  REDIS_SENTINEL_MASTER_NAME: "redis-master"
  SESSION_TTL: "3600"  # 1 hour TTL
  SESSION_PREFIX: "sess:"
```

## Step 7: Redis Persistence Verification

```bash
# Discover the current Redis master pod
MASTER_HOST=$(kubectl exec -n databases redis-node-0 -c sentinel -- \
  redis-cli -p 26379 -a RedisP@ssw0rd --raw sentinel get-master-addr-by-name redis-master | sed -n '1p')
MASTER_POD=$(printf '%s\n' "$MASTER_HOST" | cut -d. -f1)

# Test AOF persistence
kubectl exec -n databases "$MASTER_POD" -c redis -- \
  redis-cli -a RedisP@ssw0rd CONFIG GET appendonly

# Test RDB save
kubectl exec -n databases "$MASTER_POD" -c redis -- \
  redis-cli -a RedisP@ssw0rd BGSAVE

# View persistence files
kubectl exec -n databases "$MASTER_POD" -c redis -- ls /data/
```

## Step 8: Monitor Redis with Grafana

```bash
# Import a Redis exporter Grafana dashboard (for example, ID: 10819)
# Access via port-forward
kubectl port-forward -n cattle-monitoring-system \
  svc/rancher-monitoring-grafana 3000:80

# Query Redis metrics in the Prometheus or Grafana UI
# Example PromQL:
# redis_up
```

## Troubleshooting

```bash
# Discover the current Redis master pod
MASTER_HOST=$(kubectl exec -n databases redis-node-0 -c sentinel -- \
  redis-cli -p 26379 -a RedisP@ssw0rd --raw sentinel get-master-addr-by-name redis-master | sed -n '1p')
MASTER_POD=$(printf '%s\n' "$MASTER_HOST" | cut -d. -f1)

# Check Redis logs
kubectl logs -n databases "$MASTER_POD" -c redis --tail=100

# Check Sentinel status
kubectl exec -n databases redis-node-0 -c sentinel -- \
  redis-cli -p 26379 -a RedisP@ssw0rd sentinel masters

# Check memory usage
kubectl exec -n databases "$MASTER_POD" -c redis -- \
  redis-cli -a RedisP@ssw0rd INFO memory | grep used_memory_human

# Test failover
kubectl exec -n databases redis-node-0 -c sentinel -- \
  redis-cli -p 26379 -a RedisP@ssw0rd sentinel failover redis-master
```

## Conclusion

Redis on Rancher provides a highly performant caching and messaging layer for cloud-native applications. Redis Sentinel is the recommended approach for most production deployments as it provides HA without the complexity of cluster mode. For very large datasets exceeding single-node capacity, Redis Cluster provides automatic sharding. Always configure appropriate `maxmemory` and eviction policies for your use case, and monitor memory usage closely to prevent out-of-memory situations.
