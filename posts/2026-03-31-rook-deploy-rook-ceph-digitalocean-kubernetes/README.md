# How to Deploy Rook-Ceph on DigitalOcean Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, DigitalOcean, Kubernetes, Storage, Block Storage, DOKS

Description: Deploy Rook-Ceph on DigitalOcean Kubernetes Service using DigitalOcean Volumes as OSD backing devices.

---

## Overview

DigitalOcean Kubernetes Service (DOKS) provides a managed Kubernetes environment. Rook-Ceph can run on DOKS by attaching DigitalOcean Block Storage volumes to Droplet nodes and using them as Ceph OSDs. This guide walks through the end-to-end deployment process.

## Prerequisites

- A DOKS cluster with at least 3 worker nodes (4GB RAM minimum per node)
- `doctl`, `kubectl`, and `helm` installed and configured
- DigitalOcean personal access token

## Step 1 - Attach Block Storage Volumes to Nodes

DigitalOcean volumes appear as raw block devices on Droplets:

```bash
# List droplets in the cluster
doctl compute droplet list --tag-name "k8s:my-cluster" --format ID,Name

# Create and attach a volume to each node
for DROPLET_ID in 1234 5678 9012; do
  VOL_ID=$(doctl compute volume create ceph-osd-${DROPLET_ID} \
    --region nyc1 \
    --size 100 \
    --format ID --no-header)

  doctl compute volume-action attach $VOL_ID $DROPLET_ID
  echo "Attached $VOL_ID to $DROPLET_ID"
done
```

Verify the volume appears on the node (typically as `/dev/sda`):

```bash
kubectl debug node/node-name -it --image=busybox -- lsblk
```

## Step 2 - Install Rook Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

kubectl create namespace rook-ceph

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.enableCSIHostNetwork=true
```

## Step 3 - Create CephCluster

```yaml
# cluster-doks.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  dashboard:
    enabled: true
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[a-z]$"
```

```bash
kubectl apply -f cluster-doks.yaml
```

## Step 4 - Wait for Cluster Health

```bash
kubectl -n rook-ceph get pods -w

# Deploy the Rook toolbox to run Ceph commands
kubectl apply -f https://raw.githubusercontent.com/rook/rook/release-1.16/deploy/examples/toolbox.yaml

kubectl -n rook-ceph wait deploy/rook-ceph-tools --for condition=available --timeout=120s
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Expected healthy output:

```yaml
cluster:
  id:     abc-123
  health: HEALTH_OK

services:
  mon: 3 daemons, quorum a,b,c
  osd: 3 osds: 3 up (since 1m), 3 in (since 1m)
```

## Step 5 - Configure Storage Classes

```yaml
# pool-and-sc.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
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
```

```bash
kubectl apply -f pool-and-sc.yaml
```

## Replacing DigitalOcean's Default Storage

If you want Rook to be the default storage class, patch it:

```bash
kubectl patch storageclass rook-ceph-block \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

kubectl patch storageclass do-block-storage \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
```

## Summary

Rook-Ceph on DigitalOcean Kubernetes requires attaching Block Storage volumes to Droplet nodes, installing the Rook operator via Helm, and pointing the CephCluster manifest at the correct device path. Once healthy, Rook can replace or supplement DigitalOcean's default storage class with a fully distributed Ceph cluster providing replication-backed persistent volumes.
