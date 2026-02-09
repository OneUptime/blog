# How to Configure CephFS Shared File System for ReadWriteMany Access Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, CephFS, Kubernetes

Description: Deploy CephFS shared filesystem with Rook operator for ReadWriteMany persistent volumes supporting concurrent pod access with metadata server configuration and performance tuning.

---

CephFS provides a POSIX-compliant shared filesystem built on Ceph's distributed object storage. Unlike Ceph RBD which only supports ReadWriteOnce access, CephFS enables ReadWriteMany mode where multiple pods across different nodes can simultaneously read and write to the same volume. This makes CephFS ideal for shared configuration, log aggregation, and content management workloads.

## CephFS Architecture

CephFS separates data and metadata handling. File data is stored across Ceph OSDs just like RBD, but metadata (directory structures, file attributes, permissions) is managed by dedicated Metadata Server (MDS) daemons. The MDS enables concurrent access by coordinating locks and caching metadata across clients.

Multiple active MDS daemons provide load balancing and failover for metadata operations. Standby MDS daemons automatically take over if active ones fail, ensuring high availability for filesystem operations.

## Prerequisites

You need a functioning Rook-Ceph cluster before deploying CephFS. Follow the Ceph RBD deployment guide to establish the base cluster.

```bash
# Verify Ceph cluster is healthy
kubectl get cephcluster -n rook-ceph
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status
```

## Deploying CephFS

Create a CephFilesystem resource that provisions MDS daemons and storage pools.

```yaml
# cephfs.yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
      requireSafeReplicaSize: true
    parameters:
      compression_mode: none
  dataPools:
  - name: data0
    replicated:
      size: 3
      requireSafeReplicaSize: true
    parameters:
      compression_mode: none
  preserveFilesystemOnDelete: false
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"
```

Deploy CephFS:

```bash
kubectl apply -f cephfs.yaml

# Watch MDS pods start
watch kubectl get pods -n rook-ceph -l app=rook-ceph-mds

# Verify filesystem creation
kubectl get cephfilesystem -n rook-ceph
```

## Creating StorageClass

Define a StorageClass for dynamic CephFS PVC provisioning.

```yaml
# cephfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
- noatime
- nodiratime
```

Apply the StorageClass:

```bash
kubectl apply -f cephfs-storageclass.yaml
kubectl get storageclass rook-cephfs
```

## Testing ReadWriteMany Access

Create a deployment with multiple replicas sharing a single volume.

```yaml
# shared-storage-test.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-logs
  namespace: default
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-cephfs
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: log-writer
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: log-writer
  template:
    metadata:
      labels:
        app: log-writer
    spec:
      containers:
      - name: writer
        image: busybox
        command:
        - sh
        - -c
        - |
          while true; do
            echo "$(date) - Log from $(hostname)" >> /logs/app.log
            sleep 5
          done
        volumeMounts:
        - name: logs
          mountPath: /logs
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: shared-logs
```

Deploy and verify concurrent access:

```bash
kubectl apply -f shared-storage-test.yaml

# Wait for pods to start
kubectl wait --for=condition=ready pod -l app=log-writer --timeout=60s

# Check all pods are writing to shared volume
kubectl exec deploy/log-writer -- tail -20 /logs/app.log

# Verify different pods wrote to same file
kubectl exec deploy/log-writer -- grep -o "log-writer-[a-z0-9-]*" /logs/app.log | sort -u
```

All three replicas successfully write to the same file simultaneously, demonstrating ReadWriteMany functionality.

## Scaling MDS for Performance

Increase active MDS count for workloads with high metadata operations.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  # ... other config ...
  metadataServer:
    activeCount: 2  # Increase active MDS
    activeStandby: true
    resources:
      requests:
        cpu: "1000m"
        memory: "2Gi"
      limits:
        cpu: "2000m"
        memory: "4Gi"
```

Multiple active MDS daemons distribute metadata load across subtrees, improving performance for workloads with many files and directories.

## Quota Management

Set quotas on CephFS directories to limit storage consumption.

```bash
# Enter tools pod
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash

# Set quota on a directory (10GB limit)
ceph fs set max_bytes /volumes/csi/csi-vol-123 10737418240

# Set file count quota
ceph fs set max_files /volumes/csi/csi-vol-123 100000

# View quotas
ceph fs get myfs
```

## Subvolume Groups

Organize volumes using subvolume groups for better management.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: app-group
  namespace: rook-ceph
spec:
  filesystemName: myfs
```

Configure StorageClass to use specific subvolume group:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-app-group
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-data0
  subvolumGroup: app-group
  # ... other parameters ...
```

## Performance Tuning

Optimize CephFS for your workload characteristics.

```yaml
# High-performance CephFS configuration
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: fast-fs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 2  # Reduce replication for metadata
    parameters:
      pg_num: "64"
      pgp_num: "64"
  dataPools:
  - name: data0
    replicated:
      size: 2
    parameters:
      pg_num: "128"
      pgp_num: "128"
  metadataServer:
    activeCount: 2
    activeStandby: true
    placement:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: role
              operator: In
              values:
              - metadata-server
```

Mount options for performance:

```yaml
mountOptions:
- noatime
- nodiratime
- async
```

## Monitoring CephFS

Track filesystem health and performance metrics.

```bash
# Check filesystem status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph fs status myfs

# View MDS performance
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph tell mds.myfs:0 perf dump

# Check client sessions
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph tell mds.myfs:0 client ls
```

Prometheus metrics for CephFS:

```promql
# MDS daemon count
ceph_mds_up

# Client count
ceph_mds_sessions

# Metadata pool usage
ceph_pool_used_bytes{pool="myfs-metadata"}

# Data pool usage
ceph_pool_used_bytes{pool="myfs-data0"}
```

## Backup and Recovery

Create snapshots of CephFS volumes for backup.

```bash
# Create snapshot manually
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs subvolume snapshot create myfs csi-vol-123 snap1

# List snapshots
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs subvolume snapshot ls myfs csi-vol-123
```

For automated backups, use VolumeSnapshot resources:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-cephfsplugin-snapclass
driver: rook-ceph.cephfs.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: shared-logs-snapshot
spec:
  volumeSnapshotClassName: csi-cephfsplugin-snapclass
  source:
    persistentVolumeClaimName: shared-logs
```

## Troubleshooting

Common CephFS issues and solutions:

```bash
# Check MDS status
kubectl get pods -n rook-ceph -l app=rook-ceph-mds
kubectl logs -n rook-ceph -l app=rook-ceph-mds

# Verify filesystem health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph fs status

# Check for degraded MDSsudo
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mds stat

# View client issues
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail | grep mds

# CSI provisioner logs
kubectl logs -n rook-ceph deploy/csi-cephfsplugin-provisioner
```

## Conclusion

CephFS through Rook provides POSIX-compliant shared filesystem storage with ReadWriteMany access mode for Kubernetes. The metadata server architecture enables concurrent access from multiple pods while maintaining consistency and performance. With proper MDS scaling, quota management, and performance tuning, CephFS handles diverse shared storage requirements from simple configuration sharing to complex content management systems. Monitor MDS health and filesystem metrics to maintain optimal performance and reliability.
