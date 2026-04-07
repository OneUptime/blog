# How to Handle Storage Class Changes in a Running Rook Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage Class, Kubernetes, Migration, Operation

Description: Learn how to handle StorageClass changes in a running Rook-Ceph cluster - covering parameter updates, PVC migration between storage classes, and zero-downtime transitions.

---

## Overview

StorageClass changes in Kubernetes are complex because existing PVCs bind to the StorageClass at creation time. This guide covers common scenarios: updating StorageClass parameters, creating new storage classes for new workloads, and migrating existing PVCs.

## Updating StorageClass Parameters

StorageClass parameters can be updated for new PVCs by deleting and recreating the StorageClass (existing bound PVCs are unaffected):

```bash
# Delete the old StorageClass
kubectl delete storageclass rook-ceph-block

# Recreate with updated parameters
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
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
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - discard
EOF
```

## Adding a New Pool-Based Storage Class

Create a new CephBlockPool first:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  deviceClass: ssd
```

Then create a StorageClass for it:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-ssd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: ssd-pool
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

## Migrating PVCs Between Storage Classes

PVCs cannot be directly moved between StorageClasses. Use the data copy approach:

```bash
# 1. Scale down the application
kubectl scale deployment my-app --replicas=0

# 2. Create a new PVC in the target StorageClass
kubectl apply -f new-pvc.yaml

# 3. Use a migration pod to copy data
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: pvc-migrate
spec:
  containers:
  - name: migrate
    image: alpine
    command: ["sh", "-c", "cp -av /src/. /dst/"]
    volumeMounts:
    - name: src
      mountPath: /src
    - name: dst
      mountPath: /dst
  volumes:
  - name: src
    persistentVolumeClaim:
      claimName: old-pvc
  - name: dst
    persistentVolumeClaim:
      claimName: new-pvc
  restartPolicy: Never
EOF

kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/pvc-migrate --timeout=600s
```

## Changing the Default StorageClass

```bash
# Remove default annotation from current default
kubectl patch storageclass rook-ceph-block \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

# Set new default
kubectl patch storageclass rook-ceph-block-ssd \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Summary

StorageClass changes in Rook-Ceph range from simple parameter updates (delete and recreate the SC) to complex PVC migrations requiring data copy via migration pods. New storage classes backed by dedicated CephBlockPools provide workload-specific tiering without disrupting existing PVCs.
