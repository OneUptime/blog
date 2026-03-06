# How to Deploy Redis Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Redis, Kubernetes, Database, GitOps, Operator, redis-cluster, Sentinel, Caching

Description: A step-by-step guide to deploying the Redis Operator on Kubernetes using Flux CD for GitOps-managed Redis clusters with high availability.

---

## Introduction

Redis is an in-memory data store widely used as a cache, message broker, and database. Running Redis in production on Kubernetes requires proper orchestration for high availability, failover, and persistence. The Spotahome Redis Operator (also known as redis-operator) simplifies the management of Redis Sentinel and Redis Cluster deployments on Kubernetes.

This guide demonstrates how to deploy the Redis Operator with Flux CD, set up Redis clusters with Sentinel-based failover, configure persistence, and manage Redis through GitOps.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on your cluster
- A storage class that supports dynamic provisioning
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

```text
clusters/
  my-cluster/
    databases/
      redis/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        redis-failover.yaml
        auth-secret.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/redis/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis
  labels:
    app.kubernetes.io/name: redis-operator
    app.kubernetes.io/part-of: database
```

## Step 2: Add the Redis Operator Helm Repository

```yaml
# clusters/my-cluster/databases/redis/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: redis-operator
  namespace: redis
spec:
  interval: 1h
  # Spotahome Redis Operator Helm chart repository
  url: https://spotahome.github.io/redis-operator
```

## Step 3: Deploy the Redis Operator

```yaml
# clusters/my-cluster/databases/redis/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis-operator
  namespace: redis
spec:
  interval: 30m
  chart:
    spec:
      chart: redis-operator
      version: "3.3.x"
      sourceRef:
        kind: HelmRepository
        name: redis-operator
        namespace: redis
  timeout: 10m
  values:
    # Resource configuration for the operator
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 300m
        memory: 256Mi
    # RBAC configuration
    rbac:
      create: true
    # Service account configuration
    serviceAccount:
      create: true
```

## Step 4: Create Authentication Secret

```yaml
# clusters/my-cluster/databases/redis/auth-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-auth
  namespace: redis
type: Opaque
stringData:
  # Redis authentication password
  password: "change-me-to-a-strong-redis-password"
```

## Step 5: Deploy a Redis Failover Cluster

The RedisFailover custom resource creates a Redis deployment with Sentinel-based high availability.

```yaml
# clusters/my-cluster/databases/redis/redis-failover.yaml
apiVersion: databases.spotahome.com/v1
kind: RedisFailover
metadata:
  name: redis-cluster
  namespace: redis
spec:
  # Sentinel configuration for automatic failover
  sentinel:
    # Number of Sentinel instances (minimum 3 for quorum)
    replicas: 3
    # Resource limits for Sentinel pods
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    # Custom Sentinel configuration
    customConfig:
      # Time in milliseconds before marking a master as down
      - "down-after-milliseconds 5000"
      # Failover timeout in milliseconds
      - "failover-timeout 10000"
      # Number of replicas to reconfigure simultaneously during failover
      - "parallel-syncs 1"
    # Affinity to spread Sentinels across nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/component: sentinel
                  app.kubernetes.io/name: redis-cluster
              topologyKey: kubernetes.io/hostname

  # Redis server configuration
  redis:
    # Number of Redis instances (1 master + N-1 replicas)
    replicas: 3
    # Resource limits for Redis pods
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: "1"
        memory: 2Gi
    # Custom Redis configuration
    customConfig:
      # Maximum memory limit
      - "maxmemory 1gb"
      # Eviction policy when maxmemory is reached
      - "maxmemory-policy allkeys-lru"
      # Enable AOF persistence
      - "appendonly yes"
      # AOF fsync policy
      - "appendfsync everysec"
      # RDB snapshot configuration
      - "save 900 1"
      - "save 300 10"
      - "save 60 10000"
      # TCP keepalive
      - "tcp-keepalive 300"
      # Slow log configuration
      - "slowlog-log-slower-than 10000"
      - "slowlog-max-len 128"
      # Maximum number of connected clients
      - "maxclients 10000"
    # Persistent storage for Redis data
    storage:
      persistentVolumeClaim:
        metadata:
          name: redis-data
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
          storageClassName: standard
    # Affinity to spread Redis pods across nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/component: redis
                  app.kubernetes.io/name: redis-cluster
              topologyKey: kubernetes.io/hostname

  # Authentication configuration
  auth:
    secretPath: redis-auth
```

