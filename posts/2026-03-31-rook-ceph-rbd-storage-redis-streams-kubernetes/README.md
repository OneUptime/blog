# How to Set Up Ceph RBD Storage for Redis Streams on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Redis, Kubernetes, Storage, RBD, Stream

Description: Learn how to provision Ceph RBD block storage for Redis Streams on Kubernetes using Rook, enabling persistent, high-performance message stream storage.

---

## Why Ceph RBD for Redis Streams

Redis Streams provide an append-only log structure for event-driven architectures. When deployed on Kubernetes, Redis pods need fast, persistent block storage to survive restarts without data loss. Ceph RBD (RADOS Block Device) provides exactly that - a block device backed by distributed Ceph storage that delivers consistent I/O performance.

## Prerequisites

- A running Rook-Ceph cluster (v1.13+)
- Kubernetes 1.26+
- `kubectl` configured with cluster access

## Create a Ceph BlockPool and StorageClass

First, create a dedicated BlockPool for Redis workloads:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: redis-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  compressionMode: none
```

Then create a StorageClass that references the pool:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-redis
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: redis-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Deploy Redis with Persistent RBD Storage

Create a PersistentVolumeClaim and Redis StatefulSet:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-streams-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ceph-rbd-redis
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-streams
spec:
  serviceName: redis-streams
  replicas: 1
  selector:
    matchLabels:
      app: redis-streams
  template:
    metadata:
      labels:
        app: redis-streams
    spec:
      containers:
        - name: redis
          image: redis:7.2
          args: ["--appendonly", "yes", "--save", "60", "1"]
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: redis-streams-pvc
```

## Verify the Setup

After applying the manifests, verify the PVC is bound:

```bash
kubectl get pvc redis-streams-pvc
# NAME                  STATUS   VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS       AGE
# redis-streams-pvc     Bound    pvc-...  20Gi       RWO            ceph-rbd-redis     10s
```

Test Redis Streams connectivity:

```bash
kubectl exec -it redis-streams-0 -- redis-cli
> XADD mystream * field1 value1
> XLEN mystream
```

## Tuning Tips

- Set `rbd_cache = true` in the Ceph client config for better read performance.
- Use `imageFeatures: layering,fast-diff,object-map,deep-flatten` for production.
- Monitor RBD pool utilization with `ceph df` and `rbd du`.

## Summary

Ceph RBD provides durable block storage ideal for Redis Streams on Kubernetes. By creating a dedicated BlockPool and StorageClass, you ensure Redis data persists across pod restarts. This setup is well-suited for event-driven workloads that require low-latency, high-throughput message storage.
