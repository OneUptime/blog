# Validation Summary: How to Manage Azure RBAC Role Assignments at Scale with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure RBAC
- Azure role assignments and custom role definitions
- Azure Key Vault RBAC permissions
- Azure CLI
- Microsoft Entra ID

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_role_assignment` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- HashiCorp Terraform Registry: `azurerm_role_definition` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition
- HashiCorp Terraform Registry: `azurerm_role_assignments` data source, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/role_assignments
- Microsoft Learn: Azure custom roles, https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Microsoft Learn: Azure permissions for Security / Key Vault operations, https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/security
- Microsoft Learn: Azure built-in roles, https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Grant permission to applications to access an Azure key vault using Azure RBAC, https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure CLI `az role assignment`, https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure CLI `az ad group`, https://learn.microsoft.com/en-us/cli/azure/ad/group

## Issues Found
- The basic role assignment example referred to an "Azure AD group object ID". Updated this to "Microsoft Entra group object ID" to match current Microsoft terminology while preserving the valid `az ad` CLI command.
- The text below the basic example also referred to "Azure AD groups". Updated it to "Microsoft Entra groups".
- The VM custom role example described `not_actions` as explicitly denying VM create and delete operations. Azure RBAC `NotActions` are exclusions from allowed actions, not deny rules. Updated the snippet to use an empty `not_actions` list and clarified that create/delete are omitted from `actions`.
- The Key Vault metadata custom role used the invalid data action `Microsoft.KeyVault/vaults/secrets/getmetadata/action`. Updated it to the documented `Microsoft.KeyVault/vaults/secrets/readMetadata/action`.
- The same Key Vault role then placed `Microsoft.KeyVault/vaults/secrets/readMetadata/action` in `not_data_actions`, which would exclude the metadata access the role claimed to grant. Updated `not_data_actions` to an empty list.
- The common issues section referred to an `azurerm_role_assignment` data source. The current AzureRM data source for listing/checking role assignments is `azurerm_role_assignments`, so the text was corrected.

## Review Notes
Terraform and Azure CLI were not installed in the local environment, so validation was performed against official HashiCorp and Microsoft documentation rather than by running `terraform validate` or live Azure CLI commands.
