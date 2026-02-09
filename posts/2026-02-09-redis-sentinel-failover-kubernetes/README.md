# How to Configure Automatic Failover for Redis Sentinel on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, High Availability

Description: Learn how to deploy Redis with Sentinel on Kubernetes for automatic failover and high availability, including proper quorum configuration and application integration patterns.

---

Redis Sentinel provides automatic failover for Redis master-replica topologies, monitoring cluster health and promoting replicas when the master fails. On Kubernetes, proper Sentinel deployment ensures your applications maintain Redis connectivity during infrastructure failures. This guide demonstrates deploying production-ready Redis Sentinel with automatic failover, proper quorum configuration, and client integration patterns.

## Understanding Redis Sentinel Architecture

Redis Sentinel operates as a separate process that monitors Redis instances. Multiple Sentinel nodes form a distributed system that reaches consensus about master health. When a quorum of Sentinels agrees the master is down, they automatically promote a replica and reconfigure the topology.

The distributed nature prevents split-brain scenarios where network partitions could cause multiple masters. Sentinels use the Raft consensus algorithm to ensure only one replica promotes to master during failures, maintaining data consistency.

## Deploying Redis with Sentinel

Create a complete Redis deployment with Sentinel:

```yaml
# redis-sentinel.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: redis
data:
  master.conf: |
    bind 0.0.0.0
    port 6379
    protected-mode no
    dir /data
    # Persistence configuration
    save 900 1
    save 300 10
    save 60 10000
    appendonly yes
    appendfsync everysec

  replica.conf: |
    bind 0.0.0.0
    port 6379
    protected-mode no
    dir /data
    replicaof redis-master-0.redis-master.redis.svc.cluster.local 6379
    # Read-only replica
    replica-read-only yes
    # Persistence
    appendonly yes
    appendfsync everysec

  sentinel.conf: |
    bind 0.0.0.0
    port 26379
    protected-mode no
    dir /data
    sentinel monitor mymaster redis-master-0.redis-master.redis.svc.cluster.local 6379 2
    sentinel down-after-milliseconds mymaster 5000
    sentinel parallel-syncs mymaster 1
    sentinel failover-timeout mymaster 10000
---
# Redis Master StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-master
  namespace: redis
spec:
  serviceName: redis-master
  replicas: 1
  selector:
    matchLabels:
      app: redis
      role: master
  template:
    metadata:
      labels:
        app: redis
        role: master
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - /etc/redis/master.conf
          volumeMounts:
            - name: redis-config
              mountPath: /etc/redis
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
          livenessProbe:
            tcpSocket:
              port: 6379
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
# Redis Replica StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-replica
  namespace: redis
spec:
  serviceName: redis-replica
  replicas: 2
  selector:
    matchLabels:
      app: redis
      role: replica
  template:
    metadata:
      labels:
        app: redis
        role: replica
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - /etc/redis/replica.conf
          volumeMounts:
            - name: redis-config
              mountPath: /etc/redis
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
# Redis Sentinel StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sentinel
  namespace: redis
spec:
  serviceName: redis-sentinel
  replicas: 3
  selector:
    matchLabels:
      app: redis-sentinel
  template:
    metadata:
      labels:
        app: redis-sentinel
    spec:
      initContainers:
        - name: config-init
          image: redis:7.2-alpine
          command:
            - sh
            - -c
            - |
              cp /tmp/sentinel/sentinel.conf /etc/redis/sentinel.conf
              # Make sentinel.conf writable
              chmod 666 /etc/redis/sentinel.conf
          volumeMounts:
            - name: sentinel-config
              mountPath: /tmp/sentinel
            - name: sentinel-data
              mountPath: /etc/redis
      containers:
        - name: sentinel
          image: redis:7.2-alpine
          ports:
            - containerPort: 26379
          command:
            - redis-sentinel
            - /etc/redis/sentinel.conf
          volumeMounts:
            - name: sentinel-data
              mountPath: /etc/redis
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
      volumes:
        - name: sentinel-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: sentinel-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
---
# Services
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: redis
spec:
  clusterIP: None
  selector:
    app: redis
    role: master
  ports:
    - port: 6379
      targetPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-replica
  namespace: redis
spec:
  clusterIP: None
  selector:
    app: redis
    role: replica
  ports:
    - port: 6379
      targetPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: redis
spec:
  selector:
    app: redis-sentinel
  ports:
    - port: 26379
      targetPort: 26379
  type: ClusterIP
```

Deploy Redis with Sentinel:

```bash
kubectl create namespace redis
kubectl apply -f redis-sentinel.yaml

# Watch deployment
kubectl get pods -n redis -w

# Verify Sentinel is monitoring
kubectl exec -it -n redis redis-sentinel-0 -- \
  redis-cli -p 26379 sentinel master mymaster
```

## Verifying Sentinel Configuration

Check Sentinel status:

```bash
# Connect to Sentinel
kubectl exec -it -n redis redis-sentinel-0 -- redis-cli -p 26379

# Inside redis-cli
SENTINEL masters
# Shows monitored master configuration

SENTINEL replicas mymaster
# Shows all replicas

SENTINEL sentinels mymaster
# Shows all Sentinel nodes

SENTINEL get-master-addr-by-name mymaster
# Returns current master address
```

Verify replication:

```bash
# Check master replication status
kubectl exec -it -n redis redis-master-0 -- redis-cli info replication

# Check replica status
kubectl exec -it -n redis redis-replica-0 -- redis-cli info replication
```

## Testing Automatic Failover

