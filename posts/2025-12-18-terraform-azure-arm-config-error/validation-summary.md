# Validation Summary: How to Fix 'Error building ARM Config' Azure CLI Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure CLI
- Azure Resource Manager
- Microsoft Entra service principals
- Managed identity
- Azure DevOps Pipelines
- GitHub Actions

## Sources Consulted
- HashiCorp AzureRM provider: Azure CLI authentication: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/azure_cli.html.markdown
- HashiCorp AzureRM provider: service principal with client secret authentication: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/service_principal_client_secret.html.markdown
- HashiCorp AzureRM provider: managed identity authentication: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/managed_service_identity.html.markdown
- HashiCorp AzureRM provider argument reference and feature block docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/index.html.markdown and https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/features-block.html.markdown
- HashiCorp AzureRM 4.0 upgrade guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- Microsoft Learn: Get started with Azure CLI: https://learn.microsoft.com/en-us/cli/azure/get-started-with-azure-cli?view=azure-cli-latest
- Microsoft Learn: Install Azure CLI on macOS: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos?view=azure-cli-latest
- Microsoft Learn: Sign in with Azure CLI using a service principal: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-service-principal?view=azure-cli-latest
- Microsoft Learn: az ad sp create-for-rbac: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: az account commands: https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest
- Microsoft Learn: AzureCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: Azure CLI configuration and troubleshooting: https://learn.microsoft.com/en-us/cli/azure/azure-cli-configuration?view=azure-cli-latest and https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-troubleshooting?view=azure-cli-latest

## Issues Found
- Clarified that the "Azure CLI is only supported as a User" service-principal error applies to older AzureRM provider versions. AzureRM v3.44 and later support Azure CLI authentication for users, service principals, and managed identities, while native service principal/OIDC/managed identity authentication remains the recommended CI/CD approach.
- Updated AzureRM provider version constraints from `~> 3.0` to `~> 4.0` in examples, matching the current provider line and the post's explicit subscription configuration.
- Corrected the managed identity snippet. `use_msi` is still supported and must be enabled explicitly or through `ARM_USE_MSI`; the provider does not simply auto-detect managed identity by default.
- Replaced manual deletion of old Azure CLI token/profile files with `az account clear` plus moving the Azure CLI config directory aside if needed. Current Azure CLI credential storage is not limited to the older `accessTokens.json` file.
- Replaced the unrelated `az config set core.use_command_extensions=true` proxy command with `REQUESTS_CA_BUNDLE`, which is relevant for TLS-intercepting corporate proxies.
- Updated the macOS Azure CLI install command to include `brew update`, matching Microsoft Learn's current Homebrew installation guidance.

## Review Notes
The examples are syntactically plausible and aligned with current official documentation. The GitHub Actions example uses client-secret authentication; for future improvement, the post could add an OIDC example because it avoids long-lived Azure client secrets, but the existing client-secret example is still valid.
