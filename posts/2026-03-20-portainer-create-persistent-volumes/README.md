# How to Create Persistent Volumes in Portainer via Manifest - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Persistent Volume, Storage, DevOps

Description: Learn how to create Kubernetes PersistentVolumes and PersistentVolumeClaims via YAML manifests in Portainer for stateful application storage management.

## Introduction

Kubernetes PersistentVolumes (PVs) provide cluster-wide storage resources that pods can claim via PersistentVolumeClaims (PVCs). While dynamic provisioning handles most storage needs automatically, manually creating PersistentVolumes is necessary for pre-provisioned storage, local storage, and environments without a storage provisioner. Portainer's YAML editor supports creating PV and PVC resources directly. This guide covers creating persistent storage via manifests in Portainer.

## Prerequisites

- Portainer with Kubernetes environment
- Cluster with storage backend (NFS, local disk, cloud volumes)
- Understanding of storage access modes and reclaim policies

## Storage Concepts

Key terms before creating volumes:

```text
PersistentVolume (PV)     - Cluster-level storage resource (static or dynamically provisioned)
PersistentVolumeClaim (PVC) - Namespace-level storage request (developer creates)
StorageClass              - Dynamic provisioning template
Access Modes:
  ReadWriteOnce (RWO)     - Mounted read-write by a single node
  ReadOnlyMany (ROX)      - Mounted read-only by many nodes
  ReadWriteMany (RWX)     - Mounted read-write by many nodes (NFS, CephFS)
Reclaim Policies:
  Retain                  - Keep data after PVC deletion (manual cleanup)
  Delete                  - Delete storage after PVC deletion
  Recycle                 - Deprecated, scrub and reuse
```

## Step 1: Create a Static PersistentVolume

For pre-provisioned storage (NFS example):

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv-production-data
  labels:
    type: nfs
    environment: production
    app: my-app
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany    # NFS supports multiple readers/writers
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs-storage    # Must match PVC storageClassName
  nfs:
    server: 192.168.1.100          # NFS server IP
    path: /exports/production/my-app-data
    readOnly: false
```

Apply this YAML in Portainer's manifest editor.

## Step 2: Create a Local PersistentVolume

For high-performance local disk storage:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-worker-01-ssd
  labels:
    type: local-ssd
spec:
  capacity:
    storage: 500Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce    # Local storage: single node only
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-ssd
  local:
    path: /mnt/nvme-disk/k8s-storage
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-01    # This PV only usable on worker-01
```

Local PVs require node affinity to pin them to the specific node where the disk exists.

## Step 3: Create a PersistentVolumeClaim

A PVC requests storage from an available PV:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data-pvc
  namespace: production
  labels:
    app: my-app
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-storage    # Must match PV storageClassName
  resources:
    requests:
      storage: 50Gi     # Must be <= PV capacity
  # Optional: bind to a specific PV
  # volumeName: nfs-pv-production-data
```

## Step 4: Create PV and PVC Together

Deploy both in one multi-document YAML for simple setups:

```yaml
# HostPath PV (for single-node testing environments)

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 20Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /data/postgres
    type: DirectoryOrCreate

---
# PVC to claim the above PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: manual
  resources:
    requests:
      storage: 20Gi
  volumeName: postgres-pv   # Bind directly to specific PV
```

## Step 5: Use the PVC in a Deployment

After PVC is created and bound:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: production
spec:
  replicas: 1    # StatefulSet preferred for databases
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
          image: postgres:15-alpine
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-pvc
```

## Step 6: Verify PV and PVC Status

```bash
# Check PV status
kubectl get pv
# STATUS should be: Available, Bound, Released, or Failed

# Check PVC status
kubectl get pvc -n production
# STATUS should be: Bound (if successfully attached to a PV)

# View PVC-PV binding details
kubectl describe pvc my-app-data-pvc -n production

# Check PV binding details
kubectl describe pv nfs-pv-production-data

# If PVC is stuck in Pending:
kubectl describe pvc my-app-data-pvc -n production | grep Events -A 10
```

## Step 7: Expand a PVC (If StorageClass Allows)

```yaml
# Edit the existing PVC manifest and increase the requested size
# (StorageClass must have allowVolumeExpansion: true)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data-pvc
  namespace: production
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-storage
  resources:
    requests:
      storage: 100Gi    # Increased from 50Gi
```

Or via kubectl:

```bash
kubectl patch pvc my-app-data-pvc -n production \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

## Step 8: Reclaim a Released PV

When a PVC is deleted and the PV policy is `Retain`, the data remains on the backing storage. If you want to reuse the same PV, verify or clean that retained data first:

```bash
# PV enters Released state - data is preserved on the storage asset
kubectl get pv | grep Released

# After verifying or cleaning the retained data, remove the claimRef
kubectl patch pv nfs-pv-production-data \
  -p '{"spec":{"claimRef": null}}'

# PV can return to Available status
kubectl get pv nfs-pv-production-data
```

## Conclusion

Creating PersistentVolumes via YAML manifests in Portainer gives full control over storage configuration for pre-provisioned or specialized storage backends. Use static PVs for NFS and local storage, always match `storageClassName` between PVs and PVCs, and choose the appropriate reclaim policy (Retain for production data, Delete for ephemeral workloads). For most deployments, prefer dynamic provisioning via StorageClasses to reduce manual PV management overhead.
