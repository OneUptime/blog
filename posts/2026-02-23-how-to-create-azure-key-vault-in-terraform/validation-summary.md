# Validation Summary: How to Create Azure Key Vault in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Key Vault
- Azure RBAC
- Azure Key Vault access policies
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_key_vault - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- HashiCorp Terraform Registry: azurerm_key_vault_access_policy - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy
- HashiCorp Terraform Registry: azurerm_key_vault_key - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- Microsoft Learn: Azure Key Vault RBAC vs access policies - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy
- Microsoft Learn: Assign an Azure Key Vault access policy - https://learn.microsoft.com/en-us/azure/key-vault/general/assign-access-policy
- Microsoft Learn: Configure network security for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/how-to-azure-key-vault-network-security
- Microsoft Learn: About Azure Key Vault keys - https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys
- Microsoft Learn: Set up Key Vault for Azure virtual machines - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/key-vault-setup
- Microsoft Learn: Quickstart to create an Azure key vault and key using Terraform - https://learn.microsoft.com/en-us/azure/key-vault/keys/quick-create-terraform

## Issues Found
- The introduction said Azure Key Vault provides HSM-backed storage generally. Updated it to clarify that Premium vaults support HSM-protected keys, while all vaults provide access control and audit logging.
- The Key Vault SKU comment described the whole Premium vault as HSM-backed. Updated the comment to say Premium supports HSM-protected keys.
- The access-policy examples mixed an inline `access_policy` block on `azurerm_key_vault` with separate `azurerm_key_vault_access_policy` resources. HashiCorp documents that these two methods conflict when used together for the same vault. Moved the Terraform service principal policy into a separate `azurerm_key_vault_access_policy` resource so all policies use one management style.
- The admin key permissions omitted `GetRotationPolicy` and `SetRotationPolicy`, which HashiCorp documents as required for managing `azurerm_key_vault_key` resources with rotation policies. Added those permissions, along with `Rotate`.
- Moving the admin access policy to a separate resource meant key and certificate creation could race ahead of the policy. Added `depends_on = [azurerm_key_vault_access_policy.terraform]` to the key and certificate resources.
- The comment for `enabled_for_deployment` incorrectly described Azure Deployment Scripts. Updated it to match the documented behavior: allowing Azure VMs to retrieve certificates stored as secrets.
- The network ACL example used `203.0.113.0/24` as an office IP range. Replaced it with `var.office_ip_ranges` and clarified that Key Vault firewall IP rules should be public IPv4 CIDR ranges.

## Review Notes
The snippets remain illustrative and reference variables such as `var.web_app_object_id`, `var.worker_object_id`, `var.pipeline_object_id`, `var.office_ip_ranges`, and `var.app_subnet_id` that would need definitions in a complete Terraform module. I did not run `terraform plan` because the post is a set of snippets and requires Azure credentials, subscription context, and caller-specific variable values.
