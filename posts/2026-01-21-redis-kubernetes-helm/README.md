# How to Deploy Redis on Kubernetes with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Helm, DevOps, Cloud Native, High Availability, StatefulSet

Description: A comprehensive guide to deploying Redis on Kubernetes using Helm charts, covering standalone and cluster modes, persistence, high availability with Sentinel, production configurations, and monitoring setup.

---

Deploying Redis on Kubernetes provides scalability, high availability, and simplified management for your caching and data storage needs. Helm charts make this deployment even easier by providing pre-configured, production-ready templates.

In this guide, we will walk through deploying Redis on Kubernetes using the Bitnami Helm chart, covering standalone deployments, Redis Cluster, Sentinel for high availability, and production best practices.

## Prerequisites

Before starting, ensure you have:

- A running Kubernetes cluster (v1.23 or later)
- kubectl configured to communicate with your cluster
- Helm 3.x installed
- Basic understanding of Kubernetes concepts (Pods, Services, StatefulSets)
- At least 2 GB of available cluster memory

## Installing Helm

If you do not have Helm installed:

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

## Adding the Bitnami Repository

The Bitnami Helm repository provides well-maintained Redis charts:

```bash
# Add Bitnami repository
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update repository cache
helm repo update

# Search for Redis charts
helm search repo bitnami/redis
```

## Standalone Redis Deployment

### Basic Installation

The simplest way to deploy Redis:

```bash
# Install Redis with default settings
helm install my-redis bitnami/redis

# Check deployment status
kubectl get pods -l app.kubernetes.io/name=redis

# Get Redis password
export REDIS_PASSWORD=$(kubectl get secret my-redis -o jsonpath="{.data.redis-password}" | base64 -d)
echo $REDIS_PASSWORD
```

### Custom Values File

Create a `redis-values.yaml` file for customization:

```yaml
# redis-values.yaml
architecture: standalone

auth:
  enabled: true
  password: "your-secure-password"

master:
  persistence:
    enabled: true
    size: 8Gi
    storageClass: "standard"

  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m

  configuration: |
    maxmemory 400mb
    maxmemory-policy allkeys-lru
    appendonly yes
    appendfsync everysec

service:
  type: ClusterIP
  port: 6379

metrics:
  enabled: true
  serviceMonitor:
    enabled: false
```

Install with custom values:

```bash
helm install my-redis bitnami/redis -f redis-values.yaml
```

### Verifying the Deployment

```bash
# Check pods
kubectl get pods -l app.kubernetes.io/name=redis

# Check services
kubectl get svc -l app.kubernetes.io/name=redis

# Check PVC
kubectl get pvc -l app.kubernetes.io/name=redis

# View logs
kubectl logs -l app.kubernetes.io/name=redis -f
```

## Redis with Replication

Deploy Redis with master-replica architecture:

```yaml
# redis-replication-values.yaml
architecture: replication

auth:
  enabled: true
  password: "your-secure-password"

master:
  persistence:
    enabled: true
    size: 8Gi

  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 500m

replica:
  replicaCount: 2
  persistence:
    enabled: true
    size: 8Gi

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

Install:

```bash
helm install my-redis bitnami/redis -f redis-replication-values.yaml
```

## Redis Sentinel for High Availability

Redis Sentinel provides automatic failover:

```yaml
# redis-sentinel-values.yaml
architecture: replication

auth:
  enabled: true
  password: "your-secure-password"
  sentinel: true

sentinel:
  enabled: true
  masterSet: mymaster
  quorum: 2

  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 128Mi
      cpu: 100m

master:
  persistence:
    enabled: true
    size: 8Gi

  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 500m

replica:
  replicaCount: 2
  persistence:
    enabled: true
    size: 8Gi

  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 500m
```

Install:

```bash
helm install my-redis bitnami/redis -f redis-sentinel-values.yaml
```

### Connecting to Sentinel

```bash
# Get Sentinel service
kubectl get svc -l app.kubernetes.io/component=sentinel

# Port forward to Sentinel
kubectl port-forward svc/my-redis-sentinel 26379:26379

# Connect using redis-cli
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

## Redis Cluster Mode

For horizontal scaling with automatic sharding:

```yaml
# redis-cluster-values.yaml
cluster:
  enabled: true
  nodes: 6
  replicas: 1

auth:
  password: "your-secure-password"

persistence:
  enabled: true
  size: 8Gi

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

Install using the Redis Cluster chart:

```bash
helm install my-redis-cluster bitnami/redis-cluster -f redis-cluster-values.yaml
```

## Production Configuration

Here is a comprehensive production-ready configuration:

```yaml
# redis-production-values.yaml
architecture: replication

global:
  storageClass: "fast-ssd"

auth:
  enabled: true
  password: ""  # Will be auto-generated
  existingSecret: ""
  existingSecretPasswordKey: ""

