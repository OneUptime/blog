# How to Deploy Rook-Ceph Block Storage with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Rook, Ceph, Block Storage, PersistentVolume, RWO

Description: Deploy Rook-Ceph block storage for ReadWriteOnce persistent volumes on Kubernetes using Flux CD for GitOps-managed distributed block storage.

---

## Introduction

Rook-Ceph block storage (based on RADOS Block Devices — RBD) provides `ReadWriteOnce` (RWO) persistent volumes for stateful workloads like databases and message brokers. Each PVC gets a dedicated RBD image backed by Ceph's distributed storage pool, providing thin provisioning, snapshots, and cloning capabilities.

Deploying Rook-Ceph block storage through Flux CD gives you GitOps-managed storage classes that your application teams can reference in their PVCs. Adding a new storage tier (e.g., a high-performance NVMe-backed pool) is a pull request to the storage infrastructure repository.

## Prerequisites

- Rook-Ceph operator and CephCluster deployed (see object store post for operator setup)
- Flux CD bootstrapped to your Git repository
- `kubectl` and `flux` CLIs installed

## Step 1: Create a CephBlockPool

```yaml
# infrastructure/storage/rook-ceph/block-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  # Replicate data 3 times across different hosts
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  # Pool-level settings
  parameters:
    compression_mode: aggressive  # compress data in the pool
---
# High-performance pool using NVMe devices
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: nvme-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: nvme  # use only NVMe-class OSDs
```

## Step 2: Create StorageClasses

```yaml
# infrastructure/storage/rook-ceph/block-storageclass.yaml
# Standard replicated block storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering,fast-diff,object-map,deep-flatten,exclusive-lock
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - discard
---
# High-performance NVMe block storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-nvme
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: nvme-pool
  imageFormat: "2"
  imageFeatures: layering,fast-diff,object-map,deep-flatten,exclusive-lock
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain   # retain data on PVC deletion for NVMe tier
allowVolumeExpansion: true
```

## Step 3: Enable Volume Snapshots

```yaml
# infrastructure/storage/rook-ceph/volume-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/volumesnapshot/name: "$(volumesnapshotnamespace)/$(volumesnapshotname)"
  csi.storage.k8s.io/volumesnapshot/namespace: "$(volumesnapshotnamespace)"
  csi.storage.k8s.io/volumesnapshot/contentname: "$(volumesnapshotcontentname)"
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

## Step 4: Test with a PVC

```yaml
# Test PVC to verify block storage works
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'Rook-Ceph block storage works!' > /data/test.txt && cat /data/test.txt"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: test-pvc
  restartPolicy: Never
```

## Step 5: Take a Volume Snapshot

```yaml
# Create a snapshot of a production database PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-data-snapshot-20260313
  namespace: databases
spec:
  volumeSnapshotClassName: csi-rbdplugin-snapclass
  source:
    persistentVolumeClaimName: postgresql-data-postgres-primary-1
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/rook-ceph-block-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-ceph-block
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/rook-ceph/block
  prune: true
  dependsOn:
    - name: rook-ceph-cluster
```

## Step 7: Verify Block Storage

```bash
# Check block pool status
kubectl get cephblockpool -n rook-ceph

# Check pool health via Ceph CLI
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls detail

# Check PVCs are using Rook-Ceph
kubectl get pvc -A | grep rook-ceph-block

# List RBD images
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd ls replicapool

# Check storage class
kubectl get storageclass rook-ceph-block -o yaml
```

## Best Practices

- Set `reclaimPolicy: Retain` for production database PVCs to prevent data loss on accidental PVC deletion.
- Enable `allowVolumeExpansion: true` on all StorageClasses to support online volume expansion without pod restart.
- Use `deviceClass: nvme` for database storage pools and `ssd` or `hdd` for less latency-sensitive workloads.
- Create volume snapshots before database upgrades and maintenance operations.
- Monitor Ceph pool usage with `ceph df` and set up Prometheus alerts when any pool exceeds 80% capacity.

## Conclusion

Rook-Ceph block storage deployed via Flux CD provides a self-healing, distributed block storage layer for stateful Kubernetes workloads. The `CephBlockPool` and `StorageClass` resources are version-controlled, making it easy to add new storage tiers or modify replication settings through pull requests. Application teams reference StorageClasses in their PVCs without needing to know the details of the underlying Ceph configuration — storage as a platform service, managed by GitOps.
