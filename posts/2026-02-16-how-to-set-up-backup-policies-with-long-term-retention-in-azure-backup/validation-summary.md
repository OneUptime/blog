# Validation Summary: How to Set Up Backup Policies with Long-Term Retention in Azure Backup

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Backup
- Recovery Services vaults
- Azure CLI
- Azure PowerShell Az.RecoveryServices
- Azure VM backup policies
- SQL Server in Azure VM backup policies
- Vault-archive tier
- Azure Backup Reports / Azure Monitor Logs

## Sources Consulted
- Microsoft Learn: az backup policy CLI reference - https://learn.microsoft.com/en-us/cli/azure/backup/policy
- Microsoft Learn: az backup recoverypoint CLI reference - https://learn.microsoft.com/en-us/cli/azure/backup/recoverypoint
- Microsoft Learn: az backup vault CLI reference - https://learn.microsoft.com/en-us/cli/azure/backup/vault
- Microsoft Learn: az backup vault backup-properties CLI reference - https://learn.microsoft.com/en-us/cli/azure/backup/vault/backup-properties
- Microsoft Learn: Update an existing VM backup policy using Azure CLI - https://learn.microsoft.com/azure/backup/modify-vm-policy-cli
- Microsoft Learn: Back up SQL databases in Azure VM using Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-backup-cli
- Microsoft Learn: Manage SQL databases in an Azure VM using Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-manage-cli
- Microsoft Learn: New-AzRecoveryServicesBackupProtectionPolicy - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/new-azrecoveryservicesbackupprotectionpolicy
- Microsoft Learn: Azure Backup archive tier overview - https://learn.microsoft.com/azure/backup/archive-tier-support
- Microsoft Learn: FAQ - Backing up Azure VMs - https://learn.microsoft.com/en-us/azure/backup/backup-azure-vm-backup-faq
- HHS: Summary of the HIPAA Privacy Rule - https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html
- HHS: HIPAA medical records retention FAQ - https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- PCAOB: AS 1215 Audit Documentation - https://pcaobus.org/oversight/standards/auditing-standards/details/AS1215
- PCI Security Standards Council: PCI DSS Quick Reference Guide - https://www.pcisecuritystandards.org/documents/PCI_DSS-QRG-v3_2_1.pdf

## Issues Found
- The HIPAA example incorrectly stated that HIPAA itself requires retaining medical records for 6 years. Updated it to say HIPAA requires retention of required compliance documentation for 6 years, while medical-record retention is governed by other federal or state requirements.
- The Azure VM `az backup policy create` JSON omitted the `properties` envelope and policy metadata fields shown in Azure CLI policy output. Added the `properties` wrapper, `backupManagementType`, `protectedItemsCount`, and `scheduleWeeklyFrequency`.
- The PowerShell example used `New-AzRecoveryServicesBackupRetentionPolicyObject`, which is not an Az.RecoveryServices cmdlet. Replaced it with the documented `Get-AzRecoveryServicesBackupSchedulePolicyObject`, `Get-AzRecoveryServicesBackupRetentionPolicyObject`, and `New-AzRecoveryServicesBackupProtectionPolicy` flow.
- The archive-tier eligibility guidance was too broad. Updated it to reflect current Azure Backup archive criteria for Azure VMs and SQL/SAP HANA workloads, including monthly/yearly-only support for Azure VM archive recovery points, minimum age in Vault-Standard, and remaining-retention requirements.
- The recovery point move command used `--rp-name`, but the current Azure CLI parameter is `--name`. Replaced the flag and added `--backup-management-type AzureIaasVM` to the archive examples.
- The SQL Server policy JSON omitted the `properties` envelope, workload metadata, compression metadata, `protectedItemsCount`, and `scheduleWeeklyFrequency` fields shown in the official SQL policy examples. Added those fields.
- The cost section claimed archive tier could reduce costs by up to 50% and recommended using it aggressively. Updated this to note that savings depend on workload and churn, and that Azure VM archive recommendations should be considered.
- The cost-management command queried `properties.storageModelType`, which is not the current documented vault shape. Updated the query to show redundancy and storage type fields from the vault properties.
- The incremental-backup cost statement was overly broad. Scoped it to Azure VM backups, where Azure Backup recovery points are incremental.

## Review Notes
The Azure CLI and PowerShell examples are still illustrative and use placeholder resource names, vault names, VM container names, and recovery point IDs. The Azure CLI was not installed in the local environment, and PowerShell was not installed, so command execution could not be tested locally; validation was performed against current Microsoft Learn command references and examples.
