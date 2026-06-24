# How to Deploy Rook-Ceph on Canonical Charmed Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Canonical, Charmed Kubernetes, Juju, Storage, Ubuntu

Description: Deploy Rook-Ceph on Canonical Charmed Kubernetes clusters managed with Juju, using snap-based paths and charm integration.

---

## Overview

Canonical Charmed Kubernetes is deployed and managed using Juju charms. While Charmed Kubernetes offers its own Ceph charm, you may prefer Rook-Ceph for Kubernetes-native storage management. This guide covers deploying Rook-Ceph on a Charmed Kubernetes cluster with Juju-specific considerations.

## Prerequisites

- A Charmed Kubernetes cluster deployed with Juju
- At least 3 worker units with additional disks
- `juju`, `kubectl`, and `helm` installed
- Kubeconfig exported from the Charmed Kubernetes controller

## Step 1 - Export Kubeconfig

```bash
juju ssh kubernetes-control-plane/leader -- cat config > ~/.kube/config
kubectl get nodes
```

## Step 2 - Prepare Worker Disks

Check available disks on worker nodes:

```bash
juju exec --unit kubernetes-worker/0 -- "lsblk -d -o NAME,SIZE,TYPE"
juju exec --unit kubernetes-worker/1 -- "lsblk -d -o NAME,SIZE,TYPE"
juju exec --unit kubernetes-worker/2 -- "lsblk -d -o NAME,SIZE,TYPE"
```

Ensure the target disks have no filesystem:

```bash
juju exec --unit kubernetes-worker/0 -- "wipefs -a /dev/vdb"
juju exec --unit kubernetes-worker/1 -- "wipefs -a /dev/vdb"
juju exec --unit kubernetes-worker/2 -- "wipefs -a /dev/vdb"
```

## Step 3 - Install Rook Operator

Charmed Kubernetes uses standard kubelet paths:

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableCSIHostNetwork=true
```

## Step 4 - Deploy the Ceph Cluster

```yaml
# cluster-charmed.yaml
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
    count: 1
    modules:
      - name: pg_autoscaler
        enabled: true
  dashboard:
    enabled: true
    ssl: false
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^vdb$"
    config:
      osdsPerDevice: "1"
```

```bash
kubectl apply -f cluster-charmed.yaml
```

## Step 5 - Watch Cluster Formation

```bash
watch kubectl -n rook-ceph get pods
```

Expected pods after successful deployment:

```text
rook-ceph-mon-a-xxx        Running
rook-ceph-mon-b-xxx        Running
rook-ceph-mon-c-xxx        Running
rook-ceph-mgr-a-xxx        Running
rook-ceph-osd-0-xxx        Running
rook-ceph-osd-1-xxx        Running
rook-ceph-osd-2-xxx        Running
```

## Step 6 - Integrate with Juju Workloads

Create a storage class for use by Juju-deployed applications:

```bash
kubectl apply -f - <<'EOF'
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
EOF
```

Create a Juju storage pool backed by the Rook-Ceph storage class:

```bash
juju create-storage-pool rook-ceph-pool kubernetes storage-class=rook-ceph-block
juju deploy my-app --storage data=rook-ceph-pool,10G
```

## Monitoring with Juju

Add the Ceph monitoring integration:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/service-monitor.yaml

# Forward dashboard port
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 7000:7000
```

## Summary

Deploying Rook-Ceph on Canonical Charmed Kubernetes follows standard Kubernetes deployment patterns since Charmed Kubernetes uses conventional kubelet paths. Using Juju run commands to prepare worker disks, then installing Rook via Helm and applying the CephCluster manifest, produces a production-ready Ceph cluster that Juju-managed applications can consume through Kubernetes storage classes.
