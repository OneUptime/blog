# How to Set Up Azure File Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure, Azure Files, CSI, Storage, Kubernetes

Description: Learn how to deploy the Azure File CSI driver on Talos Linux for shared file storage across multiple pods and nodes.

---

While Azure Disk gives you block storage for single-pod workloads, some applications need shared storage that multiple pods can read and write simultaneously. Azure Files provides SMB and NFS file shares that can be mounted by multiple pods across multiple nodes. This guide covers setting up the Azure File CSI driver on Talos Linux for these shared storage scenarios.

## When to Use Azure Files Over Azure Disk

Azure Disk provides ReadWriteOnce (RWO) access, meaning only one pod can mount a given disk at a time. Azure Files supports ReadWriteMany (RWX), allowing multiple pods on different nodes to mount the same file share simultaneously.

Common use cases for Azure Files include content management systems where multiple web server pods need access to the same uploaded files, machine learning workloads that share training data, legacy applications that expect a shared filesystem, and configuration data that needs to be available cluster-wide.

The trade-off is performance. Azure Disk, especially Premium SSD, offers significantly lower latency and higher IOPS than Azure Files. For databases and other latency-sensitive workloads, stick with Azure Disk.

## Prerequisites

You need the following:

- A Talos Linux cluster on Azure with the cloud provider configured
- `kubectl` and Helm installed
- An Azure Storage Account (or permissions to create one)
- The service principal or managed identity used by the cloud provider

## Creating a Storage Account

If you do not already have one, create a storage account for your file shares:

```bash
# Create a storage account for Azure Files
az storage account create \
  --name talosfilestorage \
  --resource-group <resource-group> \
  --location <region> \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-large-file-share

# If you need NFS shares, create a premium account
az storage account create \
  --name talosfilesnfs \
  --resource-group <resource-group> \
  --location <region> \
  --sku Premium_LRS \
  --kind FileStorage \
  --enable-large-file-share
```

The `enable-large-file-share` flag allows shares up to 100 TiB. Without it, you are limited to 5 TiB per share.

## Deploying the Azure File CSI Driver

Install the driver using Helm:

```bash
# Add the Helm repository
helm repo add azurefile-csi-driver https://raw.githubusercontent.com/kubernetes-sigs/azurefile-csi-driver/master/charts
helm repo update

# Install the driver
helm install azurefile-csi-driver azurefile-csi-driver/azurefile-csi-driver \
  --namespace kube-system \
  --set controller.replicas=2 \
  --set cloud=AzurePublicCloud
```

## Verifying the Installation

Check that everything is running:

```bash
# Verify controller and node pods
kubectl get pods -n kube-system -l app=csi-azurefile-controller
kubectl get pods -n kube-system -l app=csi-azurefile-node

# Verify CSI driver is registered
kubectl get csidrivers | grep file.csi.azure.com
```

## Creating Storage Classes

Create StorageClasses for different file share types:

```yaml
# smb-storageclass.yaml - SMB file share (standard)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-file-smb
provisioner: file.csi.azure.com
parameters:
  skuName: Standard_LRS
  # The driver creates the storage account automatically if not specified
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
  - dir_mode=0777
  - file_mode=0777
  - uid=0
  - gid=0
  - mfsymlinks
  - cache=strict
  - nosharesock
---
# nfs-storageclass.yaml - NFS file share (premium)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-file-nfs
provisioner: file.csi.azure.com
parameters:
  skuName: Premium_LRS
  protocol: nfs
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
  - nconnect=4
```

```bash
# Apply the storage classes
kubectl apply -f smb-storageclass.yaml
kubectl apply -f nfs-storageclass.yaml
```

The mount options for SMB shares matter a lot. The `dir_mode` and `file_mode` settings control permissions, and `nosharesock` prevents connection sharing issues. For NFS shares, `nconnect=4` allows multiple TCP connections per mount for better throughput.

## Testing Shared Storage

Create a PVC with ReadWriteMany access and two pods that share it:

