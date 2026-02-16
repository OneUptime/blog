# How to Troubleshoot AKS Volume Mount Failures with Azure Disk and Azure Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Azure Disk, Azure Files, Storage, Troubleshooting, Persistent Volumes

Description: Practical troubleshooting guide for fixing volume mount failures with Azure Disk and Azure Files on AKS including common errors and their solutions.

---

Pod stuck in ContainerCreating. The events show "Unable to attach or mount volumes." You have a database that needs its persistent storage, an application that needs a shared file system, or a log collector that needs a volume - and nothing is working. Volume mount failures on AKS are frustrating because the error messages are often vague, and the root causes range from simple permission issues to obscure Azure platform limitations.

I have compiled every volume mount failure scenario I have encountered on AKS, along with the diagnostic steps and fixes for each one. Whether you are using Azure Disk (for single-pod ReadWriteOnce access) or Azure Files (for multi-pod ReadWriteMany access), this guide covers the most common failure modes.

## The Diagnostic Starting Point

No matter what the volume issue is, always start with these commands.

```bash
# Check pod status and events
kubectl describe pod <pod-name>

# Look at the PVC status
kubectl get pvc -n <namespace>

# Check the PV status
kubectl get pv

# Look at the storage class
kubectl get storageclass

# Check CSI driver pods
kubectl get pods -n kube-system -l app=csi-azuredisk-node
kubectl get pods -n kube-system -l app=csi-azurefile-node
```

The pod events section in `kubectl describe pod` is the most informative source. It usually contains the exact Azure error message that tells you what went wrong.

## Azure Disk Issues

### Issue 1: Multi-Attach Error

Azure Disks are ReadWriteOnce by default, meaning only one node can mount them at a time. If a pod is rescheduled to a different node while the disk is still attached to the old node, you get a multi-attach error.

```
Warning  FailedAttachVolume  Multi-Attach error for volume "pvc-xyz":
Volume is already exclusively attached to one node and can't be attached to another
```

This commonly happens when a node becomes NotReady and the pod is rescheduled, but the disk detach from the old node has not completed yet.

```bash
# Check which node the disk is currently attached to
kubectl get volumeattachment | grep <pv-name>

# Force detach the volume (use with caution - data corruption risk if the old pod is still writing)
kubectl delete volumeattachment <attachment-name>

# Wait for the detach to complete, then the pod will schedule
kubectl get pod <pod-name> -w
```

A better long-term fix is to set the `maxShares` parameter on your storage class for workloads that need multi-node access.

```yaml
# shared-disk-storageclass.yaml
# Storage class for Azure shared disks (allows multi-attach)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi-shared
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  maxShares: "2"  # Allow up to 2 nodes to mount simultaneously
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### Issue 2: Disk Attach Timeout

```
Warning  FailedAttachVolume  AttachVolume.Attach failed:
rpc error: code = DeadlineExceeded desc = context deadline exceeded
```

This happens when the Azure API is slow to respond or when you are hitting API rate limits. Common causes include deploying many pods with PVCs simultaneously, Azure platform throttling, or network connectivity issues between the node and Azure APIs.

```bash
# Check if there are many pending volume attachments
kubectl get volumeattachment | grep -c "false"

# Check the CSI driver logs for more details
kubectl logs -n kube-system -l app=csi-azuredisk-controller --tail=100

# Check for Azure throttling in the cloud controller manager
kubectl logs -n kube-system -l component=cloud-controller-manager --tail=50 | grep -i throttl
```

The fix depends on the cause. For throttling, reduce the number of simultaneous PVC creations. For slow APIs, increase the attach timeout in the storage class.

### Issue 3: Disk Size Mismatch

```
Warning  ProvisioningFailed  failed to provision volume:
disk size 10 is smaller than the minimum size 4096 for Premium SSD
```

Premium SSDs have minimum sizes. P1 is the smallest at 4 GiB for Premium_LRS. If your PVC requests less than the minimum, provisioning fails.

```yaml
# Correct PVC with proper minimum size for Premium SSD
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-csi-premium
  resources:
    requests:
      # Minimum 4Gi for Premium SSD, but IOPS scale with size
      # Use at least 64Gi for decent performance
      storage: 64Gi
```

### Issue 4: Wrong Availability Zone

If your AKS cluster uses availability zones and the disk is provisioned in zone 1 but the pod is scheduled on a node in zone 2, the mount fails.

```bash
# Check which zone the disk is in
az disk show --ids <disk-resource-id> --query zones -o tsv

# Check which zone the node is in
kubectl get node <node-name> -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}'
```

The fix is to use `volumeBindingMode: WaitForFirstConsumer` in your storage class. This delays disk provisioning until a pod is scheduled, ensuring the disk is created in the same zone as the node.

```yaml
# zone-aware-storageclass.yaml
# Always use WaitForFirstConsumer in zonal clusters
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi-zone-aware
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
reclaimPolicy: Delete
# This is critical for zonal clusters
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Azure Files Issues

