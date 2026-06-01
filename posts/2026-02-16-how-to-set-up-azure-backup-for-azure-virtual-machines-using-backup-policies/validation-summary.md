# Validation Summary: How to Set Up Azure Backup for Azure Virtual Machines Using Backup Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Azure Virtual Machines
- Recovery Services vaults
- Azure Backup policies
- Azure CLI
- VM snapshots and recovery points

## Sources Consulted
- Microsoft Learn: About Azure VM backup - https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-introduction
- Microsoft Learn: Azure Backup architecture - https://learn.microsoft.com/en-us/azure/backup/backup-architecture
- Microsoft Learn: Azure Instant Restore capability - https://learn.microsoft.com/en-us/azure/backup/backup-instant-restore-capability
- Microsoft Learn: Back up Azure VMs in a Recovery Services vault - https://learn.microsoft.com/en-gb/azure/backup/backup-azure-arm-vms-prepare
- Microsoft Learn: Azure Backup support matrix - https://learn.microsoft.com/azure/backup/backup-support-matrix
- Microsoft Learn: Support matrix for Azure VM backups - https://learn.microsoft.com/en-us/azure/backup/backup-support-matrix-iaas
- Microsoft Learn: FAQ - Backing up Azure VMs - https://learn.microsoft.com/en-us/azure/backup/backup-azure-vm-backup-faq
- Microsoft Learn: Azure CLI `az backup policy` reference - https://learn.microsoft.com/en-us/cli/azure/backup/policy
- Microsoft Learn: Azure CLI `az backup protection` reference - https://learn.microsoft.com/en-us/cli/azure/backup/protection
- Microsoft Learn: Azure CLI `az backup recoverypoint` reference - https://learn.microsoft.com/en-us/cli/azure/backup/recoverypoint
- Microsoft Learn: Azure CLI `az backup job` reference - https://learn.microsoft.com/en-us/cli/azure/backup/job

## Issues Found
- Corrected the explanation of snapshot consistency. The post said Azure Backup takes application-consistent snapshots for VMs generally. Azure documentation states Windows VMs can use VSS for application consistency, Linux VMs are file-system consistent by default unless pre/post scripts are configured, and shut down or offline VMs receive crash-consistent recovery points.
- Corrected snapshot-tier retention. The post listed Instant Restore retention as 1-5 days for all policies. Standard policies support 1-5 days, while Enhanced policies support up to 1-30 days, with limits depending on backup frequency.
- Corrected Enhanced policy hourly schedule options. The post omitted the 24-hour option.
- Corrected the Azure CLI policy JSON example by wrapping the policy definition in `properties` and including `backupManagementType`, matching the policy object shape used by Azure Backup policy APIs and CLI examples.
- Corrected the `az backup protection backup-now` example by adding `--backup-management-type AzureIaasVM` and changing `--retain-until` to the documented UTC `d-m-Y` date format.
- Corrected the recovery point listing example by adding `--backup-management-type AzureIaasVM`, which is required when container names are interpreted as friendly names and is recommended by the CLI examples for Azure VM backup items.
- Corrected the alert label from "Delete protection data" to "Delete backup data".

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn CLI references instead of local `az --help` output. The policy JSON shape can vary depending on whether it is copied from `az backup policy show` output or authored directly; for production use, Microsoft recommends starting from an existing/default policy object and modifying it.
