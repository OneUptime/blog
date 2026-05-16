# Validation Summary: How to Set Up Azure File Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Azure Files (SMB and NFS)
- Azure File CSI Driver (`file.csi.azure.com`)
- Azure Storage Accounts (StorageV2, FileStorage kinds)
- Azure CLI (`az`)
- Helm
- kubectl
- CIFS / SMB mount options
- NFS mount options (nconnect, rsize, wsize)

## Sources Consulted
- Azure File CSI driver Helm chart README: https://github.com/kubernetes-sigs/azurefile-csi-driver/blob/master/charts/README.md
- Azure File CSI driver parameters documentation: https://github.com/kubernetes-sigs/azurefile-csi-driver/blob/master/docs/driver-parameters.md
- Azure File CSI driver deployment manifests (controller and node): https://github.com/kubernetes-sigs/azurefile-csi-driver/tree/master/deploy
- Microsoft Learn — Create an Azure file share: https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-create-file-share
- Microsoft Learn — Modify an Azure File Share (large file shares): https://learn.microsoft.com/en-us/azure/storage/files/modify-file-share
- Microsoft Learn — Recommended mountOptions for Azure Files on AKS: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/storage/mountoptions-settings-azure-files
- Microsoft Learn — Improve NFS Azure file share performance (nconnect, rsize, wsize): https://learn.microsoft.com/en-us/azure/storage/files/nfs-performance
- Microsoft Learn — Azure Files CSI persistent volumes on AKS: https://learn.microsoft.com/en-us/azure/aks/azure-csi-files-storage-provision
- Microsoft Learn — Azure Files SMB connectivity (port 445): https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/files/connectivity/files-troubleshoot-smb-connectivity

## Issues Found
No technical issues found.

All verified items:
- `az storage account create` flags (`--enable-large-file-share`, `--kind StorageV2`, `--kind FileStorage`, `--sku Standard_LRS`, `--sku Premium_LRS`) are correct.
- Large file share limit of 100 TiB vs default 5 TiB is correct.
- Helm chart repo URL, chart name, and `--set cloud=AzurePublicCloud` / `--set controller.replicas=2` values are correct.
- CSI driver name `file.csi.azure.com` and label selectors `app=csi-azurefile-controller` / `app=csi-azurefile-node` match the upstream deploy manifests.
- StorageClass parameters (`skuName`, `protocol: nfs`) and static PV `volumeAttributes` (`shareName`, `storageAccount`, `resourceGroup`) match the driver-parameters documentation.
- SMB mount options (`dir_mode`, `file_mode`, `uid`, `gid`, `mfsymlinks`, `cache=strict`, `nosharesock`) match Microsoft's recommended values.
- NFS mount options (`nconnect`, `rsize`, `wsize`) are documented in Azure Files NFS performance guidance; `nconnect` is valid up to 16.
- Secret keys `azurestorageaccountname` and `azurestorageaccountkey` are the exact keys the driver expects via `nodeStageSecretRef`.
- Network ports — SMB 445 and NFS 2049 — are correct.

## Review Notes
- Microsoft's NFS performance guidance generally recommends `nconnect=4` because gains plateau beyond that value on Azure Files. The post's example of `nconnect=8` in the performance-tuning section is still within the supported range (max 16) and not incorrect, but readers should benchmark before assuming higher values yield better throughput.
- The `--enable-large-file-share` flag on a Premium `FileStorage` account is harmless but redundant: Premium FileStorage already supports up to 100 TiB shares by default. The CLI accepts the flag without error.
- The reader pod uses `cat /shared/log.txt` in a loop; if it starts before the writer pod has created the file, the first few iterations will print a "No such file or directory" error. This is a benign race in a demo manifest and does not affect correctness of the storage setup being demonstrated.
