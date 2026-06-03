# How to Configure Automatic Failover for Redis Sentinel on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, High Availability

Description: Learn how to deploy Redis with Sentinel on Kubernetes for automatic failover and high availability, including proper quorum configuration and application integration patterns.

---

Redis Sentinel provides automatic failover for Redis master-replica topologies, monitoring cluster health and promoting replicas when the master fails. On Kubernetes, proper Sentinel deployment helps your applications maintain Redis connectivity during infrastructure failures. This guide demonstrates deploying Redis Sentinel with automatic failover, proper quorum configuration, and client integration patterns.

## Understanding Redis Sentinel Architecture

Redis Sentinel operates as a separate process that monitors Redis instances. Multiple Sentinel nodes form a distributed system that reaches agreement about master health. When enough Sentinels report the master as down and a failover is authorized by a majority of known Sentinels, they promote a replica and reconfigure the topology.

The distributed nature reduces split-brain risk during network partitions. Sentinels use quorum checks, epochs, leader election, and majority authorization to coordinate failover so only one Sentinel leads a given promotion.

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

# Sentinel reconfigures the old master as a replica after it becomes reachable again
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
    "github.com/redis/go-redis/v9"
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
    # Quorum is the number of Sentinels that must agree the master is unreachable.
    # Failover still requires authorization from a majority of known Sentinels.
    # With 3 Sentinels, quorum 2 is a common production setting.
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

For 5 Sentinels, quorum 2 or 3 are common choices depending on how quickly you want failover detection to trigger; failover authorization still requires at least 3 Sentinels. For 7 Sentinels, authorization requires at least 4 Sentinels.

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
            - name: metrics
              containerPort: 9121
          env:
            - name: REDIS_ADDR
              value: redis://redis-sentinel.redis:26379
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
    - name: metrics
      port: 9121
      targetPort: metrics
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

# Replica lag reported by the master
redis_connected_slave_lag_seconds

# Connected slaves
redis_connected_slaves

# Failover/configuration changes
changes(redis_sentinel_master_config_epoch[1h])
```

## Handling Network Partitions

Configure network policies to preserve required Sentinel communication while limiting access:

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
        - podSelector:
            matchLabels:
              app: redis-sentinel
        - podSelector:
            matchLabels:
              app: redis-client
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
    - to:
        - podSelector:
            matchLabels:
              app: redis-sentinel
      ports:
        - protocol: TCP
          port: 26379
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Scaling Sentinels

Add more Sentinels for better failure detection:

```bash
# Scale to 5 Sentinels
kubectl scale statefulset redis-sentinel --replicas=5 -n redis

# Update quorum if you want a higher down-detection threshold
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
                  LASTSAVE=$(redis-cli -h $MASTER LASTSAVE)
                  while [ "$(redis-cli -h $MASTER LASTSAVE)" = "$LASTSAVE" ]; do
                    sleep 1
                  done

                  # Copy RDB file to S3
                  # ... implement S3 copy ...
          restartPolicy: OnFailure
```

## Conclusion

Redis Sentinel provides robust automatic failover for Redis on Kubernetes through distributed health monitoring and coordinated failover. The Sentinel architecture reduces split-brain risk while enabling rapid failover when masters fail, with promotion time depending on `down-after-milliseconds`, `failover-timeout`, network conditions, and replica synchronization state.

The key to successful deployment is proper quorum configuration matching your Sentinel count and using Sentinel-aware client libraries that automatically discover the current master. Combined with appropriate monitoring and testing of failover procedures, Redis Sentinel delivers the high availability required for production caching and session storage workloads on Kubernetes.
