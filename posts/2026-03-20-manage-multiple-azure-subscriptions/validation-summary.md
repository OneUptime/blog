# Validation Summary: How to Manage Multiple Azure Subscriptions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Microsoft Azure subscriptions
- Provider aliases
- OpenTofu modules
- Azure remote state backend
- Service principal authentication
- Managed identity authentication

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu module `providers` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/module-providers/
- OpenTofu `azurerm` backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- AzureRM provider service principal with client secret guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret.html
- AzureRM provider managed identity guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/managed_service_identity.html
- AzureRM provider service principal OIDC guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- AzureRM provider 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide

## Issues Found
- The provider version constraint pinned `hashicorp/azurerm` to `~> 3.0`, which is outdated relative to the current 4.x provider line. I updated it to `~> 4.0` so the example reflects the current major version while remaining compatible with the rest of the snippet.
- The "Using Azure Managed Identity in CI" example did not actually configure managed identity. It showed a commented `use_oidc` line, which is OIDC-based service principal authentication, not managed identity. I corrected the snippet to use `use_msi = true`, added `tenant_id`, and clarified that the example applies to a self-hosted agent running on an Azure VM.

## Review Notes
- The multi-subscription provider alias pattern is technically correct for OpenTofu and the `providers` meta-argument is used correctly when passing a non-default provider configuration into a module.
- The backend example is valid as written. If a team chooses Entra ID authentication for the `azurerm` backend, OpenTofu also supports `use_azuread_auth = true`, but that is an optional enhancement rather than a correction needed for this post.
