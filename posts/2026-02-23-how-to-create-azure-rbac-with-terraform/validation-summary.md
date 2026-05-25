# Validation Summary: How to Create Azure RBAC with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp AzureAD provider
- Azure Role-Based Access Control
- Azure custom role definitions
- Azure service principals
- Azure Key Vault RBAC
- Azure Policy

## Sources Consulted
- HashiCorp Terraform Registry: AzureRM `azurerm_role_assignment` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- HashiCorp Terraform Registry: AzureRM `azurerm_role_definition` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition
- HashiCorp Terraform Registry: AzureRM `azurerm_policy_assignment` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_assignment
- HashiCorp Terraform Registry: AzureRM `azurerm_policy_definition` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_definition
- HashiCorp Terraform Registry: AzureRM `azurerm_key_vault` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- HashiCorp Terraform Registry: AzureAD `azuread_group` data source: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group
- HashiCorp Terraform Registry: AzureAD `azuread_application` and `azuread_service_principal` resources: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application and https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/service_principal
- Microsoft Learn: Azure RBAC overview and role assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/overview and https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Microsoft Learn: Azure deny assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments
- Microsoft Learn: Azure Key Vault RBAC guide and built-in roles: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure Policy deny effect: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deny

## Issues Found
- Updated provider version constraints from AzureRM `~> 3.0` and AzureAD `~> 2.0` to current major versions `~> 4.0` and `~> 3.0` so the setup uses current provider lines.
- Corrected the custom role's Key Vault secret read permissions. Reading secret values is a Key Vault data-plane permission, so the snippet now uses `Microsoft.KeyVault/vaults/secrets/readMetadata/action` and `Microsoft.KeyVault/vaults/secrets/getSecret/action` in `data_actions`, with vault resource read access in `actions`.
- Clarified that `Microsoft.Storage/storageAccounts/listKeys/action` is key listing, not a simple read-only permission.
- Added `principal_type = "ServicePrincipal"` and `skip_service_principal_aad_check = true` to role assignments for the newly created service principal to match AzureRM provider guidance and avoid replication-lag failures.
- Corrected the Deny Assignments section. Azure RBAC deny assignments cannot be created directly with Terraform; the example is now described as an Azure Policy deny effect, not as a Terraform-created RBAC deny assignment.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The reviewed snippets were checked against official provider and Microsoft documentation.
