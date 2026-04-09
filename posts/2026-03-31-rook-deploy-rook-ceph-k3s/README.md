# How to Deploy Rook-Ceph on k3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, k3s, Kubernetes, Storage, Edge, Lightweight

Description: Deploy Rook-Ceph on k3s lightweight Kubernetes clusters with considerations for k3s-specific configurations and storage paths.

---

## Overview

k3s is a lightweight Kubernetes distribution ideal for edge, IoT, and resource-constrained environments. Deploying Rook-Ceph on k3s requires addressing k3s-specific differences like alternative data directories, containerd socket paths, and the absence of some default Kubernetes features. This guide covers the k3s-specific deployment steps.

## Prerequisites

- A k3s cluster with at least 3 nodes
- Each node with an unformatted raw disk or partition for OSDs
- `kubectl` configured to reach the k3s cluster

## k3s-Specific Considerations

k3s stores data at `/var/lib/rancher/k3s` instead of `/var/lib/kubelet`. It uses its own embedded containerd instance. Rook needs to know these paths.

Key differences from standard Kubernetes:
- Containerd socket: `/run/k3s/containerd/containerd.sock`
- Kubelet directory: `/var/lib/rancher/k3s/agent/kubelet`

## Step 1 - Install Rook Operator with k3s Settings

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.kubeletDirPath=/var/lib/rancher/k3s/agent/kubelet
```

Alternatively, create a values file:

```yaml
# rook-values-k3s.yaml
csi:
  kubeletDirPath: /var/lib/rancher/k3s/agent/kubelet
  enableCSIHostNetwork: true
```

```bash
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-values-k3s.yaml
```

## Step 2 - Deploy the Ceph Cluster

```yaml
# cluster-k3s.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.8
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^vd[b-z]$"
```

```bash
kubectl apply -f cluster-k3s.yaml
```

## Step 3 - Verify CSI Driver Registration

k3s uses a different kubelet path, so CSI drivers must register at the correct location:

```bash
kubectl get csidriver
kubectl -n rook-ceph get pods | grep csi
```

Confirm the csi-provisioner pods are running:

```bash
kubectl -n rook-ceph describe deploy csi-rbdplugin-provisioner | grep -A5 "Volumes:"
```

## Step 4 - Create a CephBlockPool and StorageClass

Before testing PVCs, create a CephBlockPool and StorageClass since Rook does not create these automatically:

```yaml
# storageclass-k3s.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
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
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f storageclass-k3s.yaml
```

## Step 5 - Test PVC Creation

```yaml
# test-pvc-k3s.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ceph-test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 5Gi
```

```bash
kubectl apply -f test-pvc-k3s.yaml
kubectl get pvc ceph-test-pvc
```

## Troubleshooting k3s CSI Issues

If PVCs remain pending, check the CSI provisioner logs:

```bash
kubectl -n rook-ceph logs deploy/csi-rbdplugin-provisioner -c csi-provisioner | tail -20
```

Ensure the kubelet path matches:

```bash
kubectl -n rook-ceph get ds csi-rbdplugin -o yaml | grep kubeletDir
```

## Summary

Deploying Rook-Ceph on k3s requires overriding the default kubelet directory path to match k3s's non-standard location at `/var/lib/rancher/k3s/agent/kubelet`. Once this is set in the Helm values, the operator and CSI drivers register correctly and Rook-Ceph functions identically to standard Kubernetes deployments with raw disk devices used as OSDs.
