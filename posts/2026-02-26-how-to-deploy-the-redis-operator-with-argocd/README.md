# How to Deploy the Redis Operator with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Redis, Caching

Description: Learn how to deploy the Redis Operator with ArgoCD for GitOps-managed Redis clusters, including Sentinel failover, cluster mode, and persistent storage configuration.

---

Redis is everywhere - caching, session storage, message queues, rate limiting. Running Redis on Kubernetes with an operator gives you automated failover, scaling, and lifecycle management. Adding ArgoCD on top means your Redis infrastructure is version-controlled and reproducible across environments.

This guide covers deploying a Redis Operator with ArgoCD and creating production-ready Redis instances.

## Choosing a Redis Operator

There are several Redis operators for Kubernetes:

- **Spotahome Redis Operator** (redis-operator): Supports Redis Sentinel mode, well-maintained
- **OpsTree Redis Operator**: Supports both Sentinel and Cluster modes
- **Redis Enterprise Operator** (commercial): For Redis Enterprise features

This guide uses the OpsTree Redis Operator because it supports both Redis Sentinel and Redis Cluster modes, giving you flexibility.

## Step 1: Deploy the Redis Operator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: default
  source:
    repoURL: https://ot-container-kit.github.io/helm-charts/
    chart: redis-operator
    targetRevision: 0.18.0
    helm:
      values: |
        # Operator resources
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi

        # Watch all namespaces
        watchNamespace: ""

        # Enable leader election for HA operator
        leaderElection:
          enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: redis-operator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Step 2: Deploy a Redis Sentinel Cluster

Redis Sentinel provides high availability with automatic failover. This is the recommended mode for most use cases:

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisReplication
metadata:
  name: redis-cache
  namespace: redis
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  clusterSize: 3
  kubernetesConfig:
    image: redis:7.2-alpine
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: "1"
        memory: 1Gi
  redisExporter:
    enabled: true
    image: oliver006/redis_exporter:v1.58.0
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        memory: 128Mi
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: gp3
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
  redisConfig:
    additionalRedisConfig: |
      maxmemory 768mb
      maxmemory-policy allkeys-lru
      save 900 1
      save 300 10
      save 60 10000
      appendonly yes
      appendfsync everysec
---
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisSentinel
metadata:
  name: redis-sentinel
  namespace: redis
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  clusterSize: 3
  kubernetesConfig:
    image: redis:7.2-alpine
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi
  redisSentinelConfig:
    redisReplicationName: redis-cache
    masterGroupName: mymaster
    redisPort: "6379"
    quorum: "2"
    downAfterMilliseconds: "5000"
    failoverTimeout: "10000"
    parallelSyncs: "1"
```

## Step 3: Deploy a Redis Cluster

For high-throughput workloads that need data sharding, use Redis Cluster mode:

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: redis
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  clusterSize: 3
  clusterVersion: v7
  persistenceEnabled: true
  kubernetesConfig:
    image: redis:7.2-alpine
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "2"
        memory: 2Gi
  redisExporter:
    enabled: true
    image: oliver006/redis_exporter:v1.58.0
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: gp3
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 20Gi
  redisLeader:
    replicas: 3
    redisConfig:
      additionalRedisConfig: |
        maxmemory 1536mb
        maxmemory-policy allkeys-lru
        cluster-enabled yes
        cluster-config-file nodes.conf
        cluster-node-timeout 5000
  redisFollower:
    replicas: 3
    redisConfig:
      additionalRedisConfig: |
        maxmemory 1536mb
        maxmemory-policy allkeys-lru
        cluster-enabled yes
        cluster-config-file nodes.conf
        cluster-node-timeout 5000
```

## Step 4: Create the Namespace and Supporting Resources

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# Network policy to restrict Redis access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-access
  namespace: redis
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  podSelector:
    matchLabels:
      app: redis-cache
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              redis-access: "true"
      ports:
        - protocol: TCP
          port: 6379
```

## Custom Health Checks

Add Redis-specific health checks so ArgoCD knows when your Redis clusters are ready:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.redis.redis.opstreelabs.in_RedisReplication: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.masterNode ~= nil and obj.status.masterNode ~= "" then
        hs.status = "Healthy"
        hs.message = "Redis replication is running, master: " .. obj.status.masterNode
      else
        hs.status = "Progressing"
        hs.message = "Waiting for Redis master election"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for Redis replication status"
    end
    return hs

  resource.customizations.health.redis.redis.opstreelabs.in_RedisCluster: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.state == "ready" then
        hs.status = "Healthy"
        hs.message = "Redis cluster is ready"
      elseif obj.status.state == "error" then
        hs.status = "Degraded"
        hs.message = "Redis cluster error"
      else
        hs.status = "Progressing"
        hs.message = "Redis cluster is " .. (obj.status.state or "initializing")
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for Redis cluster status"
    end
    return hs

  resource.customizations.health.redis.redis.opstreelabs.in_RedisSentinel: |
    hs = {}
    if obj.status ~= nil then
      hs.status = "Healthy"
      hs.message = "Redis Sentinel is running"
    else
      hs.status = "Progressing"
      hs.message = "Waiting for Sentinel status"
    end
    return hs
```

## Monitoring Redis with Prometheus

If you have the Prometheus Operator running, create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-metrics
  namespace: redis
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  selector:
    matchLabels:
      redis_setup_type: replication
  endpoints:
    - port: redis-exporter
      interval: 15s
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: redis-alerts
  namespace: redis
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  groups:
    - name: redis.rules
      rules:
        - alert: RedisDown
          expr: redis_up == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Redis instance is down"
        - alert: RedisMemoryHigh
          expr: |
            redis_memory_used_bytes / redis_memory_max_bytes > 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Redis memory usage above 90%"
        - alert: RedisReplicationBroken
          expr: |
            delta(redis_connected_slaves[5m]) < 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Redis replica disconnected"
```

## Connecting Applications to Redis

For applications managed by ArgoCD, use the Redis service DNS name:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            # For Sentinel mode
            - name: REDIS_SENTINEL_HOST
              value: "redis-sentinel.redis.svc.cluster.local"
            - name: REDIS_SENTINEL_PORT
              value: "26379"
            - name: REDIS_MASTER_NAME
              value: "mymaster"
            # For Cluster mode
            # - name: REDIS_CLUSTER_NODES
            #   value: "redis-cluster-leader-0.redis.svc:6379,redis-cluster-leader-1.redis.svc:6379,redis-cluster-leader-2.redis.svc:6379"
```

## Multi-Environment Setup

Use Kustomize overlays for different Redis configurations per environment:

```yaml
# base/redis-replication.yaml - shared base
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisReplication
metadata:
  name: redis-cache
spec:
  clusterSize: 3
  kubernetesConfig:
    image: redis:7.2-alpine
```

```yaml
# overlays/staging/patch.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisReplication
metadata:
  name: redis-cache
spec:
  clusterSize: 1    # Single instance for staging
  kubernetesConfig:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 512Mi
```

## Summary

Deploying a Redis Operator with ArgoCD gives you GitOps-managed caching and data infrastructure. Whether you need simple Sentinel-based HA or full Redis Cluster mode, the operator handles the complexity while ArgoCD tracks the desired state in Git. Add health checks, monitoring, and network policies for a production-ready setup. For more on operator management, see our guide on [deploying Kubernetes operators with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-how-to-deploy-kubernetes-operators-with-argocd/view).
