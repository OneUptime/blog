# Validation Summary: How to Create Azure Managed Disks in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Managed Disks
- Azure Virtual Machines
- Azure Snapshots
- Azure Key Vault
- Azure Disk Encryption Sets

## Sources Consulted
- Azure managed disk types: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Azure shared disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-shared-enable
- Azure Premium SSD v2 deployment and limitations: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-deploy-premium-v2
- Azure server-side encryption for managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Terraform AzureRM `azurerm_managed_disk` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_disk
- Terraform AzureRM `azurerm_snapshot` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/snapshot
- Terraform AzureRM `azurerm_virtual_machine_data_disk_attachment` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_data_disk_attachment
- Terraform AzureRM `azurerm_disk_encryption_set` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/disk_encryption_set
- Terraform AzureRM `azurerm_key_vault_key` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- Terraform AzureRM `azurerm_key_vault_access_policy` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy

## Issues Found
- The post said Azure offers four managed disk types, but Azure currently documents five: Ultra Disk, Premium SSD v2, Premium SSD, Standard SSD, and Standard HDD. Changed "four" to "five."
- The customer-managed key example referenced `data.azurerm_client_config.current` without defining it and did not grant the Terraform identity access to create the Key Vault key. Added the `azurerm_client_config` data source and a Key Vault access policy for the Terraform identity.
- The disk encryption set example granted Key Vault access permissions but omitted the Key Vault crypto role assignment shown in current AzureRM provider examples. Added an `azurerm_role_assignment` for `Key Vault Crypto Service Encryption User` and included it in the managed disk dependency list.
- The shared disk section claimed Premium SSDs of 256 GB or larger support up to 10 shares. Azure's shared disk limits vary by disk SKU; P30-P50 support up to 5 shares and P60-P80 support up to 10. Updated the statement accordingly.
- The Premium SSD v2 example said zone is required. Azure documents that Premium SSD v2 disks can be deployed in both availability-zone and non-availability-zone regions, with zonal requirements applying in regions that support availability zones. Updated the comment to be region-specific.

## Review Notes
The Terraform snippets use current AzureRM resource names and arguments. Some examples intentionally reference an existing VM resource (`azurerm_linux_virtual_machine.app`) that is outside the focused disk snippets, which is acceptable for this post's scope.
