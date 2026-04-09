# How to Deploy Rook-Ceph on Azure AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Azure AKS, Kubernetes, Storage, Azure, Block Storage

Description: Deploy Rook-Ceph on Azure Kubernetes Service using Azure Managed Disks as OSD devices for persistent distributed storage.

---

## Overview

Azure Kubernetes Service (AKS) provides managed Kubernetes where Rook-Ceph can run as the storage backend. Azure Managed Disks are attached to VM nodes as raw block devices, which Ceph uses as OSDs. This guide covers AKS-specific configuration including disk attachment and security considerations.

## Prerequisites

- An AKS cluster with at least 3 worker nodes (Standard_D4s_v3 or similar)
- Azure CLI, `kubectl`, and `helm` configured
- Contributor role on the AKS resource group
- Azure Managed Disks quota sufficient for OSD drives

## Step 1 - Create and Attach Azure Managed Disks

```bash
# Get the resource group for the AKS node VMs
AKS_RG=$(az aks show -g my-rg -n my-aks --query nodeResourceGroup -o tsv)

# Get list of nodes
kubectl get nodes -o wide

# Attach a disk to each node's VM
for i in 0 1 2; do
  DISK_ID=$(az disk create \
    --resource-group $AKS_RG \
    --name ceph-osd-$i \
    --size-gb 128 \
    --sku Premium_LRS \
    --query id -o tsv)

  VM_NAME=$(az vmss list --resource-group $AKS_RG --query "[0].name" -o tsv)

  az vmss disk attach \
    --resource-group $AKS_RG \
    --vmss-name $VM_NAME \
    --instance-id $i \
    --disk $DISK_ID \
    --lun $i
done
```

## Step 2 - Install Rook-Ceph Operator

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableCSIHostNetwork=true \
  --set csi.provisionerTolerations[0].operator=Exists
```

## Step 3 - Create the CephCluster Manifest

Use a device filter to target only the attached Managed Disks:

```yaml
# cluster-aks.yaml
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
    deviceFilter: "^sd[c-z]$"
    config:
      osdsPerDevice: "1"
```

```bash
kubectl apply -f cluster-aks.yaml
```

## Step 4 - Handle AKS Security Context

AKS nodes use certain security policies. Ensure Rook's PSP (if applicable) allows privileged pods:

```bash
kubectl create clusterrolebinding rook-ceph-privileged \
  --clusterrole=rook-ceph-operator \
  --serviceaccount=rook-ceph:rook-ceph-operator
```

For AKS with Azure Policy addon, you may need to disable it if policies block privileged pods:

```bash
az aks disable-addons \
  --addons azure-policy \
  --resource-group my-rg \
  --name my-aks
```

## Step 5 - Create CephBlockPool and Storage Class

Create the block pool that the StorageClass will reference:

```yaml
# blockpool-aks.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

```bash
kubectl apply -f blockpool-aks.yaml
```

Then create the StorageClass:

```yaml
# storageclass-aks.yaml
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
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f storageclass-aks.yaml
```

## Step 6 - Deploy Toolbox and Verify Health

Deploy the Rook toolbox to run Ceph commands:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/release-1.14/deploy/examples/toolbox.yaml
```

Wait for the toolbox pod to be ready, then verify the cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

## Summary

Deploying Rook-Ceph on AKS involves attaching Azure Managed Disks to VMSS instances, installing the Rook operator via Helm, and creating a CephCluster with device filters. AKS-specific security considerations around privileged pods and Azure Policy must be addressed for smooth deployment. The resulting cluster provides RBD and CephFS storage classes for AKS workloads.
