# Validation Summary: How to Back Up Azure File Shares Using Azure Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Azure Files
- Azure File Shares
- Recovery Services vaults
- Azure CLI
- Azure Monitor metric alerts

## Sources Consulted
- Microsoft Learn: Back up Azure Files - https://learn.microsoft.com/en-us/azure/backup/backup-azure-files
- Microsoft Learn: Back up Azure Files with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-afs-cli
- Microsoft Learn: Manage Azure Files backups with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/manage-afs-backup-cli
- Microsoft Learn: Restore Azure Files with Azure CLI - https://learn.microsoft.com/en-us/azure/backup/restore-afs-cli
- Microsoft Learn: Support matrix for Azure Files backup - https://learn.microsoft.com/en-us/azure/backup/azure-file-share-support-matrix
- Microsoft Learn: Protect Azure Files from accidental deletion using Azure Backup - https://learn.microsoft.com/en-us/azure/backup/soft-delete-azure-file-share
- Microsoft Learn: Azure CLI reference for az backup policy - https://learn.microsoft.com/en-us/cli/azure/backup/policy
- Microsoft Learn: Azure CLI reference for az backup protection - https://learn.microsoft.com/en-us/cli/azure/backup/protection
- Microsoft Learn: Supported metrics for Microsoft.RecoveryServices/Vaults - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-recoveryservices-vaults-metrics

## Issues Found
- The post described Azure Files backup as only snapshot-based and stated that Azure Backup does not copy file share backup data to a vault. Updated the explanation to distinguish Snapshot tier from Vault-Standard tier, which can transfer backup data to the Recovery Services vault.
- The prerequisites were incomplete. Added the current same-subscription requirement, the SMB rather than NFS limitation, and the storage account access requirement for account keys or disabled public network access.
- The Azure CLI policy creation example was missing `--workload-type AzureFileShare` and the policy JSON shape used by current Microsoft examples. Updated the command and JSON to include `properties`, `backupManagementType`, `workloadType`, `timeZone`, and the expected retention-policy structure.
- The on-demand backup example used an ISO date for `--retain-until`; Microsoft CLI docs specify `dd-mm-yyyy`. Changed it to `16-03-2026`.
- Several backup item and restore examples used a lowercase `storage` segment in the container name and mixed-case restore enum values. Updated examples to match Microsoft Learn CLI examples.
- The restore section implied all restore modes apply equally to all tiers. Added the current Vault-Standard limitation that it supports full-share restore to an alternate location, while the item-level and original-location examples apply to Snapshot-tier backups.
- The cost section said there is no vault storage cost. Updated it to clarify this is true for Snapshot-tier protection only; Vault-Standard backup data copied to the vault is billed separately.
- The disaster-recovery recommendation only mentioned GRS or manual copies. Updated it to include Vault-Standard with cross-region restore where supported.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI documentation rather than local `az --help` output. The embedded backup policy JSON was parsed successfully as JSON after edits.
