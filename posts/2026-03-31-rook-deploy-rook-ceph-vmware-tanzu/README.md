# How to Deploy Rook-Ceph on VMware Tanzu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, VMware, Tanzu, Kubernetes, Storage, vSphere

Description: Deploy Rook-Ceph on VMware Tanzu Kubernetes clusters with vSphere-specific storage and network considerations.

---

## Overview

VMware Tanzu Kubernetes Grid (TKG) provides enterprise Kubernetes on vSphere. Deploying Rook-Ceph on Tanzu enables distributed storage independent of vSAN, useful when vSAN licenses are unavailable or when you need S3-compatible object storage. This guide covers Tanzu-specific considerations for Rook-Ceph deployment.

## Prerequisites

- VMware Tanzu Kubernetes Grid cluster with 3+ worker nodes
- Additional vSphere VMDK disks attached to worker VMs for OSDs
- `tanzu`, `kubectl`, and `helm` CLIs configured
- vSphere permissions to add disks to VMs

## Step 1 - Attach Additional Disks to Tanzu Worker VMs

In vSphere, add new virtual disks to each worker node VM:

1. Navigate to vSphere Client > VMs > worker-node-1
2. Edit Settings > Add New Device > Hard Disk
3. Set size to 100GB, Thick Provision for better performance
4. Repeat for all worker nodes

Verify the disk is visible inside the VM:

```bash
kubectl debug node/worker-node-1 -it --image=ubuntu -- lsblk
```

The new disk typically appears as `/dev/sdb`.

## Step 2 - Install Rook Operator on Tanzu

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableCSIHostNetwork=true
```

For Tanzu with PSP restrictions (older TKG versions):

```bash
kubectl create clusterrolebinding rook-ceph-operator-psp \
  --clusterrole=psp:vmware-system-privileged \
  --serviceaccount=rook-ceph:rook-ceph-operator
```

## Step 3 - Deploy the Ceph Cluster

```yaml
# cluster-tanzu.yaml
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
  dashboard:
    enabled: true
    ssl: true
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sdb$"
    config:
      osdsPerDevice: "1"
```

```bash
kubectl apply -f cluster-tanzu.yaml
```

## Step 4 - vSphere Network Considerations

Tanzu clusters run on VMware NSX-T or vSphere networking. Ensure Ceph ports are open:

```bash
# Check firewall rules via NSX-T or vSphere Distributed Switch
# Required ports: 6789 (mon), 3300 (mon), 6800-7300 (OSD)
```

If using NSX-T, create firewall rules allowing Ceph traffic between worker nodes:

```yaml
Source: worker-node-security-group
Destination: worker-node-security-group
Ports: TCP 6789, 3300, 6800-7300
Action: Allow
```

## Step 5 - Create Storage Classes

```bash
kubectl apply -f - <<'EOF'
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
EOF
```

## Step 6 - Verify Health

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

## Summary

Deploying Rook-Ceph on VMware Tanzu requires attaching additional virtual disks to worker VMs through vSphere, configuring NSX-T firewall rules for Ceph inter-node communication, and addressing PodSecurityPolicy restrictions present in older TKG versions. Once deployed, Rook-Ceph provides distributed block and object storage independent of vSAN, enhancing the storage options available to Tanzu workloads.
