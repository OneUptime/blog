# Validation Summary: How to Assign Azure RBAC Roles with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure RBAC
- Azure Resource Manager / AzureRM provider
- Microsoft Entra ID
- Azure Key Vault
- Azure Storage
- HCL

## Sources Consulted
- Azure role assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Steps to assign an Azure role: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps
- Grant permission to applications to access an Azure key vault using Azure RBAC: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Authorize access to blob data using Microsoft Entra ID: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-access-azure-active-directory
- Assign an Azure role for access to blob data: https://learn.microsoft.com/en-gb/azure/storage/blobs/assign-azure-role-data-access
- AzureRM `azurerm_role_assignment` docs for v3.85.0: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/r/role_assignment.html.markdown
- AzureRM `azurerm_role_definition` data source docs for v3.85.0: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/d/role_definition.html.markdown
- AzureRM `azurerm_key_vault` docs for v3.85.0: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/r/key_vault.html.markdown
- AzureRM provider source for the `azurerm_role_definition` data source schema: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/internal/services/authorization/role_definition_data_source.go
- OpenTofu `plan` command reference: https://opentofu.org/docs/cli/commands/plan/
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide

## Issues Found
- The `roles_by_id.tf` example used `data.azurerm_role_definition.storage_contributor.role_definition_resource_id`, but that attribute is not documented for the `azurerm_role_definition` data source. I changed it to `data.azurerm_role_definition.storage_contributor.id`, which is the scoped role definition ID accepted by `azurerm_role_assignment.role_definition_id`.
- The Key Vault example implied that assigning `Key Vault Secrets User` at vault scope is sufficient on its own. I added a note that the Key Vault must use the RBAC permission model, which in AzureRM v3 is enabled with `enable_rbac_authorization = true`.
- Several references still used the older "Azure AD" name. I updated them to "Microsoft Entra ID" to match current Azure identity terminology.
- The best-practices note overstated what `tofu plan` can detect. I updated it to describe drift detection for role assignments already managed by OpenTofu, rather than arbitrary unmanaged manual additions.

## Review Notes
- The post pins `hashicorp/azurerm` to `~> 3.85`, and the examples were validated against AzureRM v3.85 documentation.
- AzureRM v4+ exists and introduces breaking changes, including a mandatory `subscription_id` in provider configuration, so readers should not upgrade the provider constraint without reviewing the v4 upgrade guide.
- For Key Vault specifically, AzureRM v4+ renamed the RBAC flag from `enable_rbac_authorization` to `rbac_authorization_enabled`.
