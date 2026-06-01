# Validation Summary: How to Enable Large File Share Support in Azure Storage Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Azure Files
- Azure large file shares
- Azure CLI
- Azure Monitor metrics alerts
- Azure File Sync
- AzCopy
- Azure Backup
- SMB/CIFS mounting on Windows and Linux

## Sources Consulted
- Microsoft Learn: Azure Files scalability and performance targets - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-scale-targets
- Microsoft Learn: Increase Azure file share quota - https://learn.microsoft.com/en-us/azure/storage/files/modify-file-share
- Microsoft Learn: Azure CLI `az storage account` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI `az storage share-rm` reference - https://learn.microsoft.com/en-us/cli/azure/storage/share-rm
- Microsoft Learn: Azure Files monitoring data reference - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-monitoring-reference
- Microsoft Learn: Azure CLI `az monitor metrics alert create` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI `az storagesync sync-group` reference - https://learn.microsoft.com/en-us/cli/azure/storagesync/sync-group
- Microsoft Learn: Back up Azure file shares with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-afs-cli
- Microsoft Learn: AzCopy sync reference - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-sync
- Microsoft Learn: Mount Azure file shares on Windows - https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-windows
- Microsoft Learn: Mount Azure file shares on Linux - https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux

## Issues Found
- The post stated that Azure standard file shares default to a 5 TiB maximum. Current Azure Files documentation says current pay-as-you-go file shares can grow to 100 TiB, while older accounts might still have the legacy 5 TiB limit. Updated the introduction and closing language to scope the enablement guidance to legacy accounts.
- The throughput table listed fixed 300 MiB/s ingress and egress limits for large file shares. Current Azure Files scale documentation describes throughput against storage account and file share scale targets rather than that fixed split. Replaced the fixed ingress/egress rows with a single "up to the storage account limits" row.
- The geo-redundancy limitation was described as applying to all large file shares. Current documentation supports 100 TiB pay-as-you-go file shares more broadly, while the Azure CLI `--enable-large-file-share` path remains limited to LRS/ZRS. Updated the redundancy language to apply specifically to accounts that still require the legacy `largeFileSharesState` setting.
- The share usage example queried `shareUsageBytes` without requesting stats. Added `--expand stats` to the `az storage share-rm show` example so usage data is returned.
- The comment for listing all shares said it listed usage, but the listed command does not retrieve per-share usage. Changed the comment to say it lists quotas.
- The Azure Monitor alert example used `FileShareCapacityQuotaUtilization`, which is not the current Azure Files metric name. Updated it to `PercentFileShareUtilization`.

## Review Notes
Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn CLI reference pages instead of local `az --help` output. The examples use placeholder storage account names and resource IDs; they remain syntactically representative but require existing Azure resources, authentication, and appropriate permissions to run.
