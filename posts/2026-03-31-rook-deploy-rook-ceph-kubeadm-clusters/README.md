# How to Deploy Rook-Ceph on Kubeadm Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubeadm, Kubernetes, Storage, Bare Metal, Self-Hosted

Description: Deploy Rook-Ceph on bare-metal Kubernetes clusters bootstrapped with kubeadm for production-grade distributed storage.

---

## Overview

Kubeadm is the standard tool for bootstrapping vanilla Kubernetes clusters on bare metal or VMs. Kubeadm clusters use standard paths and have no cloud-specific restrictions, making them the most straightforward environment for Rook-Ceph deployment. This guide covers best practices for a production-ready kubeadm + Rook-Ceph setup.

## Prerequisites

- A kubeadm cluster with at least 3 worker nodes (8GB RAM, 4 vCPU per node)
- One unformatted raw disk per worker node (100GB+) for OSDs
- `kubectl` and `helm` configured with admin access
- Container runtime: containerd (recommended for Ceph OSD workloads)

## Step 1 - Prepare Worker Nodes

Ensure worker nodes have the required kernel modules:

```bash
# Run on each worker node
modprobe rbd
modprobe ceph

# Make persistent
echo "rbd" >> /etc/modules-load.d/rook.conf
echo "ceph" >> /etc/modules-load.d/rook.conf
```

Wipe target disks:

```bash
# On each worker node, wipe the OSD disk
wipefs -a /dev/sdb
dd if=/dev/zero of=/dev/sdb bs=1M count=100
```

## Step 2 - Install the Rook Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --version 1.13.0 \
  --set csi.enableCSIHostNetwork=true \
  --set csi.enableRbdDriver=true \
  --set csi.enableCephfsDriver=true
```

## Step 3 - Deploy the Ceph Cluster

```yaml
# cluster-kubeadm.yaml
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
  mgr:
    count: 2
    modules:
      - name: pg_autoscaler
        enabled: true
      - name: dashboard
        enabled: true
  dashboard:
    enabled: true
    ssl: true
  network:
    connections:
      compression:
        enabled: false
      encryption:
        enabled: false
  crashCollector:
    disable: false
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "worker1.example.com"
        devices:
          - name: "sdb"
      - name: "worker2.example.com"
        devices:
          - name: "sdb"
      - name: "worker3.example.com"
        devices:
          - name: "sdb"
```

```bash
kubectl apply -f cluster-kubeadm.yaml
```

## Step 4 - Deploy the Toolbox

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml

# Wait for toolbox
kubectl -n rook-ceph rollout status deploy/rook-ceph-tools

# Check cluster health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Step 5 - Create Storage Classes

```bash
# Block storage
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml

# CephFS shared storage
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/filesystem.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/cephfs/storageclass.yaml
```

## Step 6 - Enable Monitoring

Integrate with kube-prometheus-stack if deployed:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/service-monitor.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/localrules.yaml
```

## Summary

Kubeadm clusters provide the cleanest Rook-Ceph deployment experience with standard Kubernetes paths and no cloud-vendor restrictions. Preparing nodes with the rbd kernel module, explicitly listing OSD devices per node, and enabling monitoring from the start produces a production-ready Ceph cluster that provides block, file, and object storage for bare-metal Kubernetes workloads.
