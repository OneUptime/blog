# Validation Summary: How to Create Azure Static Web Apps in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Static Web Apps
- Azure Functions APIs
- Azure DNS
- GitHub Actions
- Azure Key Vault
- Managed identities

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_static_web_app` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app
- HashiCorp Terraform Registry: `azurerm_static_web_app_custom_domain` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app_custom_domain
- Microsoft Learn: Azure Static Web Apps quotas, https://learn.microsoft.com/azure/static-web-apps/quotas
- Microsoft Learn: Azure Static Web Apps hosting plans, https://learn.microsoft.com/azure/static-web-apps/plans
- Microsoft Azure pricing: Static Web Apps pricing, https://azure.microsoft.com/pricing/details/app-service/static/
- Microsoft Learn: Configure application settings for Azure Static Web Apps, https://learn.microsoft.com/azure/static-web-apps/application-settings
- Microsoft Learn: API support in Azure Static Web Apps with Azure Functions, https://learn.microsoft.com/azure/static-web-apps/apis-functions
- Microsoft Learn: Secure authentication secrets in Azure Key Vault for Azure Static Web Apps, https://learn.microsoft.com/azure/static-web-apps/key-vault-secrets
- Microsoft Learn: Authenticate and authorize Static Web Apps, https://learn.microsoft.com/azure/static-web-apps/authentication-authorization
- Microsoft Learn: Custom authentication in Azure Static Web Apps, https://learn.microsoft.com/azure/static-web-apps/authentication-custom

## Issues Found
- The authentication provider list still named Azure AD and Twitter as built-in providers. Updated it to Microsoft Entra ID and GitHub, with custom OpenID Connect providers for additional identity providers, matching current Static Web Apps documentation.
- The Free tier API execution count was listed as 100,000 invocations per month. Updated it to 1 million free Azure Functions executions per month.
- The Standard tier bandwidth wording said 100 GB per app. Updated it to 100 GB included bandwidth per subscription per month with paid overage, matching current pricing and quota documentation.
- The Standard tier was described as "$9/month" in two places. Reworded this as the paid Standard tier to avoid a stale hard-coded price.
- The CNAME custom domain Terraform example created `azurerm_static_web_app_custom_domain` before the DNS record. Reordered the example and added `depends_on` so CNAME validation happens after the Azure DNS CNAME record exists.
- The app settings example used a Key Vault reference as a generic API environment variable. Replaced it with a plain placeholder value because managed Static Web Apps functions do not support direct Key Vault references.
- The managed identity section claimed Static Web App managed identity could be used by managed backend APIs to access Storage and Key Vault. Reworked it to describe the supported Key Vault secret reference use case for Static Web Apps, and noted that APIs needing managed identity should use bring-your-own Azure Functions with identity enabled on the Function App.
- The deployment token best practice said to keep the token out of Terraform state. Clarified that sensitive outputs are still stored in state and that the state must be secured.

## Review Notes
The Terraform snippets are illustrative and still refer to surrounding resources such as `azurerm_dns_zone.main`, `azurerm_resource_group.dns`, and `azurerm_key_vault.main` that are not defined in the post. That is acceptable for focused snippets, but a future full example should include those resources or explicitly state they are assumed to exist.
