# How to Deploy Redis Cluster Mode on Kubernetes with Redis Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Operators, Clustering, Cache

Description: Learn how to deploy production-ready Redis Cluster mode on Kubernetes using the Redis Operator for automatic sharding, high availability, and horizontal scaling.

---

Redis Cluster provides automatic data sharding across multiple nodes without compromising on performance. When running Redis on Kubernetes, the Redis Operator simplifies cluster deployment and management by automating complex operations like slot distribution, failover, and rebalancing.

In this guide, we'll deploy Redis Cluster mode using the Redis Operator on Kubernetes. We'll cover cluster topology, data distribution, client configuration, and operational best practices.

## Understanding Redis Cluster Architecture

Redis Cluster distributes data across multiple master nodes using hash slots. The key space is divided into 16,384 slots, with each master responsible for a subset. Every master can have replica nodes for high availability.

Key features include:

- Automatic sharding without proxy layer
- Built-in high availability with automatic failover
- Linear scalability by adding master nodes
- Client-side routing with cluster topology awareness
- Multi-key operations within same hash slot

## Installing the Redis Operator

Deploy the Redis Operator to manage Redis clusters:

```bash
# Create namespace
kubectl create namespace redis

# Install using Helm
helm repo add redis-operator https://ot-container-kit.github.io/helm-charts/
helm repo update

# Install the operator
helm install redis-operator redis-operator/redis-operator \
  --namespace redis-operator \
  --create-namespace \
  --set redisOperator.image.tag=v0.15.0

# Verify operator is running
kubectl get pods -n redis-operator
```

Alternatively, install using manifests:

```bash
# Clone operator repository
git clone https://github.com/OT-CONTAINER-KIT/redis-operator.git
cd redis-operator

# Deploy CRDs and operator
kubectl apply -f config/crd/bases/
kubectl apply -f config/rbac/
kubectl apply -f config/manager/

# Verify installation
kubectl get crd | grep redis
```

## Deploying a Basic Redis Cluster

Create a Redis Cluster with 6 nodes (3 masters, 3 replicas):

```yaml
# redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: redis
spec:
  clusterSize: 3
  clusterVersion: v7

  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.12
    imagePullPolicy: IfNotPresent

    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi

    redisSecret:
      name: redis-secret
      key: password

  redisExporter:
    enabled: true
    image: quay.io/opstree/redis-exporter:v1.45.0
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi

  storage:
    volumeClaimTemplate:
      spec:
        accessModes:
        - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi

  # Cluster configuration
  redisConfig:
    cluster-enabled: "yes"
    cluster-node-timeout: "5000"
    cluster-require-full-coverage: "yes"
    maxmemory: "3gb"
    maxmemory-policy: "allkeys-lru"
    tcp-backlog: "511"
    timeout: "300"
    tcp-keepalive: "300"

  # Security settings
  securityContext:
    runAsUser: 1000
    fsGroup: 1000

  # Pod distribution
  podDisruptionBudget:
    maxUnavailable: 1

  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - redis-cluster
        topologyKey: kubernetes.io/hostname
```

Create the Redis password secret:

```bash
# Generate secure password
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create secret
kubectl create secret generic redis-secret \
  --from-literal=password="$REDIS_PASSWORD" \
  -n redis

# Deploy cluster
kubectl apply -f redis-cluster.yaml
```

Monitor cluster creation:

```bash
# Watch pod creation
kubectl get pods -n redis -w

# Check cluster status
kubectl exec -it redis-cluster-leader-0 -n redis -- redis-cli -a $REDIS_PASSWORD cluster info

# View cluster nodes
kubectl exec -it redis-cluster-leader-0 -n redis -- redis-cli -a $REDIS_PASSWORD cluster nodes
```

## Configuring Production Redis Cluster

Deploy with advanced configuration for production workloads:

