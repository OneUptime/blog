# Validation Summary: How to Set Up Azure File Sync to Synchronize On-Premises File Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure File Sync
- Azure Files
- Storage Sync Service
- Azure CLI
- Az PowerShell / Az.StorageSync
- Windows Server
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Deploy Azure File Sync - https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-deployment-guide
- Microsoft Learn: Plan for an Azure File Sync deployment - https://learn.microsoft.com/en-au/azure/storage/file-sync/file-sync-planning
- Microsoft Learn: Understand Azure File Sync cloud tiering - https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-cloud-tiering-overview
- Microsoft Learn: How to manage Azure File Sync tiered files - https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-how-to-manage-tiered-files
- Microsoft Learn: New-AzStorageSyncServerEndpoint - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/new-azstoragesyncserverendpoint
- Microsoft Learn: New-AzStorageSyncCloudEndpoint - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/new-azstoragesynccloudendpoint
- Microsoft Learn: Register-AzStorageSyncServer - https://learn.microsoft.com/en-us/powershell/module/az.storagesync/register-azstoragesyncserver
- Microsoft Learn: Azure File Sync monitoring data reference - https://learn.microsoft.com/en-us/azure/storage/file-sync/monitor-file-sync-reference
- Microsoft Learn: SMB Azure file shares - https://learn.microsoft.com/en-gb/azure/storage/files/files-smb-protocol

## Issues Found
- Updated prerequisites to reflect the currently supported Windows Server versions, the PowerShell/Az module requirement, the PowerShell 5.1 .NET dependency, and the requirement that the SMB Azure file share be in the same region as the Storage Sync Service.
- Replaced the outdated registration login flow with `Import-Module Az.StorageSync`, `Connect-AzAccount`, and `Set-AzContext`.
- Corrected `New-AzStorageSyncGroup` to use `-Name`, which is the documented parameter.
- Added the required `-Name` parameter to `New-AzStorageSyncCloudEndpoint`.
- Corrected the server endpoint example to include `-Name`, use the registered server `ResourceId`, and use `-CloudTiering` instead of the non-existent `-CloudTieringEnabled` switch.
- Tightened the tiered-file detection example to check both `ReparsePoint` and `Offline` attributes, matching Azure File Sync tiered-file behavior more closely than checking only for a reparse point.
- Added the required server cmdlets module import before `Invoke-StorageSyncFileRecall` examples and corrected the recall order option to `CloudTieringPolicy`.
- Corrected conflict-resolution wording to match Azure File Sync behavior: the most recently written file keeps the original name and the older version becomes a conflict file.
- Corrected the Azure Monitor metric name from `SyncSessionResult` to the documented REST metric name `ServerSyncSessionResult`.

## Review Notes
The Azure CLI and PowerShell tools were not installed in the local review environment, so command behavior was verified against Microsoft Learn references rather than local `--help` output. The monitoring alert example is technically valid for the documented success-session metric, but a production alert should usually include an explicit evaluation window and dimensions for the target sync group or server endpoint.
