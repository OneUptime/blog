# How to Configure Azure Files CSI Driver for ReadWriteMany Persistent Volumes on AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure Files, CSI Driver, Persistent Volumes, Kubernetes, Storage, Azure

Description: How to configure Azure Files CSI Driver on AKS for shared persistent volumes that multiple pods can read from and write to simultaneously.

---

Most Kubernetes storage options support ReadWriteOnce (RWO) access mode, meaning only one pod can mount the volume at a time. But many applications need shared storage that multiple pods access simultaneously - content management systems, shared configuration directories, file upload services, and legacy applications that depend on shared filesystems. Azure Files provides ReadWriteMany (RWX) persistent volumes on AKS through the CSI driver, backed by Azure file shares using SMB or NFS protocols.

## Understanding Access Modes

Kubernetes defines three access modes for persistent volumes:

- **ReadWriteOnce (RWO)**: One pod can read and write. Azure Disks support this.
- **ReadOnlyMany (ROX)**: Many pods can read, none can write.
- **ReadWriteMany (RWX)**: Many pods can read and write simultaneously. Azure Files supports this.

If you try to use Azure Disks with RWX, Kubernetes will reject the claim. Azure Files is the answer when you need shared, writable storage.

## Prerequisites

- An AKS cluster running Kubernetes 1.21 or later (CSI driver is enabled by default)
- Azure CLI installed and configured
- kubectl configured for your cluster
- An Azure Storage Account (or let AKS create one dynamically)

## Step 1: Verify CSI Driver Is Available

Recent AKS versions include the Azure Files CSI driver by default. Verify it is running.

```bash
# Check that the Azure Files CSI driver pods are running
kubectl get pods -n kube-system -l app=csi-azurefile-node

# Verify the CSI driver is registered
kubectl get csidriver file.csi.azure.com
```

You should see CSI driver pods running on each node and the CSI driver object registered in the cluster.

## Step 2: Choose Between Dynamic and Static Provisioning

**Dynamic provisioning** lets Kubernetes create the Azure file share automatically when a PersistentVolumeClaim (PVC) is created. This is simpler and works well for most use cases.

**Static provisioning** uses a pre-existing Azure file share. Use this when you need to control the storage account configuration, want to share data with non-Kubernetes workloads, or need to use an existing file share.

## Step 3: Dynamic Provisioning with StorageClass

AKS includes built-in storage classes for Azure Files, but creating a custom one gives you more control.

```yaml
# storage-class.yaml
# Custom StorageClass for Azure Files with specific settings
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-csi-rwx
provisioner: file.csi.azure.com
parameters:
  # Use Standard storage tier (cheaper, suitable for most workloads)
  skuName: Standard_LRS
  # Enable large file shares (up to 100 TiB)
  enableLargeFileShares: "true"
  # Protocol: smb or nfs
  protocol: smb
# Allow volume expansion after creation
allowVolumeExpansion: true
# Delete the Azure file share when the PVC is deleted
reclaimPolicy: Delete
# WaitForFirstConsumer ensures the share is created in the same zone as the pod
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  # Set directory and file permissions
  - dir_mode=0777
  - file_mode=0777
  - uid=0
  - gid=0
  - mfsymlinks
  - cache=strict
  - nosharesock
```

Apply the StorageClass.

```bash
kubectl apply -f storage-class.yaml
```

## Step 4: Create a PersistentVolumeClaim

Create a PVC that requests ReadWriteMany access using the custom StorageClass.

```yaml
# pvc.yaml
# PersistentVolumeClaim requesting shared storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage
  namespace: default
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: azurefile-csi-rwx
  resources:
    requests:
      # Request 10 GiB of storage
      storage: 10Gi
```

```bash
# Apply the PVC and watch it get bound
kubectl apply -f pvc.yaml
kubectl get pvc shared-storage --watch
```

The PVC should transition from Pending to Bound within a minute as the CSI driver creates the Azure file share.

## Step 5: Mount the Volume in Multiple Pods

Now deploy multiple pods that mount the same PVC. Here is a Deployment with 3 replicas that all share the volume.

```yaml
# shared-app.yaml
# Deployment with multiple replicas sharing the same Azure Files volume
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shared-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shared-app
  template:
    metadata:
      labels:
        app: shared-app
    spec:
      containers:
      - name: app
        image: nginx:1.25
        ports:
        - containerPort: 80
        volumeMounts:
        # Mount the shared volume at /data
        - name: shared-data
          mountPath: /data
        # Custom nginx config to serve files from /data
        command:
        - /bin/sh
        - -c
        - |
          echo "Pod $(hostname) started at $(date)" >> /data/log.txt
          nginx -g 'daemon off;'
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: shared-storage
```