Simulate master failure:

```bash
# Delete master pod
kubectl delete pod -n redis redis-master-0

# Watch Sentinel promote replica
kubectl exec -it -n redis redis-sentinel-0 -- \
  redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# Check logs
kubectl logs -n redis redis-sentinel-0

# Expected output:
# +sdown master mymaster ...
# +odown master mymaster ...
# +failover-triggered ...
# +promoted-slave replica ...
# +failover-end ...

# Verify new master
kubectl exec -it -n redis redis-replica-0 -- redis-cli info replication
# Should show role: master

# Old master rejoins as replica when pod restarts
kubectl get pods -n redis -w
```

## Configuring Application Clients

Use Sentinel-aware clients for automatic failover:

```python
# Python example with redis-py
from redis.sentinel import Sentinel

# Connect to Sentinel
sentinel = Sentinel([
    ('redis-sentinel.redis.svc.cluster.local', 26379),
], socket_timeout=0.1)

# Get master connection
master = sentinel.master_for(
    'mymaster',
    socket_timeout=0.1,
    password=None,
    db=0
)

# Get slave connection for reads
slave = sentinel.slave_for(
    'mymaster',
    socket_timeout=0.1,
    password=None,
    db=0
)

# Write to master
master.set('key', 'value')

# Read from slave (load distribution)
value = slave.get('key')

# Sentinel handles failover automatically
# No application changes needed during master promotion
```

```go
// Go example with go-redis
package main

import (
    "context"
    "github.com/go-redis/redis/v8"
)

func main() {
    ctx := context.Background()

    // Connect via Sentinel
    client := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName:    "mymaster",
        SentinelAddrs: []string{
            "redis-sentinel.redis.svc.cluster.local:26379",
        },
    })

    // Write
    err := client.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }

    // Read
    val, err := client.Get(ctx, "key").Result()
    if err != nil {
        panic(err)
    }
    println(val)

    // Client automatically reconnects after failover
}
```

## Implementing Proper Quorum Configuration

Configure quorum for split-brain protection:

```yaml
data:
  sentinel.conf: |
    # Quorum must be majority of Sentinels (N/2 + 1)
    # With 3 Sentinels, quorum should be 2
    sentinel monitor mymaster redis-master-0.redis-master.redis.svc.cluster.local 6379 2

    # Faster failover detection
    sentinel down-after-milliseconds mymaster 5000

    # Conservative parallel sync (reduce load during failover)
    sentinel parallel-syncs mymaster 1

    # Failover timeout
    sentinel failover-timeout mymaster 10000

    # Notification scripts (optional)
    # sentinel notification-script mymaster /path/to/script.sh
```

For 5 Sentinels, use quorum 3. For 7 Sentinels, use quorum 4.

## Monitoring Sentinel Health

Deploy Prometheus exporter:

```yaml
# redis-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
    spec:
      containers:
        - name: exporter
          image: oliver006/redis_exporter:latest
          ports:
            - containerPort: 9121
          env:
            - name: REDIS_ADDR
              value: redis://redis-master.redis:6379
            - name: REDIS_PASSWORD
              value: ""
---
apiVersion: v1
kind: Service
metadata:
  name: redis-exporter
  namespace: redis
spec:
  selector:
    app: redis-exporter
  ports:
    - port: 9121
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-monitor
  namespace: redis
spec:
  selector:
    matchLabels:
      app: redis-exporter
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics to monitor:

```promql
# Sentinel status
redis_sentinel_masters

# Replication lag
redis_replication_lag_seconds

# Connected slaves
redis_connected_slaves

# Failover events
increase(redis_sentinel_failovers_total[1h])
```

## Handling Network Partitions

Configure network policies to prevent split-brain:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-sentinel-policy
  namespace: redis
spec:
  podSelector:
    matchLabels:
      app: redis-sentinel
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 26379
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

## Scaling Sentinels

Add more Sentinels for better failure detection:

```bash
# Scale to 5 Sentinels
kubectl scale statefulset redis-sentinel --replicas=5 -n redis

# Update quorum to 3 (majority of 5)
kubectl edit configmap redis-config -n redis
# Change: sentinel monitor mymaster ... 3

# Restart Sentinels to apply config
kubectl rollout restart statefulset redis-sentinel -n redis
```

## Backup and Recovery

Implement automated backups:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
  namespace: redis
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: redis:7.2-alpine
              command:
                - sh
                - -c
                - |
                  # Get current master from Sentinel
                  MASTER=$(redis-cli -h redis-sentinel -p 26379 \
                    SENTINEL get-master-addr-by-name mymaster | head -1)

                  # Trigger BGSAVE on master
                  redis-cli -h $MASTER BGSAVE

                  # Wait for save to complete
                  while [ "$(redis-cli -h $MASTER LASTSAVE)" = "$(date +%s)" ]; do
                    sleep 1
                  done

                  # Copy RDB file to S3
                  # ... implement S3 copy ...
          restartPolicy: OnFailure
```

## Conclusion

Redis Sentinel provides robust automatic failover for Redis on Kubernetes through distributed consensus and health monitoring. The Sentinel architecture prevents split-brain scenarios while enabling rapid failover when masters fail, typically completing promotion in under 10 seconds.

The key to successful deployment is proper quorum configuration matching your Sentinel count and using Sentinel-aware client libraries that automatically discover the current master. Combined with appropriate monitoring and testing of failover procedures, Redis Sentinel delivers the high availability required for production caching and session storage workloads on Kubernetes.
