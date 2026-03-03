# How to Configure Ceph Block Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ceph, Block Storage, Rook-Ceph, Kubernetes, Persistent Storage

Description: Learn how to configure and use Ceph RBD block storage for persistent workloads on your Talos Linux Kubernetes cluster.

---

Ceph block storage, also known as RBD (RADOS Block Device), provides high-performance persistent volumes for Kubernetes workloads. When running Rook-Ceph on a Talos Linux cluster, block storage is the most commonly used storage type because it offers the best performance for databases, message queues, and other workloads that need fast, reliable disk access.

This guide covers configuring Ceph block storage pools, creating storage classes, and using block volumes with your applications on Talos Linux.

## Prerequisites

You need a running Rook-Ceph cluster on your Talos Linux nodes. The Rook operator should be installed and the CephCluster resource should show a healthy status.

```bash
# Verify Ceph cluster health
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status

# Check that OSDs are up
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd tree
```

The output should show HEALTH_OK and all OSDs should be in the "up" state.

## Understanding Ceph Block Storage

Ceph block storage works by creating virtual block devices backed by the Ceph RADOS storage pool. Each PersistentVolume in Kubernetes maps to an RBD image in Ceph. These block devices are replicated across multiple OSDs for fault tolerance and can be snapshotted for backups.

The main components are:

- CephBlockPool: defines how data is replicated
- StorageClass: lets Kubernetes provision volumes automatically
- PersistentVolumeClaim: requests a volume from the storage class

## Creating a Block Pool

A CephBlockPool determines the replication strategy for your block devices:

```yaml
# replicated-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    compression_mode: none
    target_size_ratio: ".5"
```

For clusters with more nodes, you can use erasure coding for better storage efficiency:

```yaml
# ec-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 2
    codingChunks: 1
```

Apply the pool configurations:

```bash
# Create the replicated pool
kubectl apply -f replicated-pool.yaml

# Verify the pool was created
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd pool ls detail
```

## Creating Storage Classes

With the pool in place, create a StorageClass that uses it:

```yaml
# ceph-block-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicated-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - discard
```

For workloads that need different performance characteristics, create multiple storage classes:

```yaml
# ceph-block-fast.yaml - for databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block-fast
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicated-pool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: xfs
reclaimPolicy: Retain
allowVolumeExpansion: true
```

```bash
# Apply the storage classes
kubectl apply -f ceph-block-sc.yaml
kubectl apply -f ceph-block-fast.yaml

# Verify they exist
kubectl get storageclass
```

## Using Block Storage in Deployments

Now you can request block storage in your workloads:

```yaml
# postgres-with-ceph.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: ceph-block-fast
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 4Gi
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-data
```

```bash
# Deploy PostgreSQL with Ceph block storage
kubectl apply -f postgres-with-ceph.yaml

# Check the PVC is bound
kubectl get pvc -n databases

# Verify the pod is running
kubectl get pods -n databases
```

## Volume Snapshots

Ceph block storage supports volume snapshots for point-in-time backups:

```yaml
# snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ceph-block-snapshot
driver: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

```yaml
# create-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-20240115
  namespace: databases
spec:
  volumeSnapshotClassName: ceph-block-snapshot
  source:
    persistentVolumeClaimName: postgres-data
```

```bash
# Apply the snapshot class
kubectl apply -f snapshot-class.yaml

# Create a snapshot
kubectl apply -f create-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot -n databases
```

## Expanding Volumes

One of the benefits of Ceph block storage is online volume expansion:

```bash
# Edit the PVC to increase size
kubectl patch pvc postgres-data -n databases \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Monitor the resize
kubectl get pvc postgres-data -n databases -w
```

The volume will expand without any downtime for the pod using it.

## Performance Tuning

For better performance on Talos Linux, consider these adjustments:

```yaml
# Pool-level tuning
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: high-performance-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    compression_mode: none
    min_size: "2"
  mirroring:
    enabled: false
  quotas:
    maxSize: "500Gi"
```

Monitor pool performance:

```bash
# Check pool IO statistics
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd pool stats replicated-pool

# Check RBD image performance
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- rbd perf image iotop --pool=replicated-pool

# Check overall cluster performance
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd perf
```

## Restoring from Snapshots

To restore a volume from a snapshot:

```yaml
# restore-from-snapshot.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: databases
spec:
  storageClassName: ceph-block-fast
  dataSource:
    name: postgres-snapshot-20240115
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

## Troubleshooting

Common issues with Ceph block storage on Talos Linux:

```bash
# Check if the CSI driver pods are running
kubectl get pods -n rook-ceph -l app=csi-rbdplugin

# Check CSI provisioner logs
kubectl logs -n rook-ceph -l app=csi-rbdplugin-provisioner -c csi-rbdplugin

# Check for volume attachment issues
kubectl get volumeattachments

# Verify RBD images in the pool
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- rbd ls replicated-pool
```

If a PVC is stuck in Pending state, it usually means the CSI driver cannot communicate with the Ceph cluster, or there is not enough capacity in the pool.

## Summary

Ceph block storage on Talos Linux provides a reliable, scalable persistent storage layer for your stateful workloads. By creating pools with the right replication strategy and storage classes with appropriate performance settings, you can serve everything from development databases to production transaction logs. The snapshot capability adds a practical backup strategy, and online volume expansion means you never have to take downtime to grow your storage. With Rook managing the Ceph cluster, all of this runs natively within your Talos Linux Kubernetes environment.