master:
  count: 1

  persistence:
    enabled: true
    size: 20Gi
    storageClass: "fast-ssd"

  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m

  configuration: |
    # Memory
    maxmemory 1800mb
    maxmemory-policy allkeys-lru
    maxmemory-samples 5

    # Persistence
    appendonly yes
    appendfsync everysec
    no-appendfsync-on-rewrite no
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb

    # Performance
    tcp-keepalive 300
    timeout 0
    tcp-backlog 511

    # Lazy freeing
    lazyfree-lazy-eviction yes
    lazyfree-lazy-expire yes
    lazyfree-lazy-server-del yes

    # Disable dangerous commands
    rename-command FLUSHDB ""
    rename-command FLUSHALL ""
    rename-command DEBUG ""

  podAntiAffinityPreset: hard

  nodeSelector:
    workload-type: stateful

  tolerations:
    - key: "workload-type"
      operator: "Equal"
      value: "stateful"
      effect: "NoSchedule"

  podSecurityContext:
    enabled: true
    fsGroup: 1001

  containerSecurityContext:
    enabled: true
    runAsUser: 1001
    runAsNonRoot: true

replica:
  replicaCount: 2

  persistence:
    enabled: true
    size: 20Gi
    storageClass: "fast-ssd"

  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m

  podAntiAffinityPreset: hard

  nodeSelector:
    workload-type: stateful

  tolerations:
    - key: "workload-type"
      operator: "Equal"
      value: "stateful"
      effect: "NoSchedule"

sentinel:
  enabled: true
  masterSet: mymaster
  quorum: 2
  downAfterMilliseconds: 10000
  failoverTimeout: 180000

  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 256Mi
      cpu: 200m

networkPolicy:
  enabled: true
  allowExternal: false

metrics:
  enabled: true

  serviceMonitor:
    enabled: true
    namespace: monitoring
    interval: 30s

  prometheusRule:
    enabled: true
    namespace: monitoring
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis instance is down"
          description: "Redis instance {{ $labels.instance }} is down"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage is high"
          description: "Redis memory usage is above 90%"

pdb:
  create: true
  minAvailable: 1
```

Install:

```bash
helm install redis-prod bitnami/redis -f redis-production-values.yaml -n redis --create-namespace
```

## Connecting from Applications

### Kubernetes Service DNS

Redis services are accessible via Kubernetes DNS:

```
# Standalone/Master
my-redis-master.default.svc.cluster.local:6379

# Replicas (read-only)
my-redis-replicas.default.svc.cluster.local:6379

# Sentinel
my-redis-sentinel.default.svc.cluster.local:26379
```

### Python Application

Create a Kubernetes deployment:

```yaml
# python-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-redis-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: python-redis-app
  template:
    metadata:
      labels:
        app: python-redis-app
    spec:
      containers:
        - name: app
          image: python:3.11-slim
          command: ["python", "-c"]
          args:
            - |
              import redis
              import os
              import time

              # For Sentinel setup
              from redis.sentinel import Sentinel

              sentinel = Sentinel([
                  ('my-redis-sentinel', 26379)
              ], socket_timeout=0.5)

              master = sentinel.master_for(
                  'mymaster',
                  password=os.getenv('REDIS_PASSWORD'),
                  socket_timeout=0.5
              )

              while True:
                  try:
                      master.set('heartbeat', str(time.time()))
                      print(f"Heartbeat: {master.get('heartbeat')}")
                  except Exception as e:
                      print(f"Error: {e}")
                  time.sleep(5)
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: my-redis
                  key: redis-password
```

Python code for your application:

```python
import os
import redis
from redis.sentinel import Sentinel

