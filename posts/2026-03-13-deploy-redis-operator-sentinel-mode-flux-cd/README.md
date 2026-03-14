# How to Deploy Redis Operator with Sentinel Mode via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Redis, Sentinel, High Availability, Database Operators

Description: Deploy the Redis Operator with Sentinel high-availability mode on Kubernetes using Flux CD for GitOps-managed Redis HA clusters.

---

## Introduction

Redis Sentinel provides automatic failover for Redis by monitoring master and replica instances and promoting a replica when the master fails. For workloads that need Redis high availability without horizontal sharding (where a single Redis dataset fits in memory), Sentinel mode is the recommended approach. The OpsTree Redis Operator and the Spotahome Redis Operator both support deploying Redis with Sentinel through Kubernetes CRDs.

Deploying Redis with Sentinel through Flux CD gives you GitOps control over the number of Sentinel instances, replica count, Redis configuration, and password management. When you need to adjust Redis's `maxmemory` policy or enable persistence, it's a Git commit reviewed by your team.

This guide uses the `redis-operator` from OpsTree Labs (available on GitHub and via Helm), which provides a clean `RedisReplication` CRD for Sentinel-based HA.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- `kubectl` and `flux` CLIs installed
- StorageClass available for Redis persistence

## Step 1: Add the Redis Operator HelmRepository

```yaml
# infrastructure/sources/ot-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ot-helm
  namespace: flux-system
spec:
  interval: 12h
  url: https://ot-container-kit.github.io/helm-charts
```

## Step 2: Deploy the Redis Operator

```yaml
# infrastructure/databases/redis/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis
```

```yaml
# infrastructure/databases/redis/operator.yaml
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
      version: "0.15.1"
      sourceRef:
        kind: HelmRepository
        name: ot-helm
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
```

## Step 3: Create Redis Password Secret

```yaml
# infrastructure/databases/redis/redis-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: redis
type: Opaque
stringData:
  password: "RedisPassword123!"
```

## Step 4: Deploy Redis with Sentinel (RedisReplication)

```yaml
# infrastructure/databases/redis/redis-replication.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisReplication
metadata:
  name: redis-replication
  namespace: redis
spec:
  clusterSize: 3  # 1 master + 2 replicas

  # Redis image
  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.15
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: "200m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    redisSecret:
      name: redis-secret
      key: password

  # Persistence
  storage:
    volumeClaimTemplate:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 5Gi

  # Redis configuration
  redisConfig:
    additionalRedisConfig: redis-additional-config

  # Anti-affinity
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app: redis-replication

  # Sentinel configuration
  redisSentinel:
    replicas: 3
    image: quay.io/opstree/redis-sentinel:v7.0.15
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"
    sentinelConfig:
      masterGroupName: mymaster
      redisPort: "6379"
      quorum: "2"
      downAfterMilliseconds: "5000"
      failoverTimeout: "180000"
      parallelSyncs: "1"
```

## Step 5: Create the Additional Redis ConfigMap

```yaml
# infrastructure/databases/redis/redis-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-additional-config
  namespace: redis
data:
  redis-config: |
    # Memory management
    maxmemory 384mb
    maxmemory-policy allkeys-lru
    # Persistence: RDB snapshots
    save 900 1
    save 300 10
    save 60 10000
    # AOF for durability
    appendonly yes
    appendfsync everysec
    no-appendfsync-on-rewrite no
    # Connection settings
    tcp-keepalive 300
    timeout 0
    # Slow log
    slowlog-log-slower-than 10000
    slowlog-max-len 128
    # Disable dangerous commands in production
    rename-command FLUSHALL ""
    rename-command FLUSHDB ""
    rename-command DEBUG ""
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/redis-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis-sentinel
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/redis
  prune: true
  dependsOn:
    - name: redis-operator-install
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redis-replication
      namespace: redis
```

## Step 7: Verify Sentinel Health

```bash
# Check operator
kubectl get deployment redis-operator -n redis

# Check Redis replication status
kubectl get redisreplication redis-replication -n redis

# Check all pods
kubectl get pods -n redis

# Connect to Redis via Sentinel
kubectl exec -n redis redis-replication-0 -- redis-cli -a 'RedisPassword123!' ping

# Check Sentinel info
kubectl exec -n redis redis-replication-sentinel-0 -- \
  redis-cli -p 26379 sentinel masters

# Check master address
kubectl exec -n redis redis-replication-sentinel-0 -- \
  redis-cli -p 26379 sentinel get-master-addr-by-name mymaster
```

## Best Practices

- Run 3 Sentinel instances (`redisSentinel.replicas: 3`) for a proper quorum - 2 Sentinels is the minimum but requires both to agree.
- Set `quorum: "2"` to require agreement from 2 of 3 Sentinels before failing over, preventing split-brain.
- Enable AOF persistence (`appendonly yes`) for data durability alongside RDB snapshots.
- Disable dangerous commands (`FLUSHALL`, `FLUSHDB`, `DEBUG`) in production via `rename-command`.
- Set `maxmemory` and `maxmemory-policy` to prevent Redis from consuming all node memory.
- Connect applications to Sentinel (port 26379) rather than directly to Redis, so they can discover the current master automatically.

## Conclusion

Redis deployed in Sentinel mode via the OpsTree Redis Operator and managed by Flux CD gives you a production-grade, highly available Redis cluster with automatic failover. The `RedisReplication` CRD provides a clean API for expressing cluster topology, and Flux ensures configuration changes are applied consistently. With Sentinel handling master election and your applications connecting through Sentinel endpoints, Redis availability is maintained even during node failures.
