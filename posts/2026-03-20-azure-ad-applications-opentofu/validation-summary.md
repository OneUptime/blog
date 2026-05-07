# Validation Summary: How to Set Up Azure AD Applications with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Microsoft Entra ID (Azure AD) app registrations
- HashiCorp AzureAD provider
- HashiCorp AzureRM provider
- OAuth 2.0 / OpenID Connect
- Microsoft Graph
- Azure Key Vault

## Sources Consulted
- OpenTofu settings: https://opentofu.org/docs/language/settings/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- AzureAD provider v2.47.0 `azuread_application` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/resources/application.md
- AzureAD provider v2.47.0 `azuread_service_principal` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/resources/service_principal.md
- AzureAD provider v2.47.0 `azuread_application_password` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/resources/application_password.md
- AzureAD provider v2.47.0 `azuread_client_config` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/data-sources/client_config.md
- AzureRM provider docs index: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- AzureRM Key Vault data source docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault
- AzureRM Key Vault secret resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- Microsoft Entra identifier URI restrictions: https://learn.microsoft.com/en-us/entra/identity-platform/identifier-uri-restrictions
- Microsoft identity platform protected web API scopes guidance: https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-expose-scopes
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft identity platform redirect URI guidance: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url

## Issues Found
- The post stored the client secret in Azure Key Vault without declaring the `azurerm` provider. I added the `hashicorp/azurerm` provider requirement and a minimal `provider "azurerm" { features {} }` block so the Key Vault example uses a real provider configuration.
- The Key Vault example referenced `azurerm_key_vault.kv.id`, but no such resource existed in the post. I changed this to an explicit `data "azurerm_key_vault" "kv"` lookup and updated `key_vault_id` to `data.azurerm_key_vault.kv.id`, which matches the official AzureRM data source and secret resource documentation.
- The original Application ID URI used `api://mywebapp`. Microsoft now documents secure URI patterns and recommends using tenant-bound or app-bound identifiers. I changed the example to `api://${data.azuread_client_config.current.tenant_id}/mywebapp`, which matches a documented secure pattern.
- The app registration and service principal examples omitted `owners`. HashiCorp’s AzureAD provider documentation recommends assigning owners and specifically calls this out for `Application.ReadWrite.OwnedBy` scenarios. I added `owners = [data.azuread_client_config.current.object_id]` to both resources so the example is aligned with the documented permission model.

## Review Notes
- The post pins `hashicorp/azuread` to `~> 2.47`; the examples were validated against the AzureAD provider v2.47.0 documentation. Newer 3.x releases exist, but the resource syntax used here remains valid for the pinned version.
- The local redirect URI using `https://localhost:3000/auth/callback` is technically valid. Microsoft’s current guidance prefers `127.0.0.1` over `localhost` for loopback redirects, but no change was required for correctness.
- AzureRM provider v4 requires a subscription ID to be resolvable for plan/apply, either from provider configuration, environment variables such as `ARM_SUBSCRIPTION_ID`, or the active Azure CLI context.
- `azurerm_key_vault_secret` stores the secret value in OpenTofu/Terraform state. That is expected provider behavior and is worth keeping in mind for production state handling.