Apply and verify all pods mount the volume successfully.

```bash
kubectl apply -f shared-app.yaml

# Check all pods are running
kubectl get pods -l app=shared-app

# Verify the shared volume by writing from one pod and reading from another
kubectl exec deployment/shared-app -- cat /data/log.txt
```

You should see log entries from all three pods in the same file, confirming that the volume is shared.

## Step 6: Static Provisioning with Pre-existing File Share

For static provisioning, create the storage account and file share first.

```bash
# Create a storage account
az storage account create \
  --resource-group myResourceGroup \
  --name mystorageaccount \
  --sku Standard_LRS \
  --kind StorageV2

# Create a file share
az storage share create \
  --name myfileshare \
  --account-name mystorageaccount \
  --quota 50

# Get the storage account key
export STORAGE_KEY=$(az storage account keys list \
  --resource-group myResourceGroup \
  --account-name mystorageaccount \
  --query "[0].value" \
  --output tsv)
```

Create a Kubernetes Secret with the storage account credentials.

```bash
# Create a secret with the storage account name and key
kubectl create secret generic azure-storage-secret \
  --from-literal=azurestorageaccountname=mystorageaccount \
  --from-literal=azurestorageaccountkey="$STORAGE_KEY"
```

Create a PersistentVolume and PVC that reference the existing file share.

```yaml
# static-pv.yaml
# PersistentVolume pointing to an existing Azure file share
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-azurefile-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
  - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  csi:
    driver: file.csi.azure.com
    readOnly: false
    volumeHandle: unique-volume-id-123
    volumeAttributes:
      # Reference the existing storage account and share
      resourceGroup: myResourceGroup
      storageAccount: mystorageaccount
      shareName: myfileshare
      protocol: smb
    nodeStageSecretRef:
      name: azure-storage-secret
      namespace: default
---
# PVC that binds to the static PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: static-shared-storage
  namespace: default
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: ""
  resources:
    requests:
      storage: 50Gi
  volumeName: static-azurefile-pv
```

## Using NFS Protocol Instead of SMB

NFS offers better performance for Linux workloads and supports POSIX file locking. To use NFS, you need a Premium storage account.

```yaml
# nfs-storage-class.yaml
# StorageClass using NFS protocol for better Linux performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-nfs-rwx
provisioner: file.csi.azure.com
parameters:
  # Premium tier is required for NFS
  skuName: Premium_LRS
  # Use NFS protocol instead of SMB
  protocol: nfs
  # Enable large file shares
  enableLargeFileShares: "true"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - nconnect=4
```

NFS file shares do not require a Kubernetes Secret because they use network-level authentication instead of account keys. The AKS nodes must have network access to the storage account, typically through a private endpoint or service endpoint.

## Performance Tuning

Azure Files performance depends on the storage tier and configuration. Here are tips for getting the best throughput.

**Use Premium tier** for workloads that need consistent performance. Standard tier has variable IOPS and throughput based on the share size.

**Increase share size** even if you do not need the space. Azure Files scales IOPS and throughput with share size. A 1 TiB Premium share provides 1,024 baseline IOPS and 65 MiB/s throughput.

**Use NFS with nconnect** for Linux workloads. The `nconnect=4` mount option creates multiple TCP connections, increasing throughput for parallel operations.

**Enable large file shares** on the storage account. Without this flag, shares are limited to 5 TiB.

## Troubleshooting

**PVC stuck in Pending**: Check the events on the PVC with `kubectl describe pvc shared-storage`. Common causes include the storage account quota being full, the CSI driver not running, or network restrictions blocking access to the storage account.

**Permission denied errors**: Verify the mount options include appropriate `dir_mode` and `file_mode` settings. For SMB, these default to 0777 but may need adjustment for your application.

**Slow performance**: Check the storage tier. Standard LRS provides about 60 MiB/s for a 5 TiB share. If you need more, upgrade to Premium. Also check if the pods and storage account are in the same region.

**Mount failures after node restart**: The CSI driver re-mounts volumes automatically, but transient failures can occur. Check the kubelet logs on the affected node for CSI-related errors.

## Summary

Azure Files with the CSI driver is the straightforward way to get ReadWriteMany storage on AKS. Dynamic provisioning with a custom StorageClass handles most use cases, while static provisioning works when you need to share data with external systems. Choose SMB for Windows compatibility or NFS for better Linux performance. Size your shares appropriately for the IOPS and throughput you need, and use Premium tier for latency-sensitive workloads.
