# How to Migrate from NFS to CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, NFS, Migration, File Storage

Description: A practical guide for migrating file workloads from NFS to CephFS backed by Rook-Ceph, covering data transfer, mount point changes, and cutover strategies.

---

## Overview

NFS is a common legacy file system in Kubernetes environments, but it lacks native replication, does not scale well under high concurrency, and requires a dedicated NFS server. CephFS provides distributed, replicated file storage with POSIX semantics and better scalability. Migrating from NFS to CephFS improves resilience and eliminates the NFS server as a single point of failure.

## Pre-Migration Inventory

```bash
# List all NFS PVs and PVCs
kubectl get pv | grep nfs
kubectl get pvc -A | grep nfs

# Check current NFS usage
df -h /mnt/nfs-share    # on any node mounting the NFS share
```

## Step 1: Deploy CephFS in Rook

```yaml
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
  - name: data0
    replicated:
      size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

```bash
kubectl apply -f filesystem.yaml
kubectl get cephfilesystem -n rook-ceph myfs
```

## Step 2: Create CephFS StorageClass

```yaml
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
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Step 3: Create CephFS PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cephfs-data
  namespace: production
spec:
  storageClassName: rook-cephfs
  accessModes:
  - ReadWriteMany    # CephFS supports RWX unlike RBD
  resources:
    requests:
      storage: 1Ti
```

## Step 4: rsync Data from NFS to CephFS

Use rsync for a reliable file-level migration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nfs-to-cephfs-migrator
  namespace: production
spec:
  restartPolicy: Never
  containers:
  - name: rsync
    image: alpine
    command:
    - /bin/sh
    - -c
    - |
      apk add --no-cache rsync
      rsync -avz --progress /nfs-source/ /cephfs-dest/
      echo "Migration complete. Files: $(find /cephfs-dest -type f | wc -l)"
    volumeMounts:
    - name: nfs-source
      mountPath: /nfs-source
    - name: cephfs-dest
      mountPath: /cephfs-dest
  volumes:
  - name: nfs-source
    persistentVolumeClaim:
      claimName: nfs-pvc        # existing NFS PVC
  - name: cephfs-dest
    persistentVolumeClaim:
      claimName: cephfs-data
```

```bash
kubectl apply -f migrator.yaml
kubectl logs -n production -f nfs-to-cephfs-migrator
```

## Step 5: Verify Data Integrity

```bash
# Compare file lists between source and destination (strip base path for meaningful diff)
kubectl exec -n production nfs-to-cephfs-migrator -- \
  sh -c 'find /nfs-source -type f | sed "s|^/nfs-source||" | sort > /tmp/src.txt && \
         find /cephfs-dest -type f | sed "s|^/cephfs-dest||" | sort > /tmp/dst.txt && \
         diff /tmp/src.txt /tmp/dst.txt'

# Compare checksums for critical files
kubectl exec -n production nfs-to-cephfs-migrator -- \
  md5sum /nfs-source/critical-file.db
kubectl exec -n production nfs-to-cephfs-migrator -- \
  md5sum /cephfs-dest/critical-file.db
```

## Step 6: Cutover Applications

```bash
# Scale down applications
kubectl scale deployment my-app -n production --replicas=0

# Update deployment to use CephFS PVC
kubectl set env deployment/my-app -n production STORAGE_PATH=/data
kubectl patch deployment my-app -n production --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/volumes/0/persistentVolumeClaim/claimName","value":"cephfs-data"}]'

# Scale back up
kubectl scale deployment my-app -n production --replicas=3
```

## Summary

Migrating from NFS to CephFS replaces a single-server file system with a distributed, replicated alternative that supports ReadWriteMany access. The migration process uses rsync to copy data between NFS and CephFS PVCs while both are simultaneously mounted, followed by an application-level cutover that swaps the PVC reference. Verify file counts and checksums before cutover to guarantee data completeness.
