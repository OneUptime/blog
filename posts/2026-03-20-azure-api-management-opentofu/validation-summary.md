# Validation Summary: How to Create Azure API Management Services with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Azure API Management (APIM)
- Azure Key Vault
- Azure Application Insights
- HashiCorp AzureRM provider
- APIM policies

## Sources Consulted
- AzureRM provider docs: `azurerm_api_management` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management.html.markdown
- AzureRM provider docs: `azurerm_api_management_named_value` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_named_value.html.markdown
- AzureRM provider docs: `azurerm_api_management_product` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_product.html.markdown
- AzureRM provider docs: `azurerm_api_management_product_policy` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_product_policy.html.markdown
- AzureRM provider docs: `azurerm_api_management_backend` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_backend.html.markdown
- AzureRM provider docs: `azurerm_api_management_logger` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_logger.html.markdown
- AzureRM provider docs: `azurerm_api_management_diagnostic` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_diagnostic.html.markdown
- AzureRM provider docs: `azurerm_key_vault_secret` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/key_vault_secret.html.markdown
- AzureRM provider docs: `azurerm_key_vault_certificate` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/key_vault_certificate.html.markdown
- Microsoft Learn: Backends in API Management - https://learn.microsoft.com/en-us/azure/api-management/backends
- Microsoft Learn: How to use named values in Azure API Management policies - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-properties

## Issues Found
- The provider block pinned `hashicorp/azurerm` to `~> 3.0`, which is outdated for a current OpenTofu/AzureRM example. I updated it to `~> 4.0`.
- The custom hostname example used `certificate_source = "BuiltIn"` inside `hostname_configuration.proxy`. In the current AzureRM schema, `certificate_source` is an exported attribute, not a configurable input. I replaced it with `key_vault_certificate_id = azurerm_key_vault_certificate.gateway.versionless_secret_id`, which matches the documented hostname certificate inputs.
- The Key Vault-backed named value used `azurerm_key_vault_secret.backend_api_key.versionless_id`, but `value_from_key_vault.secret_id` expects the Key Vault secret resource ID. I changed this to `resource_versionless_id`, which is the correct versionless resource ID and preserves secret rotation behavior.
- The backend credentials example passed the header value as a list. The AzureRM backend schema expects header values as comma-separated strings, so I changed `X-API-Key` to a string value.
- The diagnostics comment said the logger sent APIM logs to Log Analytics, but the resource shown configures an Application Insights logger. I corrected the wording to match the actual resource behavior.
- The conclusion attributed rate limiting directly to Products. In APIM, Products define packaging and subscription behavior, while policies enforce throttling and quotas. I corrected that sentence.
- The VNet example omitted the Key Vault networking prerequisite for this exact configuration. I added an inline note that APIM subnet egress to `AzureKeyVault` and `AzureActiveDirectory` is required when using Key Vault-backed secrets or certificates from a VNet-injected APIM instance.

## Review Notes
- The snippets are now accurate against current AzureRM resource schemas, but they still rely on surrounding resources and variables not shown in this excerpt, such as the subnet, Application Insights instance, Key Vault secret, and Key Vault certificate.
- The post description mentions subscriptions, but the body only configures product subscription behavior; it does not create an `azurerm_api_management_subscription` resource.
- Provider verification was done against the AzureRM provider's raw documentation sources because the Terraform Registry pages are JavaScript-rendered in this environment.
