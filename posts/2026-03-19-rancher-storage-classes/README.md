# How to Create Storage Classes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, StorageClass

Description: Learn how to create and configure Storage Classes in Rancher for dynamic volume provisioning across different storage backends.

Storage Classes in Kubernetes define the type of storage available for dynamic provisioning. They abstract the underlying storage infrastructure, allowing developers to request storage without knowing the details of the backend. This guide shows how to create and manage Storage Classes in Rancher.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- A storage provisioner (CSI driver, cloud provider, or local provisioner)
- kubectl access to your cluster

## Understanding Storage Classes

A StorageClass provides a way to describe different tiers of storage. Each class can map to different quality-of-service levels, backup policies, or storage backends. When a PVC references a StorageClass, Kubernetes automatically provisions a PV.

## Step 1: View Existing Storage Classes

```bash
kubectl get storageclass
```

Depending on the cluster and provider, you may already have a default StorageClass. The default is marked with `(default)` in the output.

## Step 2: Create a Storage Class via kubectl

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f fast-storage-class.yaml
```

## Step 3: Create a Storage Class via the Rancher UI

1. In the Rancher dashboard, go to **Cluster Management**, open your cluster, and click **Explore**.
2. Go to **Storage** > **Storage Classes**.
3. Click **Create**.
4. Configure:
   - **Name**: `fast-storage`
   - **Provisioner**: Select from the dropdown (e.g., Amazon EBS Disk, Azure Disk, etc.)
   - **Reclaim Policy**: `Delete` or `Retain`
   - **Volume Binding Mode**: `WaitForFirstConsumer` or `Immediate`
   - **Allow Volume Expansion**: Enable
5. Add provisioner-specific parameters.
6. Click **Create**.

## Step 4: Set a Default Storage Class

Mark a StorageClass as the default:

```bash
# Remove default from current default

kubectl patch storageclass <current-default> -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'

# Set new default
kubectl patch storageclass fast-storage -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

PVCs that do not specify a StorageClass will use the default if one exists.

## Step 5: Create Storage Classes for Different Tiers

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "5000"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: archive
provisioner: ebs.csi.aws.com
parameters:
  type: sc1
reclaimPolicy: Delete
allowVolumeExpansion: false
volumeBindingMode: WaitForFirstConsumer
```

## Step 6: Use a Storage Class in a PVC

Reference the StorageClass in your PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fast-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: premium
  resources:
    requests:
      storage: 50Gi
```

The provisioner will automatically create a PV matching the requested class.

## Step 7: Configure Volume Binding Mode

Two binding modes are available:

**Immediate**: PV is provisioned as soon as the PVC is created.

```yaml
volumeBindingMode: Immediate
```

**WaitForFirstConsumer**: PV is provisioned only when a pod using the PVC is scheduled. This ensures the volume is created in the same availability zone as the pod.

```yaml
volumeBindingMode: WaitForFirstConsumer
```

Use `WaitForFirstConsumer` for cloud environments to avoid zone mismatch issues.

## Step 8: Configure Mount Options

Specify mount options for volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-storage
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.example.com
  share: /exports/data
mountOptions:
  - hard
  - nfsvers=4.1
  - rsize=1048576
  - wsize=1048576
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

## Step 9: Configure Allowed Topologies

Restrict where volumes can be provisioned:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zone-restricted
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.ebs.csi.aws.com/zone
    values:
    - us-east-1a
    - us-east-1b
```

## Step 10: Monitor Storage Classes

```bash
# List all storage classes
kubectl get storageclass

# Describe a storage class
kubectl describe storageclass fast-storage

# View PVCs using a specific storage class
kubectl get pvc --all-namespaces -o custom-columns='NAME:.metadata.name,NAMESPACE:.metadata.namespace,CLASS:.spec.storageClassName,STATUS:.status.phase'

# Check provisioner pods
kubectl get pods --all-namespaces | grep -i csi
```

## Troubleshooting

- **PVC Pending with no PV**: Check the provisioner is running and the StorageClass name matches
- **Zone mismatch**: Use `WaitForFirstConsumer` binding mode
- **Provisioner not found**: Verify the CSI driver is installed
- **Volume expansion fails**: Ensure `allowVolumeExpansion: true` is set
- **Default class conflicts**: Try to keep only one StorageClass marked as default; if multiple defaults exist, Kubernetes uses the most recently created default for PVCs without `storageClassName`

## Summary

Storage Classes in Rancher enable dynamic volume provisioning, allowing developers to request storage without managing the underlying infrastructure. By creating multiple classes for different performance tiers, setting appropriate reclaim policies, and configuring volume binding modes, you can build a flexible storage layer that meets the needs of all your workloads.