# Simple connection
def get_redis_client():
    return redis.Redis(
        host=os.getenv('REDIS_HOST', 'my-redis-master'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        password=os.getenv('REDIS_PASSWORD'),
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5
    )

# Sentinel connection for HA
def get_sentinel_client():
    sentinel = Sentinel([
        (os.getenv('SENTINEL_HOST', 'my-redis-sentinel'), 26379)
    ], socket_timeout=0.5)

    # Get master for writes
    master = sentinel.master_for(
        'mymaster',
        password=os.getenv('REDIS_PASSWORD'),
        decode_responses=True
    )

    # Get slave for reads
    slave = sentinel.slave_for(
        'mymaster',
        password=os.getenv('REDIS_PASSWORD'),
        decode_responses=True
    )

    return master, slave

# Usage
client = get_redis_client()
client.set('key', 'value')
print(client.get('key'))
```

### Node.js Application

```javascript
const Redis = require('ioredis');

// Simple connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'my-redis-master',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Sentinel connection for HA
const redisSentinel = new Redis({
  sentinels: [
    { host: process.env.SENTINEL_HOST || 'my-redis-sentinel', port: 26379 },
  ],
  name: 'mymaster',
  password: process.env.REDIS_PASSWORD,
  sentinelPassword: process.env.REDIS_PASSWORD,
});

// Cluster connection
const cluster = new Redis.Cluster([
  { host: 'my-redis-cluster-0', port: 6379 },
  { host: 'my-redis-cluster-1', port: 6379 },
  { host: 'my-redis-cluster-2', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
});

// Usage
async function main() {
  await redis.set('key', 'value');
  const value = await redis.get('key');
  console.log(value);
}

main().catch(console.error);
```

### Go Application

```go
package main

import (
    "context"
    "log"
    "os"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Simple connection
    client := redis.NewClient(&redis.Options{
        Addr:         os.Getenv("REDIS_HOST") + ":6379",
        Password:     os.Getenv("REDIS_PASSWORD"),
        DB:           0,
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })
    defer client.Close()

    // Sentinel connection for HA
    sentinelClient := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName: "mymaster",
        SentinelAddrs: []string{
            os.Getenv("SENTINEL_HOST") + ":26379",
        },
        Password:         os.Getenv("REDIS_PASSWORD"),
        SentinelPassword: os.Getenv("REDIS_PASSWORD"),
    })
    defer sentinelClient.Close()

    // Cluster connection
    clusterClient := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs: []string{
            "my-redis-cluster-0:6379",
            "my-redis-cluster-1:6379",
            "my-redis-cluster-2:6379",
        },
        Password: os.Getenv("REDIS_PASSWORD"),
    })
    defer clusterClient.Close()

    // Usage
    err := client.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        log.Fatal(err)
    }

    val, err := client.Get(ctx, "key").Result()
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("key: %s", val)
}
```

## Monitoring with Prometheus

### Enable Metrics

The metrics are already enabled in the production configuration. Access them:

```bash
# Port forward to metrics
kubectl port-forward svc/my-redis-metrics 9121:9121

# View metrics
curl http://localhost:9121/metrics
```

### Grafana Dashboard

Import the Redis dashboard (ID: 763) in Grafana for comprehensive monitoring.

### Key Metrics to Monitor

- `redis_up` - Redis instance availability
- `redis_memory_used_bytes` - Memory usage
- `redis_connected_clients` - Number of connected clients
- `redis_commands_processed_total` - Command throughput
- `redis_keyspace_hits_total` / `redis_keyspace_misses_total` - Cache hit ratio
- `redis_connected_slaves` - Replication status

## Backup and Restore

### Manual Backup

```bash
# Create a backup
kubectl exec -it my-redis-master-0 -- redis-cli -a $REDIS_PASSWORD BGSAVE

# Copy RDB file
kubectl cp my-redis-master-0:/data/dump.rdb ./redis-backup.rdb

# Verify backup
ls -la redis-backup.rdb
```

### Automated Backup with CronJob

```yaml
# redis-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: redis:7-alpine
              command:
                - /bin/sh
                - -c
                - |
                  redis-cli -h my-redis-master -a $REDIS_PASSWORD BGSAVE
                  sleep 10
                  # Copy to S3 or other storage
              env:
                - name: REDIS_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: my-redis
                      key: redis-password
          restartPolicy: OnFailure
```

## Upgrading Redis

### Helm Upgrade

```bash
# Check current values
helm get values my-redis

# Upgrade with new values
helm upgrade my-redis bitnami/redis -f redis-values.yaml

# Monitor the upgrade
kubectl rollout status statefulset/my-redis-master
kubectl rollout status statefulset/my-redis-replicas
```

### Version Upgrade

```yaml
# Update image tag in values
image:
  tag: "7.2"
```

```bash
helm upgrade my-redis bitnami/redis -f redis-values.yaml
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod my-redis-master-0

# Check logs
kubectl logs my-redis-master-0

# Check PVC
kubectl describe pvc redis-data-my-redis-master-0
```

### Connection Issues

```bash
# Test connectivity from another pod
kubectl run redis-test --rm -it --image=redis:7-alpine -- redis-cli -h my-redis-master -a $REDIS_PASSWORD ping

# Check service endpoints
kubectl get endpoints my-redis-master
```

### Memory Issues

```bash
# Check memory usage
kubectl exec my-redis-master-0 -- redis-cli -a $REDIS_PASSWORD INFO memory

# Check Kubernetes resource usage
kubectl top pod my-redis-master-0
```

### Replication Issues

```bash
# Check replication status
kubectl exec my-redis-master-0 -- redis-cli -a $REDIS_PASSWORD INFO replication

# Check replica logs
kubectl logs my-redis-replicas-0
```

## Cleanup

```bash
# Uninstall Redis
helm uninstall my-redis

# Delete PVCs (data will be lost)
kubectl delete pvc -l app.kubernetes.io/name=redis

# Delete namespace
kubectl delete namespace redis
```

## Conclusion

Deploying Redis on Kubernetes with Helm provides a robust, scalable solution for caching and data storage. Key takeaways:

- Use the Bitnami Helm chart for production-ready deployments
- Enable Sentinel for automatic failover in production
- Configure proper resource limits and persistence
- Implement monitoring with Prometheus and Grafana
- Use network policies to restrict access
- Regularly backup your data

With proper configuration, Redis on Kubernetes can handle demanding workloads while maintaining high availability and data durability.
