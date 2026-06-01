# Validation Summary: How to Configure Azure Files CSI Driver for ReadWriteMany Persistent Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Azure Files CSI driver
- Azure Files SMB and NFS shares
- Azure CLI
- kubectl

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes ReadWriteOncePod access mode documentation: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-access-mode-readwriteoncepod/
- Microsoft Learn, Use Azure Files for Azure Kubernetes Service workloads: https://learn.microsoft.com/en-us/azure/storage/files/azure-kubernetes-service-workloads
- Microsoft Learn, Create and manage Azure Files volumes in AKS: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-files
- Microsoft Learn, NFS file shares in Azure Files: https://learn.microsoft.com/en-us/azure/storage/files/files-nfs-protocol
- Microsoft Learn, Azure Files scale and performance targets: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-scale-targets
- Microsoft Learn, Azure CLI storage account reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn, Azure CLI storage share reference: https://learn.microsoft.com/en-us/cli/azure/storage/share

## Issues Found
- The post described ReadWriteOnce as allowing only one pod to mount a volume. Kubernetes defines ReadWriteOnce as read-write access by a single node, and multiple pods on that node can still access the volume. Updated the introduction and access-mode list to use the correct node-level wording.
- The access-mode section said Kubernetes defines three access modes. Current Kubernetes also includes ReadWriteOncePod, stable since Kubernetes 1.29. Added ReadWriteOncePod to the list.
- The post said Kubernetes rejects Azure Disk RWX claims. Updated this to state that the claim will not bind to an Azure Disk volume because the Azure Disk CSI driver supports ReadWriteOnce.
- The dynamic Azure Files StorageClass used `volumeBindingMode: WaitForFirstConsumer` with an explanation about creating the share in the same zone as the pod. Azure Files shares are not zonal in that way, and Microsoft examples use immediate provisioning for Azure Files. Changed the StorageClass to `volumeBindingMode: Immediate` and updated the comment.
- The StorageClass examples used `enableLargeFileShares: "true"` and the tuning section said shares are limited to 5 TiB without that flag. Current Azure Files documentation treats large file shares as a legacy setting, and current pay-as-you-go shares can grow up to 100 TiB. Removed the parameter from the examples and updated the guidance for older storage accounts.
- The static PV example used an arbitrary `volumeHandle`. Updated it to the documented unique value pattern based on resource group, storage account, and share name.
- The performance section included a specific 1 TiB Premium share IOPS and throughput example and described Standard performance as based on share size. Updated the text to match current Azure Files performance documentation: performance depends on the billing model, provisioned values, storage account limits, and per-file targets.

## Review Notes
All YAML examples were parsed successfully after the edits. I did not run the examples against a live AKS cluster, so cloud-side validation such as identity permissions, quota availability, and storage account network rules remains environment-dependent.
