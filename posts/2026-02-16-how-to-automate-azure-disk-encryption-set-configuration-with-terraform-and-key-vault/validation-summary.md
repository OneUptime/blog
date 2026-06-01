# Validation Summary: How to Automate Azure Disk Encryption Set Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Managed Disks
- Azure Disk Encryption Sets
- Azure Key Vault
- Azure RBAC
- Terraform
- HashiCorp AzureRM provider

## Sources Consulted
- Microsoft Learn: Server-side encryption of Azure managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Microsoft Learn: Enable customer-managed keys with server-side encryption for managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-enable-customer-managed-keys-portal
- Microsoft Learn: Azure CLI customer-managed keys for managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-enable-customer-managed-keys-cli
- Microsoft Learn: Configure cryptographic key auto-rotation in Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation
- Microsoft Learn: Azure Key Vault key types, algorithms, and operations - https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys-details
- Terraform Registry: azurerm_disk_encryption_set resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/disk_encryption_set
- Terraform Registry: azurerm_key_vault_key resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- Terraform Registry: azurerm_key_vault resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- Terraform Registry: azurerm_linux_virtual_machine resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine

## Issues Found
- The Disk Encryption Set used `azurerm_key_vault_key.disk_encryption.id` while also setting `auto_key_rotation_enabled = true`. Terraform's `azurerm_disk_encryption_set` documentation requires `key_vault_key_id` to use the key's `versionless_id` when automatic key rotation is enabled. Changed the reference to `azurerm_key_vault_key.disk_encryption.versionless_id`.
- The rotation-policy explanation said Disk Encryption Sets automatically pick up new key versions without qualifying that behavior. Updated the wording to tie automatic pickup to the DES auto key rotation setting shown later in the post.

## Review Notes
Terraform is not installed in the local workspace, so I could not run `terraform validate`. The HCL was reviewed against the AzureRM provider documentation instead. The pinned AzureRM `~> 3.80` provider is older than the current major version but remains a valid 3.x constraint for the attributes used in the post. In real deployments, Azure RBAC propagation after role assignment can occasionally require a retry before Key Vault key creation or disk encryption use succeeds.
