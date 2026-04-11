# How to Deploy Redis Operator in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Redis Operator, Operator, High Availability

Description: Learn how to deploy the Redis Operator in Kubernetes to manage Redis clusters, replication, and Sentinel configurations declaratively via custom resources.

---

## What Is a Redis Operator

A Kubernetes Operator extends the Kubernetes API with custom resources (CRDs) and controllers that manage complex stateful applications. The Redis Operator automates:

- Redis cluster creation and scaling
- Sentinel-based high availability
- Automated failover and recovery
- Configuration management
- Backup scheduling

Popular Redis operators include:
- **OT-Container-Kit Redis Operator** (open source)
- **Redis Enterprise Operator** (commercial)
- **Spotahome Redis Operator** (open source)

This guide uses the OT-Container-Kit Redis Operator.

## Installing the Redis Operator

Install the operator using Helm:

```bash
# Add the Helm repository
helm repo add ot-helm https://ot-container-kit.github.io/helm-charts/
helm repo update

# Create the namespace
kubectl create namespace redis-operator

# Install the operator
helm install redis-operator ot-helm/redis-operator \
  --namespace redis-operator \
  --set redisOperator.imagePullPolicy=Always

# Verify operator pod is running
kubectl -n redis-operator get pods
kubectl -n redis-operator get crd | grep redis
```

Expected CRDs after installation:

```text
redis.redis.opstreelabs.in
rediscluster.redis.opstreelabs.in
redisreplication.redis.opstreelabs.in
redissentinel.redis.opstreelabs.in
```

## Creating a Standalone Redis Instance

```yaml
# redis-standalone.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: Redis
metadata:
  name: redis-standalone
  namespace: default
spec:
  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.12
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
  redisConfig:
    maxmemory: "128mb"
    maxmemory-policy: "allkeys-lru"
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
  livenessProbe:
    failureThreshold: 5
    initialDelaySeconds: 15
    periodSeconds: 15
    successThreshold: 1
    timeoutSeconds: 5
  readinessProbe:
    failureThreshold: 5
    initialDelaySeconds: 15
    periodSeconds: 15
    successThreshold: 1
    timeoutSeconds: 5
```

```bash
kubectl apply -f redis-standalone.yaml
kubectl get redis redis-standalone
kubectl get pods -l app=redis-standalone
```

## Creating a Redis Replication Setup

```yaml
# redis-replication.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisReplication
metadata:
  name: redis-replication
  namespace: default
spec:
  clusterSize: 3
  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.12
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
  redisConfig:
    maxmemory: "256mb"
    maxmemory-policy: "allkeys-lru"
    appendonly: "yes"
```

```bash
kubectl apply -f redis-replication.yaml
kubectl get redisreplication redis-replication
kubectl get pods -l app=redis-replication
```

## Creating a Redis Sentinel Configuration

```yaml
# redis-sentinel.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisSentinel
metadata:
  name: redis-sentinel
  namespace: default
spec:
  clusterSize: 3
  kubernetesConfig:
    image: quay.io/opstree/redis-sentinel:v7.0.12
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
  redisSentinelConfig:
    redisReplicationName: "redis-replication"
    masterGroupName: "mymaster"
    redisPort: "6379"
    quorum: "2"
    downAfterMilliseconds: "5000"
    failoverTimeout: "10000"
    parallelSyncs: "1"
```

```bash
kubectl apply -f redis-sentinel.yaml
kubectl get redissentinel redis-sentinel
```

## Creating a Redis Cluster

```yaml
# redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: default
spec:
  clusterSize: 3
  clusterVersion: v7
  persistenceEnabled: true
  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.12
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 1000m
        memory: 1Gi
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
  redisConfig:
    maxmemory: "512mb"
    maxmemory-policy: "allkeys-lru"
    cluster-announce-hostname: "false"
```

```bash
kubectl apply -f redis-cluster.yaml
kubectl get rediscluster redis-cluster
kubectl get pods -l app=redis-cluster
```

## Checking Operator Status

```bash
# View all Redis resources
kubectl get redis,rediscluster,redisreplication,redissentinel

# Describe a resource for events
kubectl describe rediscluster redis-cluster

# View operator logs
kubectl -n redis-operator logs -l name=redis-operator -f
```

## Connecting to Operator-Managed Redis

```bash
# Connect to standalone
kubectl exec -it redis-standalone-0 -- redis-cli

# Connect to replication primary
kubectl exec -it redis-replication-0 -- redis-cli
kubectl exec -it redis-replication-0 -- redis-cli INFO replication

# Connect to cluster
kubectl exec -it redis-cluster-leader-0 -- redis-cli -c
```

## Uninstalling

```bash
# Delete Redis resources
kubectl delete rediscluster redis-cluster
kubectl delete redisreplication redis-replication
kubectl delete redissentinel redis-sentinel
kubectl delete redis redis-standalone

# Uninstall operator
helm uninstall redis-operator -n redis-operator
```

## Summary

The Redis Operator simplifies managing Redis on Kubernetes by replacing complex StatefulSet YAML with purpose-built CRDs for standalone, replication, sentinel, and cluster configurations. Install the OT-Container-Kit operator via Helm, then declare Redis deployments using RedisCluster or RedisReplication custom resources. The operator handles node ordering, configuration injection, and recovery automatically. Use kubectl get and describe on the custom resources to monitor operator-managed Redis deployments rather than inspecting pods directly.
