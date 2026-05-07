# Validation Summary: How to Authenticate with Azure Using Service Principal in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Microsoft Azure
- Azure Service Principals
- Azure CLI
- HashiCorp AzureRM provider (`hashicorp/azurerm`)
- HashiCorp AzureAD provider (`hashicorp/azuread`)
- GitHub Actions
- HCL
- YAML

## Sources Consulted
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- Azure CLI `az ad sp` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Create an Azure service principal with Azure CLI: https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-1?view=azure-cli-latest
- Use an Azure service principal with certificate-based authentication: https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-3?view=azure-cli-latest
- Sign in with Azure CLI using a service principal: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-service-principal?view=azure-cli-latest
- Authenticate to Azure with service principal: https://learn.microsoft.com/en-us/azure/developer/terraform/authenticate/authenticate-to-azure-with-service-principle
- AzureRM provider argument reference (official provider source docs): https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/index.html.markdown
- AzureRM provider guide, service principal with client secret (official provider source docs): https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/service_principal_client_secret.html.markdown
- AzureRM provider guide, service principal with client certificate (official provider source docs): https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/service_principal_client_certificate.html.markdown
- AzureRM `azurerm_role_assignment` resource docs (official provider source docs): https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/role_assignment.html.markdown
- AzureAD `azuread_application_certificate` resource docs (official provider source docs): https://github.com/hashicorp/terraform-provider-azuread/blob/main/docs/resources/application_certificate.md
- AzureAD `azuread_service_principal` resource docs (official provider source docs): https://github.com/hashicorp/terraform-provider-azuread/blob/main/docs/resources/service_principal.md
- `actions/checkout` README: https://github.com/actions/checkout
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu

## Issues Found
- The introduction described service principals as the recommended CI/CD authentication method. The current AzureRM provider docs list multiple non-interactive authentication methods, so I changed the wording to "common" to avoid overstating it.
- The Azure CLI section said the command output only those three JSON keys. Current `az ad sp create-for-rbac` output includes additional fields such as `displayName`, so I changed the wording from "This outputs" to "This includes".
- The certificate-based authentication example was not a working AzureRM authentication configuration. The AzureRM provider expects a PKCS#12 (`.pfx`) bundle via `client_certificate` or `client_certificate_path`, plus `client_certificate_password`. I replaced the snippet with a correct `azurerm` provider configuration and clarified the required environment variables.
- The GitHub Actions example used older action majors. I updated `actions/checkout` from `@v4` to `@v6` and `opentofu/setup-opentofu` from `@v1` to `@v2`, and added `contents: read` permissions to align with the current `actions/checkout` guidance.
- The conclusion claimed certificates "do not expire silently" and contrasted least privilege with "the entire Azure AD tenant". Certificates also expire, and Azure RBAC scope is normally discussed in terms of resource, resource group, subscription, or management group scope. I corrected that wording.

## Review Notes
- `azurerm_role_assignment.principal_id` expects the service principal's object ID, not its application/client ID. The existing example's use of `azuread_service_principal.opentofu.object_id` is consistent with the provider documentation.
- The AzureRM provider also supports OpenID Connect for non-interactive environments, but this post is specifically scoped to service principal secret and certificate authentication.
- I did not run `az` or `tofu` locally because neither CLI is installed in this environment.
