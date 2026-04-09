# How to Deploy Rook-Ceph on Harvester HCI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Harvester, HCI, Kubernetes, Storage, SUSE

Description: Deploy Rook-Ceph on Harvester HCI to provide distributed storage alongside the built-in Longhorn, with guidance on coexistence.

---

## Overview

Harvester is an open-source hyper-converged infrastructure (HCI) solution built on Kubernetes, KubeVirt, and Longhorn. While Harvester includes Longhorn as its default storage, you can deploy Rook-Ceph on Harvester clusters to add S3-compatible object storage, CephFS shared file storage, or higher-performance RBD block storage. This guide covers deploying Rook on Harvester.

## Prerequisites

- A Harvester cluster with at least 3 nodes
- Additional disks on each node for Ceph OSDs (separate from Longhorn disks)
- Harvester's embedded Rancher or direct kubeconfig access
- `kubectl` and `helm` configured

## Understanding Harvester's Storage Layout

Harvester uses Longhorn by default. The disks labeled for Longhorn should not be reused for Ceph. Provision dedicated disks for Rook-Ceph:

```bash
# Check existing disk allocations
kubectl -n longhorn-system get nodes.longhorn.io -o yaml | grep -A5 disks
```

## Step 1 - Identify Available Disks for Ceph

SSH into each Harvester node and identify disks not used by Longhorn:

```bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,LABEL
# Identify disks without partitions or mounts
```

## Step 2 - Label Nodes for Rook

```bash
kubectl label nodes \
  harvester-node-1 \
  harvester-node-2 \
  harvester-node-3 \
  ceph-storage=enabled
```

## Step 3 - Install Rook Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set nodeSelector."ceph-storage"=enabled
```

## Step 4 - Deploy the Ceph Cluster

```yaml
# cluster-harvester.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: ceph-storage
                  operator: In
                  values:
                    - enabled
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "harvester-node-1"
        devices:
          - name: "sdc"
      - name: "harvester-node-2"
        devices:
          - name: "sdc"
      - name: "harvester-node-3"
        devices:
          - name: "sdc"
```

```bash
kubectl apply -f cluster-harvester.yaml
```

## Step 5 - Deploy RGW for S3 Object Storage

Harvester VMs can use the Ceph RGW S3 endpoint for object storage:

```yaml
# rgw-harvester.yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
```

```bash
kubectl apply -f rgw-harvester.yaml
```

## Step 6 - Verify Coexistence with Longhorn

Deploy the Rook toolbox to access Ceph CLI tools, then verify Longhorn is still healthy after Rook deployment:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/release-1.16/deploy/examples/toolbox.yaml
```

```bash
kubectl -n longhorn-system get pods
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

## Summary

Rook-Ceph on Harvester HCI supplements the built-in Longhorn storage by providing S3-compatible object storage via RGW, shared file storage via CephFS, and high-performance block storage via RBD. Using dedicated disks for Ceph and node selectors to isolate placement prevents interference with Longhorn, enabling both storage systems to coexist on the same Harvester nodes.
