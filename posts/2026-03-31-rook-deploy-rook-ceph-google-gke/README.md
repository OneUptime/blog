# How to Deploy Rook-Ceph on Google GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GKE, Kubernetes, Storage, Google Cloud, Block Storage

Description: Deploy Rook-Ceph on Google Kubernetes Engine using Persistent Disks as OSD backing devices for cloud-native distributed storage.

---

## Overview

Google Kubernetes Engine (GKE) provides a managed Kubernetes platform where Rook-Ceph can supply distributed storage. Since GKE nodes use Google Persistent Disks, you need to provision additional PDs and attach them to nodes as raw block devices for Ceph OSDs. This guide covers the GKE-specific deployment workflow.

## Prerequisites

- A GKE cluster with at least 3 nodes in a node pool
- `gcloud`, `kubectl`, and `helm` CLI tools configured
- Node service account with `compute.disks.use` permissions

## Step 1 - Attach Persistent Disks to Nodes

Provision and attach additional PDs to worker nodes:

```bash
# List GKE nodes
kubectl get nodes -o wide

# Create a PD for each node
for i in 1 2 3; do
  gcloud compute disks create ceph-osd-disk-$i \
    --size=100GB \
    --type=pd-ssd \
    --zone=us-central1-a

  gcloud compute instances attach-disk \
    gke-my-cluster-default-pool-node-$i \
    --disk=ceph-osd-disk-$i \
    --zone=us-central1-a \
    --device-name=sdb
done
```

## Step 2 - Label Nodes for Ceph

Label the storage nodes so Rook targets them:

```bash
kubectl label nodes \
  gke-my-cluster-default-pool-node-1 \
  gke-my-cluster-default-pool-node-2 \
  gke-my-cluster-default-pool-node-3 \
  role=storage-node
```

## Step 3 - Install Rook Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set nodeSelector."role"=storage-node
```

## Step 4 - Deploy the Ceph Cluster

```yaml
# cluster-gke.yaml
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
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: role
                  operator: In
                  values:
                    - storage-node
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sdb$"
```

```bash
kubectl apply -f cluster-gke.yaml
```

## Step 5 - Configure GKE Firewall Rules

Allow intra-cluster Ceph communication:

```bash
gcloud compute firewall-rules create allow-ceph-internal \
  --network=default \
  --allow=tcp:6789,tcp:3300,tcp:6800-7300 \
  --source-tags=gke-my-cluster \
  --target-tags=gke-my-cluster
```

## Step 6 - Verify Deployment

Deploy the Rook toolbox and check cluster health:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

Create a CephBlockPool, StorageClass, and test PVC:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/pool.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/pvc.yaml
kubectl get pvc rbd-pvc
```

## Summary

Deploying Rook-Ceph on GKE requires creating additional Persistent Disks, attaching them to worker nodes, and configuring the Rook operator to use those devices. Using node selectors and placement policies ensures Ceph components only run on storage-designated nodes, while firewall rules allow intra-cluster Ceph communication across GKE's VPC network.