### Issue 5: Permission Denied on Mount

```
Warning  FailedMount  MountVolume.MountDevice failed:
rpc error: permission denied
```

Azure Files uses SMB (or NFS) protocol. Permission issues are common, especially with SMB.

```bash
# Check the storage account firewall settings
STORAGE_ACCOUNT=$(kubectl get pv <pv-name> -o jsonpath='{.spec.csi.volumeAttributes.storageAccount}')

az storage account show \
  --name $STORAGE_ACCOUNT \
  --query "networkRuleSet.defaultAction" -o tsv
```

If the default action is "Deny", you need to add the AKS subnet to the storage account's network rules.

```bash
# Get the AKS subnet ID
SUBNET_ID=$(az aks show --resource-group myRG --name myAKS --query "agentPoolProfiles[0].vnetSubnetId" -o tsv)

# Add the subnet to the storage account network rules
az storage account network-rule add \
  --account-name $STORAGE_ACCOUNT \
  --subnet $SUBNET_ID
```

### Issue 6: Azure Files Mount Options

SMB mounts on Linux can have permission issues because Linux file permissions do not map cleanly to SMB shares. Use mount options to set the correct permissions.

```yaml
# azure-files-pv.yaml
# PV with correct mount options for Linux containers
apiVersion: v1
kind: PersistentVolume
metadata:
  name: azurefile-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: azurefile-csi
  mountOptions:
    # Set proper file and directory permissions
    - dir_mode=0777
    - file_mode=0777
    - uid=1000
    - gid=1000
    - mfsymlinks
    - cache=strict
    - nosharesock
  csi:
    driver: file.csi.azure.com
    volumeHandle: unique-volume-id
    volumeAttributes:
      shareName: myfileshare
      storageAccount: mystorageaccount
    nodeStageSecretRef:
      name: azure-storage-secret
      namespace: default
```

### Issue 7: Azure Files NFS Mount Failure

If you are using NFS protocol for Azure Files (required for large file workloads), the storage account needs specific configuration.

```bash
# Create a storage account that supports NFS
az storage account create \
  --name mynfsstorageaccount \
  --resource-group myRG \
  --kind FileStorage \
  --sku Premium_LRS \
  --enable-large-file-share \
  --https-only false  # NFS requires this to be false
```

```yaml
# nfs-storageclass.yaml
# Storage class for Azure Files NFS
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-csi-nfs
provisioner: file.csi.azure.com
parameters:
  protocol: nfs
  skuName: Premium_LRS
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
  - nconnect=4
```

## Common Issues Affecting Both

### Issue 8: CSI Driver Not Installed

If the CSI driver pods are not running, no volumes will mount.

```bash
# Check CSI driver pods
kubectl get pods -n kube-system | grep csi

# If they are missing or crashing, check the AKS cluster add-on status
az aks show --resource-group myRG --name myAKS --query "storageProfile" -o json

# Ensure the CSI drivers are enabled (they are by default on recent AKS versions)
az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-disk-driver \
  --enable-file-driver
```

### Issue 9: PVC Stuck in Pending

A PVC stays in Pending when the storage class cannot provision the requested volume.

```bash
# Check PVC events for the specific error
kubectl describe pvc <pvc-name>

# Common causes:
# - Storage class does not exist
# - Quota exceeded in the subscription
# - VolumeBindingMode is WaitForFirstConsumer and no pod has been scheduled yet
```

## Quick Reference Diagnostic Script

Here is a script that collects all relevant information for storage debugging.

```bash
#!/bin/bash
# storage-debug.sh
# Collects storage debugging information for a given pod

POD=$1
NS=${2:-default}

echo "=== Pod Status ==="
kubectl get pod "$POD" -n "$NS" -o wide

echo -e "\n=== Pod Events ==="
kubectl describe pod "$POD" -n "$NS" | grep -A 20 "Events:"

echo -e "\n=== PVC Status ==="
kubectl get pvc -n "$NS"

echo -e "\n=== PV Status ==="
kubectl get pv

echo -e "\n=== Volume Attachments ==="
kubectl get volumeattachment

echo -e "\n=== CSI Driver Status ==="
kubectl get pods -n kube-system | grep csi

echo -e "\n=== Storage Classes ==="
kubectl get storageclass
```

## Wrapping Up

Volume mount failures on AKS fall into predictable categories once you know what to look for. Azure Disk issues usually involve multi-attach conflicts, zone mismatches, or API throttling. Azure Files issues typically come from network access rules, mount permissions, or protocol configuration. Always start with `kubectl describe pod` to get the exact error, check the CSI driver pod logs for details, and use `WaitForFirstConsumer` volume binding in zonal clusters. With these patterns and diagnostics in your toolkit, most storage issues can be resolved in minutes rather than hours.
