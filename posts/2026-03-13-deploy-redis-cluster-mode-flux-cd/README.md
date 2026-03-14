# How to Deploy Redis Cluster Mode with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Redis, Cluster Mode, Sharding, Database Operators

Description: Deploy Redis Cluster for horizontal sharding and high throughput on Kubernetes using Flux CD for GitOps-managed Redis scaling.

---

## Introduction

Redis Cluster extends Redis's single-node capacity by partitioning data across multiple shards using consistent hashing. Each shard is a primary with one or more replicas, providing both horizontal scaling and high availability. Redis Cluster is the right choice when your dataset exceeds a single node's memory capacity or when you need to distribute read/write throughput across multiple primaries.

The OpsTree Redis Operator provides a `RedisCluster` CRD for deploying Redis Cluster on Kubernetes with automated slot assignment and shard management. Deploying through Flux CD ensures that cluster size, replication factor, and Redis parameters are all version-controlled.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Redis Operator deployed (see Sentinel post for operator install steps)
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Verify the Redis Operator is Running

```bash
kubectl get deployment redis-operator -n redis
```

If not deployed, add the OpsTree HelmRepository and deploy the operator first:

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

## Step 2: Create Redis Cluster Secret

```yaml
# infrastructure/databases/redis-cluster/redis-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: redis-cluster-secret
  namespace: redis
type: Opaque
stringData:
  password: "RedisClusterPassword123!"
```

## Step 3: Deploy Redis Cluster via CRD

```yaml
# infrastructure/databases/redis-cluster/redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: redis
spec:
  # Number of master shards (each with replicas)
  clusterSize: 3   # 3 primaries

  # Replicas per primary shard
  clusterVersion: v7

  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.15
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
    redisSecret:
      name: redis-cluster-secret
      key: password

  # Persistence for each shard
  storage:
    volumeClaimTemplate:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi

  # Redis configuration
  redisConfig:
    additionalRedisConfig: redis-cluster-config

  # Leader shard settings
  redisLeader:
    replicas: 3   # 3 primary shards
    pdb:
      enabled: true
      minAvailable: 2
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app: redis-cluster-leader

  # Follower (replica) settings
  redisFollower:
    replicas: 3   # 1 replica per primary shard
    pdb:
      enabled: true
      minAvailable: 2
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              topologyKey: kubernetes.io/hostname
              labelSelector:
                matchLabels:
                  app: redis-cluster-follower
```

## Step 4: Redis Cluster Configuration ConfigMap

```yaml
# infrastructure/databases/redis-cluster/redis-cluster-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: redis
data:
  redis-config: |
    # Memory limits per shard
    maxmemory 768mb
    maxmemory-policy allkeys-lru
    # Persistence (AOF recommended for cluster)
    appendonly yes
    appendfsync everysec
    # Cluster configuration
    cluster-node-timeout 15000
    cluster-migration-barrier 1
    cluster-require-full-coverage no
    # Disable dangerous commands
    rename-command FLUSHALL ""
    rename-command FLUSHDB ""
    # Slow log
    slowlog-log-slower-than 10000
    slowlog-max-len 256
    # Connection timeouts
    tcp-keepalive 300
    timeout 300
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/redis-cluster-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/redis-cluster
  prune: true
  dependsOn:
    - name: redis-operator
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redis-cluster-leader
      namespace: redis
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redis-cluster-follower
      namespace: redis
```

## Step 6: Verify the Cluster

```bash
# Check Redis cluster status
kubectl get rediscluster redis-cluster -n redis

# Check all pods (3 leaders + 3 followers)
kubectl get pods -n redis -l app=redis-cluster

# Connect to cluster and check shard distribution
kubectl exec -n redis redis-cluster-leader-0 -- \
  redis-cli -c -a 'RedisClusterPassword123!' cluster info

# Check slot assignment
kubectl exec -n redis redis-cluster-leader-0 -- \
  redis-cli -a 'RedisClusterPassword123!' cluster nodes

# Test with cluster-aware command (-c flag)
kubectl exec -n redis redis-cluster-leader-0 -- \
  redis-cli -c -a 'RedisClusterPassword123!' set foo bar

kubectl exec -n redis redis-cluster-leader-0 -- \
  redis-cli -c -a 'RedisClusterPassword123!' get foo
```

## Step 7: Scale the Cluster

To add a new shard, update the `clusterSize` in Git:

```yaml
  # Change from 3 to 4 shards
  clusterSize: 4
  redisLeader:
    replicas: 4
  redisFollower:
    replicas: 4
```

Commit, push, and Flux applies the change. The operator adds new nodes and rebalances hash slots automatically.

## Best Practices

- Set `cluster-require-full-coverage no` so the cluster continues serving requests even if a shard is down (acceptable for most use cases).
- Use `PodDisruptionBudget` (`pdb.enabled: true`) on both leaders and followers to prevent the cluster from going down during node maintenance.
- Connect applications using a cluster-aware Redis client (like `redis-py-cluster`, `ioredis` with cluster mode, or Lettuce) that handles slot redirection.
- Set `maxmemory` per shard based on the node's available memory minus OS overhead — typically 60-70% of node RAM.
- Monitor cluster health with the `cluster info` command and set up Prometheus alerts on `cluster_state != ok`.

## Conclusion

Redis Cluster deployed via the OpsTree Redis Operator and managed by Flux CD gives you a horizontally scalable Redis installation where data is automatically distributed across shards. The `RedisCluster` CRD makes topology changes — adding shards, adjusting replica counts — simple Git commits that Flux applies safely. For workloads that have outgrown a single Redis instance, Redis Cluster is the path to linear scaling while maintaining the performance and simplicity that Redis is known for.
