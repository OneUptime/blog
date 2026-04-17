# Validation Summary: How to Implement Zero Trust Network with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Azure (azurerm provider)
- Azure AD (azuread provider)
- Azure AD Conditional Access
- Azure Private Endpoints / Private Link
- Azure Key Vault
- Azure Role-Based Access Control (RBAC)
- Azure Privileged Identity Management (PIM)
- Azure Network Security Groups (NSG)
- Microsoft Defender for Cloud (Azure Security Center)

## Sources Consulted
- Terraform AzureAD provider docs: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/conditional_access_policy
- Terraform AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- Terraform AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_subscription_pricing
- Terraform AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition
- Terraform AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- AzureRM provider v4.0 upgrade guide (argument renames)

## Issues Found
- **`azurerm_key_vault.enable_rbac_authorization`**: The argument was renamed to `rbac_authorization_enabled` in azurerm provider v4.0. Updated the Key Vault block to use `rbac_authorization_enabled` so the snippet works with current provider versions.

## Review Notes
- Conditional access policy values (`client_app_types`, `sign_in_risk_levels`, `built_in_controls`, `included_users`, `included_applications`, `included_locations`) all match the valid enums in the azuread provider.
- The `sign_in_risk_levels` based policy requires Azure AD Premium P2 licensing; this is a licensing, not syntax, concern and was not flagged as an error.
- `azurerm_role_definition.scope` is the correct required argument; `assignable_scopes` defaults to `scope` if omitted.
- `azurerm_security_center_subscription_pricing` resource_type values used (`VirtualMachines`, `SqlServers`, `AppServices`, `StorageAccounts`, `Containers`, `KeyVaults`, `Arm`, `Dns`, `OpenSourceRelationalDatabases`) are all valid and current.
- Private endpoint `subresource_names = ["vault"]` for Key Vault is correct.
- The post is a high-level framework overview and does not show supporting resources (resource group, vnet, subnet, private DNS zone, NSG, break-glass group, client config data source). Readers should be aware they will need to declare those referenced resources for the configuration to apply cleanly.
