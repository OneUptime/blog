# How to Set Up Ceph RBD Storage for Redis on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Redis, RBD, Kubernetes, Database

Description: Learn how to configure Ceph RBD block storage for Redis on Kubernetes to persist RDB snapshots and AOF logs, ensuring data durability across pod restarts.

---

Redis is an in-memory data store that supports persistence through RDB snapshots and Append-Only File (AOF) logging. Running Redis on Kubernetes with Rook-Ceph RBD ensures that persistence data survives pod restarts and node failures.

## Redis Persistence Options

Two persistence mechanisms in Redis:
- **RDB** - Point-in-time snapshots saved to disk periodically
- **AOF** - Append-only log of every write command for full durability

Both require reliable block storage. Rook-Ceph RBD provides the ReadWriteOnce access mode needed by Redis.

## Creating a Redis Block Pool

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create redis-pool 32 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set redis-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init redis-pool
```

## Creating the StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-redis
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: redis-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying Redis with Persistence

Deploy Redis with both RDB and AOF enabled:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: cache
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2
          command:
            - redis-server
            - /etc/redis/redis.conf
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /etc/redis
      volumes:
        - name: config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: rook-ceph-redis
        resources:
          requests:
            storage: 20Gi
```

## Redis Configuration for RBD Storage

```ini
# redis.conf
# Enable RDB snapshots
save 900 1
save 300 10
save 60 10000

# Enable AOF
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Set data directory
dir /data
dbfilename dump.rdb
appendfilename appendonly.aof

# Enable incremental rehashing
activerehashing yes
```

## Deploying Redis Cluster with Operator

Use the Redis Operator for a production HA cluster:

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: cache
spec:
  clusterSize: 3
  redisLeader:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
          storageClassName: rook-ceph-redis
  redisFollower:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
          storageClassName: rook-ceph-redis
```

## Summary

Ceph RBD provides durable block storage for Redis persistence data on Kubernetes. Both RDB snapshots and AOF logs are stored on the RBD volume, surviving pod restarts and rescheduling. Using `appendfsync everysec` balances durability and write performance on RBD. The Redis Operator further simplifies cluster deployment and uses Rook StorageClasses for per-node volume provisioning.
