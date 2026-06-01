# Validation Summary: How to Back Up Azure File Shares Using Azure Backup and Recovery Services Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Azure Files
- Azure File Share snapshots
- Recovery Services vault
- Azure CLI

## Sources Consulted
- Microsoft Learn: Back up Azure Files in the Azure portal - https://learn.microsoft.com/en-us/azure/backup/backup-azure-files
- Microsoft Learn: Back up Azure Files with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-afs-cli
- Microsoft Learn: Manage Azure Files backups with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/manage-afs-backup-cli
- Microsoft Learn: Restore Azure Files with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/restore-afs-cli
- Microsoft Learn: Support matrix for Azure Files backup - https://learn.microsoft.com/en-us/azure/backup/azure-file-share-support-matrix
- Microsoft Learn: Use Azure Files share snapshots - https://learn.microsoft.com/en-us/azure/storage/files/storage-snapshots-files
- Microsoft Learn: Troubleshoot problems while backing up Azure Files - https://learn.microsoft.com/en-us/azure/backup/troubleshoot-azure-files
- Microsoft Learn: Azure CLI `az backup policy` reference - https://learn.microsoft.com/en-us/cli/azure/backup/policy?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az backup restore` reference - https://learn.microsoft.com/en-us/cli/azure/backup/restore?view=azure-cli-latest

## Issues Found
- The post described Azure Files backup as only snapshot-based and said there was no vault transfer for the "standard tier." Updated the explanation to distinguish snapshot-tier backup from Vault-Standard backup, where the last scheduled snapshot of the day is transferred to the Recovery Services vault.
- The prerequisite list did not mention current tier-specific storage account support, NFS limitations, or the requirement for storage account key access. Added these prerequisites based on the Azure Files backup support matrix.
- The Azure CLI policy creation example omitted `--workload-type AzureFileShare` and used a policy JSON shape that did not match Microsoft Learn examples. Updated the command and wrapped the schedule and retention settings under `properties`.
- The on-demand backup example used `--retain-until` in ISO date format. Changed it to the documented `dd-mm-yyyy` format.
- The recovery point listing example omitted `--backup-management-type` and `--workload-type`, which Microsoft Learn includes for Azure Files recovery point queries. Added both parameters.
- The alternate-location restore example used a resource ID for `--target-storage-account`, used inconsistent casing for `--restore-mode` and `--resolve-conflict`, and used `/` for the root target folder. Updated it to use the target storage account name, documented lowercase values, and an empty string for the root folder.
- The troubleshooting section said delete locks could cause backup failures. Updated it to identify read-only locks as the problematic lock type and recommend removing the read-only lock or using a delete lock instead.
- The conclusion described restores as nearly instant. Updated this to a more accurate snapshot-tier restore statement.

## Review Notes
Azure CLI is not installed in this workspace, so command validation was performed against current Microsoft Learn CLI and Azure Backup documentation instead of local `az --help` output.
