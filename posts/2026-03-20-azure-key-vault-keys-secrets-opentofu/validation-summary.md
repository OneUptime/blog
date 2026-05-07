# Validation Summary: How to Create Azure Key Vault Keys and Secrets with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Key Vault
- OpenTofu
- AzureRM provider
- Random provider
- HCL

## Sources Consulted
- Azure Key Vault keys, secrets, and certificates overview: https://learn.microsoft.com/en-us/azure/key-vault/general/about-keys-secrets-certificates
- Azure Key Vault key types, algorithms, and operations: https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys-details
- `azurerm_key_vault` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- `azurerm_key_vault_key` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- `azurerm_key_vault_secret` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- `random_password` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- OpenTofu sensitive data in state: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu write-only attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/

## Issues Found
- The description claimed the post covered certificates, but the article only demonstrates keys and secrets. I updated the description to match the actual content.
- The inline Key Vault access policy omitted `GetRotationPolicy`. Current `azurerm_key_vault_key` documentation requires that permission when keys are managed through the access policy model, so I added it.
- Step 2 was labeled as RSA-only even though it also creates an EC key, and the RSA key comment claimed rotation without a `rotation_policy` block. I corrected the heading and comment to match the code.
- The summary incorrectly implied that `random_password` plus `azurerm_key_vault_secret.value` avoids state exposure after initial creation. Current OpenTofu and AzureRM documentation make clear that these values are still stored in state, so I corrected the summary.

## Review Notes
- The post is technically correct after these fixes, but the snippets still assume surrounding provider configuration, resource group definitions, and variable declarations exist elsewhere in the OpenTofu configuration.
- For newer toolchains, `azurerm_key_vault_secret` supports the write-only `value_wo` argument, and OpenTofu write-only attributes are available from v1.11 onward. That would be a worthwhile future improvement for reducing state exposure.
- Azure Key Vault access policies remain supported, but Microsoft currently recommends Azure RBAC for new deployments.