## Step 6: Create a Service for Application Access

```yaml
# clusters/my-cluster/databases/redis/service.yaml
# Service pointing to the Redis master (via Sentinel)
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: redis
  labels:
    app: redis-cluster
    role: master
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/component: redis
    app.kubernetes.io/name: redis-cluster
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
      protocol: TCP
---
# Service for Sentinel access
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: redis
  labels:
    app: redis-cluster
    role: sentinel
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/component: sentinel
    app.kubernetes.io/name: redis-cluster
  ports:
    - name: sentinel
      port: 26379
      targetPort: 26379
      protocol: TCP
```

## Step 7: Configure Redis Monitoring

```yaml
# clusters/my-cluster/databases/redis/monitoring.yaml
# Redis Exporter for Prometheus metrics
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: redis
  labels:
    app: redis-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
        - name: redis-exporter
          image: oliver006/redis_exporter:v1.58.0
          ports:
            - containerPort: 9121
              name: metrics
          env:
            # Connect to Redis via Sentinel
            - name: REDIS_ADDR
              value: "redis://redis-master.redis.svc.cluster.local:6379"
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-auth
                  key: password
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-exporter
  namespace: redis
  labels:
    app: redis-exporter
spec:
  selector:
    app: redis-exporter
  ports:
    - name: metrics
      port: 9121
      targetPort: 9121
---
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-exporter
  namespace: redis
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: redis-exporter
  endpoints:
    - port: metrics
      interval: 15s
```

## Step 8: Create the Kustomization

```yaml
# clusters/my-cluster/databases/redis/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - auth-secret.yaml
  - redis-failover.yaml
  - service.yaml
  - monitoring.yaml
```

## Step 9: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/redis-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/redis
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: redis-operator
      namespace: redis
  timeout: 15m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations redis

# Verify the operator
kubectl get pods -n redis -l app.kubernetes.io/name=redis-operator

# Check RedisFailover status
kubectl get redisfailover -n redis

# View all Redis pods
kubectl get pods -n redis

# Identify the current master
kubectl exec -it redis-cluster-sentinel-0 -n redis -- \
  redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# Test Redis connectivity
kubectl run redis-test --rm -it --restart=Never \
  --image=redis:7 --namespace=redis -- \
  redis-cli -h redis-master -a "change-me-to-a-strong-redis-password" ping
```

## Application Connection Example

Applications should connect to Redis through Sentinel for automatic failover awareness:

```yaml
# Example application configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-redis-config
  namespace: default
data:
  # Redis Sentinel connection settings
  REDIS_SENTINELS: "redis-sentinel.redis.svc.cluster.local:26379"
  REDIS_MASTER_NAME: "mymaster"
  REDIS_DB: "0"
```

## Troubleshooting

1. **Failover not triggering**: Check Sentinel logs to verify quorum is being reached. Ensure at least 2 of 3 Sentinels are healthy.

2. **Data loss after failover**: Verify AOF persistence is enabled and `appendfsync` is set to `everysec` or `always`.

3. **High memory usage**: Check `maxmemory` configuration and the eviction policy. Monitor with `redis-cli INFO memory`.

```bash
# Check Sentinel logs
kubectl logs -n redis redis-cluster-sentinel-0 --tail=100

# Check Redis server logs
kubectl logs -n redis redis-cluster-redis-0 --tail=100

# Check Redis info
kubectl exec -it redis-cluster-redis-0 -n redis -- \
  redis-cli -a "change-me-to-a-strong-redis-password" INFO replication
```

## Conclusion

You have successfully deployed a highly available Redis cluster on Kubernetes using the Redis Operator and Flux CD. The setup provides automatic failover through Sentinel, persistent storage for data durability, and Prometheus-based monitoring. With Flux CD managing the deployment, all Redis configuration is version-controlled and automatically reconciled from your Git repository.
