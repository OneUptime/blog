# How to Set Up CephFS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CephFS, Rook-Ceph, Kubernetes, Shared Storage, Filesystems

Description: Step-by-step guide to deploying CephFS shared filesystem storage on a Talos Linux cluster using Rook-Ceph.

---

CephFS is the POSIX-compliant distributed filesystem component of Ceph. Unlike Ceph block storage which provides ReadWriteOnce volumes, CephFS supports ReadWriteMany access mode, meaning multiple pods across different nodes can mount the same filesystem simultaneously. This makes it ideal for workloads like content management systems, shared data processing pipelines, and any application that needs a shared filesystem.

On Talos Linux, CephFS runs through the Rook-Ceph operator and integrates seamlessly with Kubernetes PersistentVolumeClaims.

## Prerequisites

You need:

- A running Rook-Ceph cluster on Talos Linux (see our Rook-Ceph setup guide)
- At least 3 nodes with OSDs for data redundancy
- The Ceph CSI driver for CephFS enabled in your Rook configuration

Verify that CephFS CSI is enabled:

```bash
# Check that the CephFS CSI pods are running
kubectl get pods -n rook-ceph -l app=csi-cephfsplugin

# Verify the Ceph cluster is healthy
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
```

## Creating a CephFS Filesystem

First, create a CephFilesystem resource. This tells Rook to set up a CephFS filesystem with the metadata and data pools:

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
  dataPools:
    - name: default
      failureDomain: host
      replicated:
        size: 3
    - name: ec-data
      failureDomain: host
      erasureCoded:
        dataChunks: 2
        codingChunks: 1
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        memory: 4Gi
    placement:
      tolerations:
        - key: storage-node
          operator: Exists
```

```bash
# Create the filesystem
kubectl apply -f cephfs.yaml

# Watch the MDS (Metadata Server) pods come up
kubectl -n rook-ceph get pods -l app=rook-ceph-mds -w

# Verify the filesystem is active
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph fs status myfs
```

You should see output showing the filesystem with one active and one standby MDS.

## Creating a StorageClass for CephFS

Create a StorageClass that lets Kubernetes dynamically provision CephFS volumes:

```yaml
# cephfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-filesystem
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-default
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
# Create the StorageClass
kubectl apply -f cephfs-storageclass.yaml

# Verify it is available
kubectl get storageclass ceph-filesystem
```

## Using CephFS with ReadWriteMany

The primary use case for CephFS is shared storage. Here is an example deploying multiple pods that share a filesystem:

```yaml
# shared-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: my-app
spec:
  accessModes:
    - ReadWriteMany  # Multiple pods can write to this volume
  resources:
    requests:
      storage: 20Gi
  storageClassName: ceph-filesystem
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-processor
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: file-processor
  template:
    metadata:
      labels:
        app: file-processor
    spec:
      containers:
        - name: processor
          image: myorg/file-processor:1.0.0
          volumeMounts:
            - name: shared-data
              mountPath: /data
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: shared-data
```

```bash
# Deploy the shared storage example
kubectl create namespace my-app
kubectl apply -f shared-storage.yaml

# Verify the PVC is bound
kubectl get pvc -n my-app

# Verify all pods can access the volume
kubectl get pods -n my-app
```

## CephFS for a Content Management System

A practical example is deploying WordPress with shared media storage:

```yaml
# wordpress-shared.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wordpress-media
  namespace: wordpress
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
  name: wordpress
  namespace: wordpress
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wordpress
  template:
    metadata:
      labels:
        app: wordpress
    spec:
      containers:
        - name: wordpress
          image: wordpress:6.4
          ports:
            - containerPort: 80
          volumeMounts:
            - name: media
              mountPath: /var/www/html/wp-content/uploads
          env:
            - name: WORDPRESS_DB_HOST
              value: mysql.wordpress.svc.cluster.local
            - name: WORDPRESS_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: wordpress-db
                  key: password
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
      volumes:
        - name: media
          persistentVolumeClaim:
            claimName: wordpress-media
```

All three WordPress replicas share the same upload directory, so media files uploaded through one pod are immediately available to all others.

## CephFS Subvolume Groups

For better isolation between different applications, use subvolume groups:

```yaml
# subvolume-group.yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: app-group
  namespace: rook-ceph
spec:
  name: app-group
  filesystemName: myfs
  pinning:
    distributed: 1
```

```yaml
# StorageClass using the subvolume group
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-filesystem-app
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-default
  subvolGroupName: app-group
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## CephFS Snapshots

CephFS supports snapshots for point-in-time backups:

```yaml
# cephfs-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ceph-filesystem-snapshot
driver: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

```yaml
# Take a snapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: shared-data-snapshot
  namespace: my-app
spec:
  volumeSnapshotClassName: ceph-filesystem-snapshot
  source:
    persistentVolumeClaimName: shared-data
```

## Setting CephFS Quotas

Control storage usage per volume with quotas:

```yaml
# StorageClass with quota enforcement
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-filesystem-quota
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-default
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

The CSI driver automatically sets CephFS quotas based on the PVC request size.

## Monitoring CephFS Performance

Keep an eye on your CephFS filesystem performance:

```bash
# Check MDS status
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph fs status myfs

# Check MDS performance counters
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph daemon mds.myfs-a perf dump

# Check filesystem usage
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph fs df myfs

# List active CephFS clients
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph tell mds.myfs-a client ls
```

## Troubleshooting CephFS on Talos Linux

Common issues and solutions:

```bash
# If PVC is stuck in Pending, check CSI logs
kubectl logs -n rook-ceph -l app=csi-cephfsplugin-provisioner -c csi-cephfsplugin

# If mount fails, check the CephFS plugin on the node
kubectl logs -n rook-ceph -l app=csi-cephfsplugin -c csi-cephfsplugin

# Check MDS health
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph mds stat

# If MDS is in damaged state, try a repair
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph mds repaired myfs:0
```

## Summary

CephFS on Talos Linux fills the gap for shared filesystem storage that block storage cannot. The ReadWriteMany access mode allows multiple pods on different nodes to share the same data, which is essential for many real-world applications. With Rook managing the underlying Ceph infrastructure, you get automatic failover through standby MDS servers, snapshot support for backups, and quota enforcement for capacity planning. The setup integrates naturally with Kubernetes through standard StorageClasses and PersistentVolumeClaims, making CephFS a practical choice for shared storage on Talos Linux clusters.
