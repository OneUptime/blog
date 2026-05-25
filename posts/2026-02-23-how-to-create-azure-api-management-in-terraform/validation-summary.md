# Validation Summary: How to Create Azure API Management in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure API Management
- Azure Application Insights
- Azure Key Vault named values
- APIM policies and diagnostics
- OpenAPI import

## Sources Consulted
- HashiCorp Terraform Registry: AzureRM provider 4.x configuration and `subscription_id` requirement: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform Registry: AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/4.0.0/docs/guides/4.0-upgrade-guide
- HashiCorp Terraform Registry: `azurerm_api_management` SKU and `min_api_version` schema: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management
- HashiCorp Terraform Registry: `azurerm_api_management_diagnostic`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_diagnostic
- HashiCorp Terraform Registry: `azurerm_api_management_logger`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_logger
- HashiCorp Terraform Registry: `azurerm_api_management_subscription`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_subscription
- HashiCorp Terraform Registry: `azurerm_application_insights`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights
- Microsoft Learn: Azure API Management `rate-limit` policy: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: Azure API Management `rate-limit-by-key` policy: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Microsoft Learn: Azure API Management `cache-lookup` policy: https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy
- Microsoft Learn: Azure API Management `validate-jwt` policy: https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: Azure API Management named values and Key Vault integration: https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-properties

## Issues Found
- The post description claimed developer portal configuration was included, but the post does not configure the developer portal. Updated the description to say diagnostics instead.
- The provider example used AzureRM `~> 3.80`, which is outdated for a 2026 guide. Updated it to AzureRM `~> 4.0` and added the required `subscription_id` provider configuration through a Terraform variable.
- The prerequisites did not mention the AzureRM 4.x subscription ID requirement. Added a prerequisite noting `TF_VAR_subscription_id`.
- The APIM SKU comment omitted current v2 SKU names. Added `BasicV2`, `StandardV2`, and `PremiumV2`.
- The `min_api_version` field was incorrectly described as the minimum TLS version. Corrected the comment to describe it as the minimum control plane API version.
- The global policy used `<rate-limit>`, but Microsoft documents `rate-limit` as valid only at product, API, and operation scopes. Replaced it with `<rate-limit-by-key>`, which is valid at global scope, using `context.Subscription.Id` as the counter key.
- The JWT policy comment used the old Azure AD name. Updated it to Microsoft Entra ID.
- The cache lookup was placed after JWT validation while relying on the default `allow-private-response-caching="false"`, so authenticated requests with an `Authorization` header would not be cached as described. Enabled private response caching and added `Authorization` as a cache vary header.

## Review Notes
The remaining Terraform resource arguments and APIM policy elements were consistent with current official documentation. The Key Vault named value example is structurally correct, but a production deployment must also grant the APIM managed identity access to the Key Vault secret as described in Microsoft's named value documentation.
