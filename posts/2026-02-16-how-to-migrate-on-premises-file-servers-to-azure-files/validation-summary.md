# Validation Summary: How to Migrate On-Premises File Servers to Azure Files

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Files
- Azure File Sync
- Azure Storage accounts and file shares
- Azure CLI
- Azure PowerShell / Az.StorageSync
- Windows Server SMB file shares
- Active Directory Domain Services authentication for Azure Files
- Robocopy
- AzCopy
- Azure Data Box
- Azure Backup
- DNS and Group Policy drive mapping

## Sources Consulted
- Microsoft Learn: Azure Files scalability and performance targets - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-scale-targets
- Microsoft Learn: Deploy Azure File Sync - https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-deployment-guide
- Microsoft Learn: Plan for an Azure File Sync deployment - https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-planning
- Microsoft Download Center: Azure File Sync Agent - https://www.microsoft.com/en-us/download/details.aspx?id=57159
- Microsoft Learn: Az.StorageSync PowerShell module - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/
- Microsoft Learn: New-AzStorageSyncGroup - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/new-azstoragesyncgroup
- Microsoft Learn: New-AzStorageSyncCloudEndpoint - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/new-azstoragesynccloudendpoint
- Microsoft Learn: New-AzStorageSyncServerEndpoint - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/new-azstoragesyncserverendpoint
- Microsoft Learn: Register-AzStorageSyncServer - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/register-azstoragesyncserver
- Microsoft Learn: Enable AD DS authentication for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-ad-ds-enable
- Microsoft Learn: Overview of on-premises AD DS authentication over SMB for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-ad-ds-overview
- Microsoft Learn: Azure CLI storage account reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI storage share-rm reference - https://learn.microsoft.com/en-us/cli/azure/storage/share-rm
- Microsoft Learn: Create an Azure file share - https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-portal
- Microsoft Learn: Use RoboCopy to migrate to Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-migration-robocopy
- Microsoft Learn: Copy files between Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/migrate-files-between-shares
- Microsoft Learn: Transfer data with AzCopy and Azure Files - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-files
- Microsoft Learn: Preserving file ACLs, attributes, and timestamps with Azure Data Box Disk - https://learn.microsoft.com/en-us/azure/databox/data-box-disk-file-acls-preservation
- Microsoft Learn: Mount SMB Azure file share on Windows - https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-windows
- Microsoft Learn: Back up Azure Files with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-afs-cli

## Issues Found
- Corrected the AzCopy migration description. The post said AzCopy does not preserve NTFS permissions; current AzCopy supports preserving SMB ACLs and file metadata for supported Azure Files SMB transfers when `--preserve-permissions=true` and `--preserve-info=true` are used.
- Corrected the Azure Data Box description. The post said Data Box does not preserve NTFS ACLs; Microsoft documentation states ACLs, timestamps, and attributes can be preserved when copying to Data Box over SMB for Azure Files, while Blob Storage and NFS paths do not preserve the same metadata.
- Added the missing share-level RBAC requirement for Azure Files AD DS authentication. NTFS ACLs alone are not enough; users also need share-level permissions.
- Fixed the Azure File Sync PowerShell example. The original snippet used `Login-AzStorageSync`, omitted required endpoint names, used undefined `$storageId` and `$serverId` variables, and did not retrieve the registered server or storage account resource IDs. The updated example uses `Connect-AzAccount`, `Set-AzContext`, `Register-AzStorageSyncServer`, `Get-AzStorageAccount`, and required `-Name` parameters.
- Clarified the Azure File Sync agent install example. The previous snippet always downloaded the Windows Server 2022 MSI even though the article discusses multiple supported Windows Server versions.
- Updated the Robocopy examples to include `/DCOPY:DAT`, `/B`, and `/IT`, matching Microsoft migration guidance for preserving directory metadata and improving migration fidelity.
- Corrected the DNS cutover guidance. Azure Files custom names require the storage account name as the host prefix and an SMB SPN for the custom name; an arbitrary legacy server name such as `fileserver.contoso.com` cannot simply be CNAMEd to the Azure Files endpoint for SMB access. The post now points readers to DFS Namespaces or GPO/script updates for keeping or changing legacy paths.

## Review Notes
The post is technically relevant and contains implementation details. The remaining examples still use placeholder values and intentionally omit full production hardening, such as private endpoints, firewall planning for SMB port 445, complete AzFilesHybrid setup, and backup policy creation before enabling Azure Backup.