```yaml
# shared-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-files
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: azure-file-smb
  resources:
    requests:
      storage: 10Gi
---
# Writer pod - writes data to the shared volume
apiVersion: v1
kind: Pod
metadata:
  name: writer-pod
spec:
  containers:
    - name: writer
      image: busybox
      command: ["sh", "-c", "while true; do date >> /shared/log.txt; sleep 5; done"]
      volumeMounts:
        - mountPath: /shared
          name: shared-volume
  volumes:
    - name: shared-volume
      persistentVolumeClaim:
        claimName: shared-files
---
# Reader pod - reads data from the shared volume
apiVersion: v1
kind: Pod
metadata:
  name: reader-pod
spec:
  containers:
    - name: reader
      image: busybox
      command: ["sh", "-c", "while true; do cat /shared/log.txt; sleep 10; done"]
      volumeMounts:
        - mountPath: /shared
          name: shared-volume
  volumes:
    - name: shared-volume
      persistentVolumeClaim:
        claimName: shared-files
```

```bash
# Deploy the shared storage test
kubectl apply -f shared-storage.yaml

# Verify both pods are running
kubectl get pods writer-pod reader-pod

# Check the reader can see the writer's data
kubectl logs reader-pod
```

## Using a Pre-Existing File Share

If you already have a file share in a storage account, you can reference it directly:

```yaml
# existing-share-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: existing-azure-share
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  csi:
    driver: file.csi.azure.com
    volumeHandle: unique-volume-id
    volumeAttributes:
      shareName: myexistingshare
      storageAccount: mystorageaccount
      resourceGroup: myresourcegroup
    nodeStageSecretRef:
      name: azure-storage-secret
      namespace: default
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: existing-share-claim
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  volumeName: existing-azure-share
  storageClassName: ""
```

Create the storage secret with your account key:

```bash
# Get the storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name mystorageaccount \
  --resource-group myresourcegroup \
  --query '[0].value' -o tsv)

# Create the Kubernetes secret
kubectl create secret generic azure-storage-secret \
  --from-literal=azurestorageaccountname=mystorageaccount \
  --from-literal=azurestorageaccountkey=$STORAGE_KEY
```

## NFS vs SMB: Which to Choose

SMB shares work on both Linux and Windows nodes and are compatible with Azure Active Directory authentication. They work well for general file sharing but have higher latency.

NFS shares require a Premium storage account and only work on Linux nodes. They offer better performance for Linux workloads, especially with many small file operations. NFS also avoids the permission mapping issues that SMB sometimes introduces.

For Talos Linux clusters, NFS is usually the better choice if performance matters to you. Talos only runs on Linux, so the cross-platform benefit of SMB does not apply.

## Performance Tuning

To get the best performance from Azure Files:

```yaml
# High-performance NFS storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-file-nfs-fast
provisioner: file.csi.azure.com
parameters:
  skuName: Premium_LRS
  protocol: nfs
  # Use a dedicated storage account for isolation
  storageAccount: dedicatedfilestorage
mountOptions:
  - nconnect=8
  - rsize=1048576
  - wsize=1048576
```

The `nconnect` option (up to 16) opens multiple TCP connections. The `rsize` and `wsize` options set read and write buffer sizes in bytes. Larger buffers improve throughput for large sequential reads and writes.

## Troubleshooting

If mounts fail, check the node plugin logs:

```bash
# Check node plugin logs for mount errors
kubectl logs -n kube-system -l app=csi-azurefile-node --tail=50

# Check events on the PVC
kubectl describe pvc shared-files
```

Common issues include network security group rules blocking SMB (port 445) or NFS (port 2049) traffic, storage account firewall settings restricting access, and incorrect storage account credentials in the Kubernetes secret.

## Conclusion

Azure Files on Talos Linux fills the shared storage gap that Azure Disk cannot. When your workloads need ReadWriteMany access, Azure Files with the CSI driver provides a managed, scalable solution. Choose NFS for Linux-only clusters with performance requirements, and SMB when you need broader compatibility. The key to a smooth experience is getting the mount options and network configuration right from the start.