```yaml
# redis-cluster-production.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-prod
  namespace: redis
spec:
  clusterSize: 6  # 6 masters for better distribution
  clusterVersion: v7

  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.12
    imagePullPolicy: IfNotPresent

    resources:
      requests:
        cpu: 4000m
        memory: 8Gi
      limits:
        cpu: 8000m
        memory: 16Gi

    redisSecret:
      name: redis-prod-secret
      key: password

    # Service configuration
    service:
      type: ClusterIP
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"

  # Redis Exporter for monitoring
  redisExporter:
    enabled: true
    image: quay.io/opstree/redis-exporter:v1.45.0
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

  # Persistent storage
  storage:
    volumeClaimTemplate:
      spec:
        accessModes:
        - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 200Gi

  # Advanced Redis configuration
  redisConfig:
    # Cluster settings
    cluster-enabled: "yes"
    cluster-node-timeout: "15000"
    cluster-require-full-coverage: "no"  # Allow partial operations during failures
    cluster-replica-validity-factor: "10"
    cluster-migration-barrier: "1"

    # Memory management
    maxmemory: "12gb"
    maxmemory-policy: "allkeys-lru"
    maxmemory-samples: "5"

    # Persistence
    save: "900 1 300 10 60 10000"
    rdbcompression: "yes"
    rdbchecksum: "yes"
    appendonly: "yes"
    appendfsync: "everysec"
    auto-aof-rewrite-percentage: "100"
    auto-aof-rewrite-min-size: "64mb"

    # Network
    tcp-backlog: "2048"
    timeout: "300"
    tcp-keepalive: "300"

    # Performance
    slowlog-log-slower-than: "10000"
    slowlog-max-len: "128"
    latency-monitor-threshold: "100"

    # Client connections
    maxclients: "50000"

  # Security
  securityContext:
    runAsUser: 1000
    runAsNonRoot: true
    fsGroup: 1000

  # High availability
  podDisruptionBudget:
    maxUnavailable: 1

  # Spread across nodes and zones
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - redis-prod
        topologyKey: kubernetes.io/hostname
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: workload
            operator: In
            values:
            - redis

  # Node tolerations for dedicated nodes
  tolerations:
  - key: "redis"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"

  # Monitoring probes
  livenessProbe:
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    successThreshold: 1
    failureThreshold: 3

  readinessProbe:
    initialDelaySeconds: 10
    periodSeconds: 5
    timeoutSeconds: 3
    successThreshold: 1
    failureThreshold: 3
```

## Connecting Applications to Redis Cluster

Applications need cluster-aware clients to connect properly:

### Node.js Example

```javascript
// redis-client.js
const Redis = require('ioredis');

// Create cluster client
const cluster = new Redis.Cluster([
  {
    host: 'redis-prod-leader-0.redis-prod.redis.svc.cluster.local',
    port: 6379
  },
  {
    host: 'redis-prod-leader-1.redis-prod.redis.svc.cluster.local',
    port: 6379
  },
  {
    host: 'redis-prod-leader-2.redis-prod.redis.svc.cluster.local',
    port: 6379
  }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD
  },
  clusterRetryStrategy: (times) => {
    const delay = Math.min(100 + times * 2, 2000);
    return delay;
  },
  enableOfflineQueue: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
});

// Handle events
cluster.on('connect', () => {
  console.log('Connected to Redis Cluster');
});

cluster.on('error', (err) => {
  console.error('Redis Cluster Error:', err);
});

// Example operations
async function exampleOperations() {
  // Simple set/get
  await cluster.set('key1', 'value1');
  const value = await cluster.get('key1');
  console.log('Value:', value);

  // Hash operations
  await cluster.hset('user:1000', 'name', 'John', 'email', 'john@example.com');
  const user = await cluster.hgetall('user:1000');
  console.log('User:', user);

  // Multi-key operations with hash tags (same slot)
  await cluster.mset('{user:1000}:profile', 'data1', '{user:1000}:settings', 'data2');
  const values = await cluster.mget('{user:1000}:profile', '{user:1000}:settings');
  console.log('Values:', values);
}

module.exports = cluster;
```

### Python Example

```python
# redis_client.py
from redis.cluster import RedisCluster
from redis.cluster import ClusterNode
import os

# Define cluster nodes
startup_nodes = [
    ClusterNode('redis-prod-leader-0.redis-prod.redis.svc.cluster.local', 6379),
    ClusterNode('redis-prod-leader-1.redis-prod.redis.svc.cluster.local', 6379),
    ClusterNode('redis-prod-leader-2.redis-prod.redis.svc.cluster.local', 6379),
]

# Create cluster client
rc = RedisCluster(
    startup_nodes=startup_nodes,
    password=os.environ['REDIS_PASSWORD'],
    decode_responses=True,
    skip_full_coverage_check=True,
    max_connections_per_node=50,
    retry_on_timeout=True,
    socket_keepalive=True
)

# Example operations
def example_operations():
    # Simple operations
    rc.set('key1', 'value1')
    value = rc.get('key1')
    print(f'Value: {value}')

    # Hash operations
    rc.hset('user:1000', mapping={'name': 'John', 'email': 'john@example.com'})
    user = rc.hgetall('user:1000')
    print(f'User: {user}')

    # Pipeline (within same slot)
    pipe = rc.pipeline()
    pipe.set('{user:1000}:profile', 'data1')
    pipe.set('{user:1000}:settings', 'data2')
    pipe.get('{user:1000}:profile')
    results = pipe.execute()
    print(f'Pipeline results: {results}')

if __name__ == '__main__':
    example_operations()
```

