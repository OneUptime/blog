# Validation Summary: How to Configure Azure File Share Premium Tier for Low-Latency Workloads

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Files
- Azure Storage accounts
- Azure CLI
- SMB / CIFS
- Azure Private Endpoint and Private DNS
- Azure Monitor metrics and alerts
- Windows PowerShell
- Linux mount configuration

## Sources Consulted
- Azure Files scalability and performance targets: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-scale-targets
- Understand Azure Files billing: https://learn.microsoft.com/en-us/azure/storage/files/understanding-billing
- Create an Azure classic file share: https://learn.microsoft.com/en-us/azure/storage/files/create-classic-file-share
- Create an Azure storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure CLI `az storage share-rm`: https://learn.microsoft.com/en-us/cli/azure/storage/share-rm
- Azure CLI `az storage account file-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/file-service-properties
- SMB file shares in Azure Files: https://learn.microsoft.com/en-us/azure/storage/files/files-smb-protocol
- Mount SMB Azure file shares on Linux: https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux
- Mount SMB Azure file shares on Windows: https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-windows
- Azure Files metrics with Azure Monitor: https://learn.microsoft.com/en-us/azure/storage/files/analyze-files-metrics
- Supported metrics for Microsoft.Storage/storageAccounts/fileServices: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-fileservices-metrics
- Optimize costs with Azure Files Reservations: https://learn.microsoft.com/en-us/azure/storage/files/files-reserve-capacity

## Issues Found
- The comparison table understated premium limits and gave an outdated fixed standard throughput value. Updated premium limits to 102,400 IOPS and 10,340 MiB/s, and changed standard throughput to "up to storage account limits."
- The comparison table listed NFS for standard Azure Files. Removed NFS from the standard protocol list because NFS support is for SSD file shares, not HDD standard shares.
- The premium provisioned v1 IOPS, burst IOPS, and throughput formulas were incorrect. Replaced them with Microsoft's current provisioned v1 formulas and corrected the 100 GiB, 1 TiB, and 4 TiB examples.
- The Linux credentials file example wrote into `/etc/smbcredentials` without creating the directory. Added `sudo mkdir -p /etc/smbcredentials`.
- The SMB encryption example used `az storage share-rm update --enabled-protocols SMB`, which does not enable SMB encryption in transit. Replaced it with `az storage account file-service-properties update --require-smb-encryption-in-transit --smb-eit true`.
- The snapshot cost note said premium snapshots consume provisioned space. For provisioned v1 premium shares, snapshots are billed as used snapshot storage, so the wording was corrected.
- The reserved capacity note included a hard-coded savings range that current Microsoft documentation does not state as a general guarantee. Reworded it to say reservations can reduce storage costs.

## Review Notes
The post uses the provisioned v1 premium model (`Premium_LRS` / `Premium_ZRS`), which remains supported. Microsoft currently recommends provisioned v2 for new Azure Files deployments in most regions, but switching this tutorial to provisioned v2 would require a broader rewrite because v2 provisions storage, IOPS, and throughput independently.
