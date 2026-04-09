# How to Deploy Rook-Ceph on k0s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, k0s, Kubernetes, Storage, Lightweight, Zero-Friction

Description: Deploy Rook-Ceph on k0s Kubernetes by configuring the correct kubelet and containerd paths specific to k0s installations.

---

## Overview

k0s is a zero-friction, single-binary Kubernetes distribution that installs with minimal configuration. Like k3s, k0s uses non-standard paths for kubelet and containerd data, which must be configured for Rook-Ceph's CSI drivers to work properly. This guide covers the k0s-specific deployment process.

## Prerequisites

- A k0s cluster with at least 3 worker nodes
- Unformatted raw block devices on each worker node
- `k0sctl`, `kubectl`, and `helm` installed

## k0s Path Differences

k0s stores data in:
- Kubelet data directory: `/var/lib/k0s/kubelet`
- Containerd socket: `/run/k0s/containerd.sock`

These paths must be provided to the Rook Helm chart.

## Step 1 - Verify k0s Node Status

```bash
# Check node status
k0s kubectl get nodes

# Verify kubelet data path on a node
ls /var/lib/k0s/kubelet/
```

## Step 2 - Install Rook Operator with k0s Paths

```yaml
# rook-values-k0s.yaml
csi:
  kubeletDirPath: /var/lib/k0s/kubelet
  enableCSIHostNetwork: true
  csiRBDPluginVolume:
    - name: host-dev
      hostPath:
        path: /dev
  csiCephFSPluginVolume:
    - name: host-dev
      hostPath:
        path: /dev
```

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  -f rook-values-k0s.yaml
```

## Step 3 - Deploy the Ceph Cluster

```yaml
# cluster-k0s.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.2
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
    modules:
      - name: pg_autoscaler
        enabled: true
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]$"
```

```bash
kubectl apply -f cluster-k0s.yaml
```

## Step 4 - Watch Cluster Formation

```bash
kubectl -n rook-ceph get pods -w
```

Once all OSD pods are running, check cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

## Step 5 - Create Storage Class and Pool

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml
```

Or create a custom pool:

```yaml
# custom-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: false
```

```bash
kubectl apply -f custom-pool.yaml
```

## Troubleshooting k0s CSI Registration

If CSI nodes do not register, verify the kubelet plugin path:

```bash
kubectl -n rook-ceph get csinodes
```

Check if the socket exists at the k0s path:

```bash
# On a worker node
ls -la /run/k0s/containerd.sock
ls -la /var/lib/k0s/kubelet/plugins/
```

If missing, update the Helm values and redeploy the CSI daemonsets:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-values-k0s.yaml
```

## Summary

Deploying Rook-Ceph on k0s requires setting `csi.kubeletDirPath=/var/lib/k0s/kubelet` in the Rook Helm values to match k0s's non-standard directory structure. After that adjustment, the deployment proceeds like any standard Kubernetes cluster, with raw block devices configured as OSDs and storage classes providing persistent volumes for k0s workloads.
