# How to Deploy Rook-Ceph on Linode Kubernetes Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Linode, Kubernetes, Storage, Block Storage, LKE

Description: Deploy Rook-Ceph on Linode Kubernetes Engine by attaching Linode Block Storage volumes as OSD devices for distributed persistent storage.

---

## Overview

Linode Kubernetes Engine (LKE) provides a managed Kubernetes service on Akamai Cloud. Rook-Ceph can run on LKE by attaching Linode Block Storage volumes to nodes and using them as Ceph OSD backing devices. This guide covers the full deployment process.

## Prerequisites

- An LKE cluster with at least 3 nodes (Dedicated 4 GB or higher recommended)
- Linode CLI (`linode-cli`), `kubectl`, and `helm` configured
- Linode personal access token with read-write permissions

## Step 1 - Create and Attach Block Storage Volumes

```bash
# List LKE nodes
linode-cli linodes list --label my-lke-cluster

# Create a volume for each node
for LINODE_ID in 11111 22222 33333; do
  linode-cli volumes create \
    --label ceph-osd-$LINODE_ID \
    --size 100 \
    --linode_id $LINODE_ID \
    --region us-east
  echo "Volume created and attached to $LINODE_ID"
done
```

Verify attachment from inside the nodes:

```bash
kubectl get nodes -o wide
# SSH into a node or use kubectl debug
kubectl debug node/lke-node-1 -it --image=busybox -- chroot /host lsblk
```

The volume typically appears as `/dev/sdc` or `/dev/disk/by-id/scsi-...`.

## Step 2 - Install Rook Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --version 1.13.0
```

Verify the operator is running:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-operator
```

## Step 3 - Deploy the Ceph Cluster

Create the cluster manifest targeting the attached volume device:

```yaml
# cluster-lke.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.2
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
  dashboard:
    enabled: true
    ssl: false
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[c-z]$"
    config:
      osdsPerDevice: "1"
  network:
    hostNetwork: false
```

```bash
kubectl apply -f cluster-lke.yaml
```

## Step 4 - Monitor Cluster Initialization

Watch OSD pods come online:

```bash
kubectl -n rook-ceph get pods -w | grep osd
```

Check overall cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

## Step 5 - Create Block Storage Class

```yaml
# block-storageclass.yaml
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
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f block-storageclass.yaml
```

## Exposing the Dashboard

Access the Ceph dashboard via port-forward:

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8080:7000
```

Navigate to `http://localhost:8080` and log in with the admin password:

```bash
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 --decode
```

## Summary

Deploying Rook-Ceph on Linode Kubernetes Engine involves creating and attaching Linode Block Storage volumes to nodes, installing the Rook operator via Helm, and deploying a CephCluster manifest using the correct device filter for attached volumes. The resulting cluster provides durable, replicated block and file storage as Kubernetes storage classes for LKE workloads.
