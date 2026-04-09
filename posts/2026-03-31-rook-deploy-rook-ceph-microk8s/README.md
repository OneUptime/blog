# How to Deploy Rook-Ceph on MicroK8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MicroK8s, Kubernetes, Storage, Ubuntu, Canonical

Description: Deploy Rook-Ceph on Canonical MicroK8s by configuring snap-based paths and enabling necessary add-ons for distributed storage.

---

## Overview

MicroK8s is a snap-packaged Kubernetes distribution from Canonical. Its snap-based installation creates unique file paths for containerd and kubelet that Rook-Ceph's CSI drivers must be configured to use. This guide covers deploying Rook-Ceph on MicroK8s clusters.

## Prerequisites

- MicroK8s installed on at least 3 nodes
- Nodes joined into a HA cluster
- Raw block devices available on each node for OSDs
- `kubectl` aliased (`snap alias microk8s.kubectl kubectl`) or use `microk8s kubectl`

## MicroK8s Path Considerations

MicroK8s stores data in snap directories:
- Kubelet directory: `/var/snap/microk8s/common/var/lib/kubelet`
- Containerd socket: `/var/snap/microk8s/common/run/containerd.sock`

## Step 1 - Enable Required Add-ons

```bash
microk8s enable dns storage helm3
microk8s enable rbac
```

Disable the default hostpath storage if you want Rook to be the default:

```bash
microk8s disable storage
```

## Step 2 - Install Rook Operator

```bash
microk8s helm3 repo add rook-release https://charts.rook.io/release
microk8s helm3 repo update

microk8s helm3 install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.kubeletDirPath=/var/snap/microk8s/common/var/lib/kubelet
```

## Step 3 - Deploy the Ceph Cluster

```yaml
# cluster-microk8s.yaml
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
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]$"
    config:
      osdsPerDevice: "1"
```

```bash
microk8s kubectl apply -f cluster-microk8s.yaml
```

## Step 4 - Verify OSD Pods

```bash
microk8s kubectl -n rook-ceph get pods | grep osd
microk8s kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Step 5 - Create Block Storage Class

```bash
microk8s kubectl apply -f - <<'EOF'
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
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
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
EOF
```

## Troubleshooting Snap Path Issues

If CSI pods fail to mount volumes, verify the snap path is accessible:

```bash
microk8s kubectl -n rook-ceph logs ds/csi-rbdplugin -c csi-rbdplugin | grep -i "kubelet"
```

Check the correct snap path:

```bash
ls /var/snap/microk8s/common/var/lib/kubelet/
```

Update Helm release if the path was wrong:

```bash
microk8s helm3 upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.kubeletDirPath=/var/snap/microk8s/common/var/lib/kubelet
```

## Summary

Rook-Ceph on MicroK8s requires setting the kubelet directory path to MicroK8s's snap-based location. After disabling the default hostpath storage add-on and configuring the correct kubelet path in the Helm chart, Rook-Ceph deploys normally using raw block devices as OSDs, providing replicated persistent storage for MicroK8s multi-node clusters.
