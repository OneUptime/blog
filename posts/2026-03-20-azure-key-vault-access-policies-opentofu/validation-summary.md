# Validation Summary: How to Configure Azure Key Vault Access Policies with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Azure Key Vault
- Azure Key Vault access policies
- OpenTofu
- HCL
- AzureRM provider
- Azure managed identities and service principals
- Azure App Service / Azure Linux Web App

## Sources Consulted
- Microsoft Learn: Azure role-based access control (Azure RBAC) vs. access policies (legacy) - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy
- HashiCorp AzureRM provider: `azurerm_key_vault` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- HashiCorp AzureRM provider: `azurerm_key_vault_access_policy` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy
- HashiCorp AzureRM provider: `azurerm_client_config` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config
- HashiCorp AzureRM provider: `azurerm_app_service` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service
- HashiCorp AzureRM provider: `azurerm_linux_web_app` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- OpenTofu documentation: The `for_each` Meta-Argument - https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/

## Issues Found
- The Key Vault example used `enable_rbac_authorization`, which does not match the current AzureRM Key Vault argument name. I changed it to `rbac_authorization_enabled` so the resource matches the current provider schema.
- The managed identity example referenced `azurerm_app_service`, which the AzureRM provider deprecated in v3 and removed in v4. I changed the reference to `azurerm_linux_web_app.app.identity[0].principal_id`, which is the current supported resource shape for this example.
- The overview stated that Azure Key Vault uses access policies as if that were the only authorization model. I updated the wording to reflect current Microsoft guidance: access policies are a supported legacy model, while Azure RBAC is also available.
- The Step 2 code comment claimed "Full admin access" even though the example does not grant every available Key Vault permission. I revised the comment so it accurately describes the permissions shown.

## Review Notes
- Microsoft currently documents Key Vault access policies as a legacy permission model and recommends Azure RBAC for improved security.
- Microsoft also documents Azure RBAC as the default access control model for new key vaults starting with API version `2026-02-01`. This post remains technically valid because it explicitly opts into access policies with `rbac_authorization_enabled = false`.
- The `for_each` usage in Step 5 is valid OpenTofu syntax for iterating over a map of policy definitions.
