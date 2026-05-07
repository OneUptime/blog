# Validation Summary: How to Configure Azure AD App Registrations with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp `azuread` provider
- HashiCorp `azurerm` provider
- Microsoft Entra ID app registrations and service principals
- Microsoft Graph permissions
- OAuth 2.0

## Sources Consulted
- HashiCorp AzureAD provider: `azuread_application` resource docs: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application
- HashiCorp AzureAD provider: `azuread_service_principal` resource docs: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/service_principal
- HashiCorp AzureAD provider: `azuread_application_password` resource docs: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application_password
- HashiCorp AzureAD provider: `azuread_client_config` data source docs: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/client_config
- HashiCorp AzureRM provider: `azurerm_role_assignment` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Microsoft Entra ID identifier URI restrictions: https://learn.microsoft.com/en-us/entra/identity-platform/identifier-uri-restrictions
- Microsoft Entra ID JWT claims customization guidance: https://learn.microsoft.com/en-us/entra/identity-platform/jwt-claims-customization
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post pinned `hashicorp/azuread` to `~> 2.0` while the current provider schema documented for these resources is 3.x. I updated the provider constraint to `~> 3.0`, added `hashicorp/azurerm ~> 4.0`, and added the required `azurerm` provider `features {}` block because the RBAC example uses `azurerm` resources.
- The service principal snippet used outdated `application_id` references and the output used `azuread_application.web_app.application_id`. Current docs show `azuread_service_principal` expects `client_id`, and `azuread_application` exports `client_id`. I updated those references.
- The client secret snippet used `application_object_id`, which is not the current argument for `azuread_application_password`. I changed it to `application_id = azuread_application.web_app.id`, which matches the current resource docs.
- The post referenced `data.azuread_client_config.current.tenant_id` without declaring the data source. I added `data "azuread_client_config" "current" {}` and used it for recommended `owners` assignments on the application and service principal resources.
- The API example enabled `mapped_claims_enabled` while using a generic `api://<string>` identifier URI. Current Microsoft Entra guidance adds constraints around mapped claims and audience values. I removed `mapped_claims_enabled` and changed the example to a verified domain-based identifier URI pattern.
- The service principal example used arbitrary `tags` values as generic metadata. Current provider docs note that service principal tags are for special Azure AD or Entra behaviors rather than normal practitioner metadata. I removed the generic tags.
- The RBAC example created a new service principal and immediately assigned it a role. Current `azurerm_role_assignment` docs note this can fail because of Entra replication lag, so I added `skip_service_principal_aad_check = true`.
- I updated the body text from Azure Active Directory or Azure AD to Microsoft Entra ID where the terminology was outdated, while leaving the original post title intact.

## Review Notes
- `required_resource_access` declares the Microsoft Graph permissions an application needs, but tenant admin consent is still a separate step outside this configuration.
- The OpenTofu commands in the post were already correct and current.
- I could not run `tofu validate` locally because the `tofu` CLI is not installed in this environment.
