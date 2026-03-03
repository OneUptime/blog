# How to Use PersistentVolumes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, PersistentVolume, Storage, PVC

Description: A complete guide to understanding and using PersistentVolumes and PersistentVolumeClaims on Talos Linux Kubernetes clusters.

---

PersistentVolumes (PVs) are the foundation of stateful storage in Kubernetes. They abstract the underlying storage technology, whether it is local disk, network-attached storage, or a distributed system, into a uniform interface that pods can consume. On Talos Linux, understanding PersistentVolumes is especially important because the operating system is immutable, so all persistent data must go through Kubernetes storage primitives.

This guide covers the concepts, configurations, and practical patterns for using PersistentVolumes on Talos Linux.

## PersistentVolume Concepts

Kubernetes storage revolves around three main resources:

- **PersistentVolume (PV)**: A piece of storage provisioned in the cluster, either manually or dynamically
- **PersistentVolumeClaim (PVC)**: A request for storage by a user or pod
- **StorageClass**: Defines the type of storage available and how it should be provisioned

The typical flow is: a PVC requests storage, the StorageClass provisions a PV, and the PV is bound to the PVC.

## Static vs Dynamic Provisioning

### Static Provisioning

With static provisioning, an administrator creates PVs manually:

```yaml
# static-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: manual-pv-001
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  local:
    path: /var/local-storage/vol-001
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-1
```

```yaml
# static-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-data
  namespace: my-app
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

### Dynamic Provisioning

With dynamic provisioning, Kubernetes creates PVs automatically when a PVC is submitted:

```yaml
# dynamic-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-data
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: longhorn  # Or any available StorageClass
```

Dynamic provisioning is the preferred approach on Talos Linux because it eliminates manual PV management.

## Access Modes

PVs support three access modes:

```yaml
# ReadWriteOnce - can be mounted as read-write by a single node
accessModes:
  - ReadWriteOnce  # Best for databases, single-pod workloads

# ReadOnlyMany - can be mounted as read-only by many nodes
accessModes:
  - ReadOnlyMany  # Good for shared config, static assets

# ReadWriteMany - can be mounted as read-write by many nodes
accessModes:
  - ReadWriteMany  # Needed for shared storage (NFS, CephFS)
```

Not all storage backends support all access modes. On Talos Linux:

- Block storage (Ceph RBD, Longhorn): typically ReadWriteOnce
- Filesystem storage (CephFS, NFS): supports ReadWriteMany
- Local PV: ReadWriteOnce only

## Reclaim Policies

The reclaim policy determines what happens to a PV when its PVC is deleted:

```yaml
# Delete - PV is deleted along with the underlying storage
persistentVolumeReclaimPolicy: Delete

# Retain - PV stays but is not reusable until manually cleaned up
persistentVolumeReclaimPolicy: Retain

# Recycle (deprecated) - basic scrub of data
persistentVolumeReclaimPolicy: Recycle
```

For production on Talos Linux, use `Retain` for critical data and `Delete` for ephemeral data:

```yaml
# production-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: production-db
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain  # Protect production data
  storageClassName: ceph-block
  csi:
    driver: rook-ceph.rbd.csi.ceph.com
    volumeHandle: pvc-abc-123
    nodeStageSecretRef:
      name: rook-csi-rbd-node
      namespace: rook-ceph
    volumeAttributes:
      clusterID: rook-ceph
      pool: replicated-pool
```

## Using PVs with StatefulSets

StatefulSets are the most common way to use PersistentVolumes because they create a PVC for each pod replica:

```yaml
# statefulset-with-pv.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 3
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
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: ceph-block
        resources:
          requests:
            storage: 50Gi
```

This creates three PVCs: `data-postgres-0`, `data-postgres-1`, and `data-postgres-2`. Each pod gets its own dedicated volume.

## Using PVs with Deployments

Deployments can also use PVCs, but remember that ReadWriteOnce volumes can only be attached to one pod at a time:

```yaml
# deployment-with-pv.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-uploads
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: longhorn
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 1  # Must be 1 for ReadWriteOnce
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: Recreate  # Not RollingUpdate, to avoid PV conflicts
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:1.0.0
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: app-uploads
```

For multi-replica deployments that need shared storage, use ReadWriteMany with NFS or CephFS:

```yaml
# shared-deployment.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-uploads
  namespace: my-app
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: ceph-filesystem
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3  # Multiple replicas allowed with ReadWriteMany
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:1.0.0
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: shared-uploads
```

## Expanding PersistentVolumes

Most modern storage classes on Talos Linux support volume expansion:

```bash
# Check if your StorageClass supports expansion
kubectl get storageclass longhorn -o jsonpath='{.allowVolumeExpansion}'

# Expand a PVC by editing it
kubectl patch pvc my-data -n my-app \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Monitor the expansion
kubectl get pvc my-data -n my-app -w
```

## Monitoring PersistentVolumes

```bash
# List all PVs in the cluster
kubectl get pv

# List all PVCs across namespaces
kubectl get pvc -A

# Get detailed information about a PV
kubectl describe pv <pv-name>

# Check PVC events for issues
kubectl describe pvc my-data -n my-app

# Find unbound or problematic PVCs
kubectl get pvc -A | grep -v Bound
```

## Troubleshooting Common Issues

1. **PVC stuck in Pending**: Usually means no PV matches the PVC requirements. Check the StorageClass exists and the provisioner is running.

```bash
# Check events for the PVC
kubectl describe pvc my-data -n my-app

# Check CSI driver pods
kubectl get pods -A | grep csi
```

2. **PV stuck in Released state**: The PV was bound to a PVC that was deleted but the data was not cleaned up.

```bash
# For a PV with Retain policy, you need to manually clear the claim reference
kubectl patch pv <pv-name> -p '{"spec":{"claimRef": null}}'
```

3. **Volume mount errors**: Usually a permission issue or filesystem corruption.

```bash
# Check pod events
kubectl describe pod <pod-name> -n my-app

# Check node-level CSI logs
kubectl logs -n kube-system -l app=csi-node-driver --tail=50
```

## Summary

PersistentVolumes are how you manage all stateful data on Talos Linux. The immutable operating system means there is no other way to persist data across pod restarts and rescheduling. By understanding the relationship between PVs, PVCs, and StorageClasses, you can design storage architectures that match your workload requirements. Use dynamic provisioning when possible, choose the right access mode for your workload, and set reclaim policies that protect critical data. These fundamentals apply regardless of which storage backend you are running underneath.
