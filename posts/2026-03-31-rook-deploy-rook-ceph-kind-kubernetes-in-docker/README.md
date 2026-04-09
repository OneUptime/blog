# How to Deploy Rook-Ceph on Kind (Kubernetes in Docker)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kind, Kubernetes, Docker, Development, Testing

Description: Deploy a working Rook-Ceph cluster on Kind using loop devices or host-mounted directories for OSD testing and development.

---

## Overview

Kind (Kubernetes in Docker) is a popular tool for running Kubernetes clusters locally using Docker containers as nodes. Deploying Rook-Ceph on Kind is useful for development, testing, and CI pipelines. Since Kind nodes are containers without real block devices, you need to use loop devices or directory-backed OSDs. This guide covers both approaches.

## Prerequisites

- Docker and Kind installed
- `kubectl` and `helm` available
- Linux host (loop device support required)

## Step 1 - Create a Kind Cluster with Multiple Nodes

```yaml
# kind-cluster.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
    extraMounts:
      - hostPath: /dev
        containerPath: /dev
  - role: worker
    extraMounts:
      - hostPath: /dev
        containerPath: /dev
  - role: worker
    extraMounts:
      - hostPath: /dev
        containerPath: /dev
```

```bash
kind create cluster --config kind-cluster.yaml --name rook-test
```

## Step 2 - Create Loop Devices for OSDs

On the Linux host, create loop files and load them as loop devices:

```bash
#!/bin/bash
for i in 1 2 3; do
  # Create a 10GB sparse file
  truncate -s 10G /tmp/ceph-osd-$i.img
  # Attach as loop device
  LOOP=$(losetup -f --show /tmp/ceph-osd-$i.img)
  echo "Created $LOOP for OSD $i"
done
```

## Step 3 - Expose Loop Devices to Kind Nodes

Since Kind nodes are containers, you need to exec into each worker and expose the loop device:

```bash
for NODE in $(kind get nodes --name rook-test | grep worker); do
  docker exec $NODE bash -c "
    mknod /dev/loop10 b 7 10 2>/dev/null || true
    mknod /dev/loop11 b 7 11 2>/dev/null || true
    mknod /dev/loop12 b 7 12 2>/dev/null || true
  "
done
```

Alternatively, use the simpler directory-backed approach with `dataDirHostPath`.

## Step 4 - Install Rook Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace
```

## Step 5 - Create a Test Cluster Using Directories

For a quick Kind test on a cluster with loop devices attached, use the following configuration:

```yaml
# cluster-kind.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
    allowUnsupported: true
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: true
  mgr:
    count: 1
  storage:
    useAllNodes: true
    useAllDevices: false
    storageClassDeviceSets: []
    config:
      databaseSizeMB: "1024"
      walSizeMB: "1024"
```

```bash
kubectl apply -f cluster-kind.yaml
```

## Step 6 - Test the Deployment

```bash
kubectl -n rook-ceph get pods
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Create a test PVC:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/pvc.yaml
kubectl get pvc
```

## Cleanup

```bash
kind delete cluster --name rook-test
# Remove loop devices
for i in 1 2 3; do
  LOOP=$(losetup -j /tmp/ceph-osd-$i.img | cut -d: -f1)
  [ -n "$LOOP" ] && losetup -d "$LOOP"
  rm -f /tmp/ceph-osd-$i.img
done
```

## Summary

Deploying Rook-Ceph on Kind is ideal for development and CI testing without real hardware. Using loop devices or directory-backed OSD configurations, you can run a functional Ceph cluster inside Docker containers. While not suitable for production, Kind-based Rook deployments accelerate operator testing, CSI driver validation, and integration testing pipelines.