## Managing Cluster Operations

### Adding Nodes

Scale the cluster by adding masters:

```bash
# Update cluster size
kubectl patch rediscluster redis-prod -n redis \
  --type merge \
  --patch '{"spec":{"clusterSize":9}}'

# Watch new nodes join
kubectl get pods -n redis -w

# Verify cluster expanded
kubectl exec -it redis-prod-leader-0 -n redis -- \
  redis-cli -a $REDIS_PASSWORD cluster nodes | grep master
```

### Rebalancing Slots

Manually rebalance hash slots:

```bash
# Get cluster info
kubectl exec -it redis-prod-leader-0 -n redis -- \
  redis-cli -a $REDIS_PASSWORD cluster info

# Rebalance (use redis-cli from any pod)
kubectl exec -it redis-prod-leader-0 -n redis -- \
  redis-cli -a $REDIS_PASSWORD --cluster rebalance \
  redis-prod-leader-0.redis-prod.redis.svc.cluster.local:6379 \
  --cluster-use-empty-masters
```

### Testing Failover

Simulate node failure:

```bash
# Check current master
kubectl exec -it redis-prod-leader-0 -n redis -- \
  redis-cli -a $REDIS_PASSWORD role

# Delete pod to simulate failure
kubectl delete pod redis-prod-leader-0 -n redis

# Watch automatic failover (replica promoted to master)
kubectl exec -it redis-prod-leader-1 -n redis -- \
  redis-cli -a $REDIS_PASSWORD cluster nodes
```

## Monitoring Redis Cluster

Create a monitoring dashboard configuration:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-cluster
  namespace: redis
spec:
  selector:
    matchLabels:
      app: redis-cluster
  endpoints:
  - port: redis-exporter
    interval: 30s
    path: /metrics
```

Key metrics to monitor:

```bash
# Check cluster health
redis_cluster_state
redis_cluster_slots_assigned
redis_cluster_slots_ok
redis_cluster_slots_fail
redis_cluster_known_nodes

# Monitor performance
redis_commands_processed_total
redis_connected_clients
redis_instantaneous_ops_per_sec
redis_memory_used_bytes
redis_memory_max_bytes

# Track keyspace
redis_keyspace_keys
redis_keyspace_expires
redis_expired_keys_total
redis_evicted_keys_total
```

## Backup and Restore

Create backup script:

```bash
#!/bin/bash
# backup-redis-cluster.sh

NAMESPACE="redis"
CLUSTER_NAME="redis-prod"
BACKUP_DIR="/backup"
S3_BUCKET="redis-backups"

# Get all master nodes
MASTERS=$(kubectl get pods -n $NAMESPACE -l app=$CLUSTER_NAME -o name | grep leader)

for MASTER in $MASTERS; do
    POD_NAME=$(basename $MASTER)

    # Trigger RDB save
    kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD BGSAVE

    # Wait for save to complete
    while true; do
        SAVE_STATUS=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD LASTSAVE)
        sleep 5
        CURRENT_STATUS=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD LASTSAVE)
        if [ "$SAVE_STATUS" != "$CURRENT_STATUS" ]; then
            break
        fi
    done

    # Copy RDB file
    kubectl cp $NAMESPACE/$POD_NAME:/data/dump.rdb $BACKUP_DIR/${POD_NAME}-dump.rdb

    # Upload to S3
    aws s3 cp $BACKUP_DIR/${POD_NAME}-dump.rdb s3://$S3_BUCKET/$(date +%Y%m%d)/
done
```

## Conclusion

Redis Cluster mode on Kubernetes provides automatic sharding and high availability for demanding workloads. The Redis Operator simplifies cluster management by automating deployment, scaling, and failover operations while maintaining production-grade reliability.

Key benefits:

- Automatic data sharding across nodes
- Linear scalability by adding masters
- Built-in high availability with automatic failover
- No single point of failure
- Simplified operations through operator automation

By deploying Redis Cluster with the operator, you can build scalable caching and data storage layers that grow with your application needs while maintaining consistent performance and reliability.
