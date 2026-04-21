# Validation Summary: How to Configure State Encryption with Azure Key Vault in OpenTofu - Keyvault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu state and plan encryption
- OpenTofu Azure Key Vault (`azure_vault`) key provider
- Azure Key Vault
- Terraform/OpenTofu HCL
- AzureRM provider resources for Key Vault, keys, RBAC role assignments, and diagnostic settings
- Azure CLI authentication
- Azure RBAC

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu v1.11 changelog: https://github.com/opentofu/opentofu/blob/v1.11/CHANGELOG.md
- OpenTofu Azure Vault key provider source/API surface: https://github.com/opentofu/opentofu/tree/v1.11.5/internal/encryption/keyprovider/azure_vault
- OpenTofu AzureRM backend authentication documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- AzureRM `azurerm_key_vault_key` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- AzureRM `azurerm_monitor_diagnostic_setting` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Microsoft Learn Azure built-in roles for Security: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security
- Microsoft Learn Azure Key Vault key types, algorithms, and operations: https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys-details

## Issues Found

1. **Incorrect OpenTofu Azure Key Vault key provider name and arguments.** The post used `key_provider "azure_keyvault"` with `key_vault_url`, `key_name`, and an optional `key_version`. Current OpenTofu uses `key_provider "azure_vault"` with `vault_uri`, `vault_key_name`, and required `key_length`; it does not expose a `key_version` argument. Updated both encryption snippets accordingly.

2. **Incorrect minimum OpenTofu version.** The post listed `required_version = ">= 1.7.0"`, but the `azure_vault` key provider was added in OpenTofu 1.11. Updated the requirement to `>= 1.11.0`.

3. **Missing AES-GCM-compatible key length.** The Azure Vault key provider requires `key_length`, and the AES-GCM method requires a 16-, 24-, or 32-byte key. Added `key_length = 32` to both snippets.

4. **Managed identity authentication was incomplete.** The post implied managed identity is used automatically. OpenTofu's Azure authentication supports managed identity through the `use_msi` option or `ARM_USE_MSI`; updated the command snippet to set `ARM_USE_MSI=true` along with tenant and subscription IDs.

5. **Deprecated AzureRM diagnostic metric block.** The diagnostic settings example used `metric`; current AzureRM documentation uses `enabled_metric` alongside `enabled_log`. Replaced `metric` with `enabled_metric`.

6. **Key creation role requirement was incomplete.** The post correctly assigned `Key Vault Crypto User` for runtime cryptographic operations, but creating and managing `azurerm_key_vault_key` with a rotation policy requires key-management permissions such as `Key Vault Crypto Officer` or `Key Vault Administrator`. Added a short caveat below the RBAC example.

## Review Notes
- The Key Vault resource, key resource, key options, key rotation policy, RBAC role assignment, Azure CLI login commands, and Key Vault diagnostic log category are otherwise aligned with current documentation.
- Local `tofu validate` or `terraform validate` could not be run because neither CLI is installed in the workspace.
