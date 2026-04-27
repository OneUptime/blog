# Validation Summary: How to Configure State Encryption with Azure Key Vault in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (state and plan encryption, v1.7+)
- Azure Key Vault (and Managed HSM)
- AzureRM Terraform provider (`azurerm_key_vault`, `azurerm_key_vault_key`, `azurerm_key_vault_access_policy`)
- AzureRM remote state backend (`backend "azurerm"`)
- Azure authentication (Service Principal, Managed Identity, Azure CLI)
- AES-GCM encryption method

## Sources Consulted
- [OpenTofu State and Plan Encryption documentation](https://opentofu.org/docs/language/state/encryption/)
- [OpenTofu encryption.mdx source on GitHub](https://github.com/opentofu/opentofu/blob/main/website/docs/language/state/encryption.mdx)
- [Terraform AzureRM Provider — `azurerm_key_vault_key` Registry docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key)
- [Microsoft Learn — Configure cryptographic key auto-rotation in Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation)
- [Microsoft Learn — Azure Key Vault Managed HSM key autorotation](https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/key-rotation)

## Issues Found

1. **Wrong key provider block name.** The post used `key_provider "azure_keyvault" "main"`. The official OpenTofu key provider is named `azure_vault`. Updated all occurrences (block name and the reference in `method "aes_gcm" "main" { keys = ... }`) to `azure_vault`.

2. **Non-existent `key_id` parameter.** The post configured the provider with a single `key_id` URL of the form `https://.../keys/<name>/<version>`. The OpenTofu `azure_vault` provider does not accept `key_id`; the documented required parameters are `vault_uri`, `vault_key_name`, and `key_length`. Replaced the `key_id` line with the correct three parameters (`vault_uri = "https://my-keyvault.vault.azure.net"`, `vault_key_name = "tofu-state-key"`, `key_length = 32`).

3. **Invalid Azure storage account name.** `storage_account_name = "mytofu state"` contained a space; Azure storage account names must be 3–24 lowercase alphanumeric characters with no spaces or hyphens. Changed to `mytofustate`.

4. **"Using Key Version (for Key Pinning)" section was based on a non-existent feature.** The OpenTofu `azure_vault` provider has no `key_id` parameter and no documented way to pin a specific key version — version pinning via the URL path is not supported. The example was technically wrong on every line. Replaced the section with a valid alternative that demonstrates a real provider feature: a symmetric HSM-backed key configuration using `symmetric = true` and `symmetric_key_size = 256` against a Managed HSM `vault_uri`. The heading was updated to match the new (correct) content.

## Review Notes

- The `encryption` block is correctly nested inside the `terraform { }` block, matching the OpenTofu documentation.
- `required_version = ">= 1.7"` is correct — state/plan encryption was introduced in OpenTofu 1.7.
- The `azurerm_key_vault_key` `rotation_policy` block (`automatic { time_before_expiry }`, `expire_after`, `notify_before_expiry`) is valid AzureRM provider syntax. The example values (`expire_after = "P90D"`, `time_before_expiry = "P30D"`) satisfy Azure's constraint that auto-rotation occur no more frequently than every 28 days (rotation here happens at day 60). `notify_before_expiry = "P29D"` is unusual (only 1 day before auto-rotation) but technically valid and not changed.
- `key_opts = ["unwrapKey", "wrapKey"]` is appropriate for envelope encryption with an RSA key, and the access-policy permissions (`Get`, `WrapKey`, `UnwrapKey`) align with what OpenTofu needs.
- The post uses Key Vault access policies. Microsoft now recommends RBAC-based authorization for new vaults; access policies still work but readers may want to consider `azurerm_role_assignment` with the "Key Vault Crypto User" role instead. Left as-is — this is a best-practice/style choice, not a technical error.
- The Authentication section's environment variables (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`) are correct for the AzureRM backend, and the OpenTofu `azure_vault` provider reuses the same authentication mechanism.
