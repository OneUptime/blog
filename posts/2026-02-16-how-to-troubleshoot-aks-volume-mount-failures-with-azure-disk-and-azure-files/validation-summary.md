# Validation Summary: How to Troubleshoot AKS Volume Mount Failures with Azure Disk and Azure Files

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, and VolumeAttachments
- Azure Disk CSI driver
- Azure Files CSI driver
- Azure CLI
- SMB and NFS storage mounts

## Sources Consulted
- Microsoft Learn: Use Container Storage Interface (CSI) drivers on Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- Microsoft Learn: Create and manage persistent volumes with Azure Disks in AKS - https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Microsoft Learn: Create and manage persistent volumes with Azure Files in AKS - https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-files
- Microsoft Learn: Concepts - Storage in Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/concepts-storage
- Microsoft Learn: Azure CLI az aks reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI az storage account reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure managed disk types and sizes - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Kubernetes documentation: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes documentation: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- Clarified Azure Disk ReadWriteOnce semantics. The original wording implied a strict single-pod model; Kubernetes ReadWriteOnce means the volume can be mounted read-write by a single node, and multiple pods on that node may use it.
- Corrected the long-term fix for multi-node storage. The original recommended `maxShares` for workloads that need multi-node access, which is too broad. Azure shared disks require applications that safely coordinate shared block storage; Azure Files is the general ReadWriteMany file-system option.
- Removed the unsupported advice to increase disk attach timeout in the storage class. The official Azure Disk CSI storage class parameters do not document an attach-timeout setting. The fix now recommends retries and staggering attachment-heavy rollouts.
- Corrected the Azure Files NFS guidance. The original described NFS as required for large file workloads and used `--enable-large-file-share`; the corrected version describes NFS as a POSIX/Linux workload option, uses a premium FileStorage account with secure transfer disabled, adds AKS subnet network access, and aligns the NFS storage class with documented CSI parameters and mount options.

## Review Notes
The remaining examples are representative troubleshooting snippets and assume the reader substitutes real resource group, cluster, account, pod, PV, and PVC names. Azure Files managed identity and workload identity support is evolving and currently has preview caveats in the official AKS documentation; this post continues to use key-based/static examples where relevant.
