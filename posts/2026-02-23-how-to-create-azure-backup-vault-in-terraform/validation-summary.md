# Validation Summary: How to Create Azure Backup Vault in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Backup
- Azure Recovery Services Vault
- Azure Data Protection Backup Vault
- Azure VM Backup
- Azure Disk Backup
- Azure RBAC

## Sources Consulted
- HashiCorp AzureRM `azurerm_recovery_services_vault` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/recovery_services_vault
- HashiCorp AzureRM `azurerm_backup_policy_vm` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/backup_policy_vm
- HashiCorp AzureRM `azurerm_backup_protected_vm` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/backup_protected_vm
- HashiCorp AzureRM `azurerm_data_protection_backup_vault` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/data_protection_backup_vault
- HashiCorp AzureRM `azurerm_data_protection_backup_policy_disk` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/data_protection_backup_policy_disk
- HashiCorp AzureRM `azurerm_data_protection_backup_instance_disk` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/data_protection_backup_instance_disk
- Microsoft Learn, Azure Backup support matrix: https://learn.microsoft.com/en-us/azure/backup/backup-support-matrix
- Microsoft Learn, Overview of Backup vaults: https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview
- Microsoft Learn, Create and configure Recovery Services vaults: https://learn.microsoft.com/en-us/azure/backup/backup-create-recovery-services-vault
- Microsoft Learn, Overview of Azure Disk Backup: https://learn.microsoft.com/en-us/azure/backup/disk-backup-overview
- Microsoft Learn, Azure Disk Backup support matrix: https://learn.microsoft.com/en-us/azure/backup/disk-backup-support-matrix
- Microsoft Learn, Azure Kubernetes Service backup overview: https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-backup-overview

## Issues Found
- The provider version was pinned to AzureRM `~> 3.80`, which made the tutorial outdated for current AzureRM 4.x usage. Updated the constraint to `~> 4.72`.
- The Recovery Services Vault example used `soft_delete_enabled`, which is not part of the current AzureRM 4.x resource schema. Removed the argument and added a short note that soft delete is enabled by default for newly created Recovery Services Vaults.
- The managed disk protection example referenced `data.azurerm_managed_disk.os_disk` without defining it. Added the missing managed disk data source so the example is complete.
- The redundancy variable omitted `ZoneRedundant`, which is supported by the current Recovery Services Vault and Data Protection Backup Vault Terraform schemas. Updated the variable description, validation condition, and error message.
- The production redundancy guidance could imply that Backup Vault redundancy protects Azure Disk Backup snapshots. Added a clarification that Azure Disk Backup uses operational-tier snapshots that are not copied into Backup Vault storage, so the vault redundancy setting does not apply to those disk snapshots.

## Review Notes
The examples are illustrative and still require real resource names, permissions, provider registration, and existing Azure resources to apply successfully. The `azurerm_virtual_machine` data source is valid for the shown example, but newer deployments often use `azurerm_linux_virtual_machine` or `azurerm_windows_virtual_machine` resources instead.
