# Validation Summary: How to Create Azure AD B2C Tenants with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Active Directory / Microsoft Entra ID (`azuread`) provider
- Azure AD B2C
- Microsoft Graph permissions

## Sources Consulted
- Microsoft Learn: Azure AD B2C FAQ - https://learn.microsoft.com/en-us/azure/active-directory-b2c/faq
- Microsoft Learn: What is Azure Active Directory B2C? - https://learn.microsoft.com/en-us/azure/active-directory-b2c/overview
- OpenTofu docs: Provider Configuration - https://opentofu.org/docs/language/providers/configuration/
- OpenTofu docs: Command `init` - https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu docs: Command `output` - https://opentofu.org/docs/cli/commands/output/
- Terraform Registry: AzureRM provider - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Registry: `azurerm_aadb2c_directory` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/aadb2c_directory
- Terraform Registry: AzureAD provider - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs
- Terraform Registry: `azuread_application` - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application
- Microsoft Graph permissions reference - https://learn.microsoft.com/en-us/graph/permissions-reference

## Issues Found
- The post treated Azure AD B2C tenant creation as generally available. I updated the description, introduction, SKU guidance, and summary to reflect the current Microsoft guidance: Azure AD B2C is no longer available to purchase for new customers after May 1, 2025, and new B2C tenants must use Premium P1.
- The provider version constraints were outdated. I updated `azurerm` from `~> 3.0` to `~> 4.0` and `azuread` from `~> 2.0` to `~> 3.0`, and I added the required `provider "azurerm" { features {} }` block.
- The post said B2C resources require both providers, which was too broad. I corrected the explanation to distinguish tenant creation with `azurerm` from tenant-scoped application management with `azuread`.
- The aliased `azuread` provider used `azurerm_aadb2c_directory.main.tenant_id` directly. I changed this to `var.b2c_tenant_id` and documented that tenant-scoped AzureAD configuration must happen in a follow-up apply or separate OpenTofu root module because provider configuration values must be known before apply.
- The section titled `Creating B2C User Flow Policies` did not create any user flows. I renamed the section and corrected the text so it accurately describes the outputs that follow.
- The output used `azuread_application.web_app.application_id`, which is not the current exported attribute for the resource. I replaced it with `azuread_application.web_app.client_id`.

## Review Notes
- The AzureRM provider documentation still lists `PremiumP2` as an allowed `sku_name` value for `azurerm_aadb2c_directory`, but Microsoft Learn states that new Azure AD B2C tenants can only be created with Premium P1 and that Azure AD B2C P2 was discontinued on March 15, 2026.
- User flows and custom policies remain outside the scope of the OpenTofu examples in this post and still require Azure portal or Microsoft Graph configuration.
