# Validation Summary: How to Configure the Azure Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AzureRM provider
- Microsoft Azure
- Azure authentication

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider requirements docs: https://opentofu.org/docs/v1.9/language/providers/requirements/
- AzureRM provider reference: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/index
- AzureRM features block guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/features-block
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- AzureRM service principal with client secret guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret
- AzureRM managed identity guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/managed_service_identity

## Issues Found
- The introduction described AzureRM as "OpenTofu's primary provider", which is imprecise because AzureRM is a provider used with OpenTofu rather than a provider owned by OpenTofu. I changed the sentence to state that it is the primary provider for managing Azure resources with OpenTofu.
- The `key_vault` feature example claimed to keep both Key Vaults and secrets recoverable, but it only configured vault-level toggles. I added `purge_soft_deleted_secrets_on_destroy = false` and `recover_soft_deleted_secrets = true` so the example matches the comment and the provider's documented feature flags.
- The `virtual_machine.delete_os_disk_on_deletion` comment was too broad. The AzureRM features documentation states that this flag applies to `azurerm_linux_virtual_machine` and `azurerm_windows_virtual_machine`, not the legacy `azurerm_virtual_machine` resource. I narrowed the comment accordingly.

## Review Notes
- The post's `subscription_id` requirement is correct for AzureRM v4.x. The provider's 4.0 upgrade guide explicitly makes `subscription_id` mandatory for provider instances during plan/apply, whether set in configuration or via `ARM_SUBSCRIPTION_ID`.
- `features {}` is correctly shown as required for the AzureRM provider.
- Some feature-flag defaults shown in the article are already the documented defaults in v4.x, so the examples are valid but partly explicit for clarity rather than necessity.
- The review was completed against official documentation. A live `tofu validate` check was not possible because the `tofu` CLI is not installed in this environment.
