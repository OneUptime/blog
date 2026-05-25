# Validation Summary: How to Configure Azure Provider with Service Principal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Microsoft Azure
- Microsoft Entra ID service principals
- Azure CLI
- Azure RBAC
- GitHub Actions
- Azure DevOps Pipelines
- GitLab CI
- OpenSSL

## Sources Consulted
- Microsoft Learn: Authenticate to Azure with service principal - https://learn.microsoft.com/en-us/azure/developer/terraform/authenticate-to-azure-with-service-principle
- Microsoft Learn: az ad sp create-for-rbac - https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: az ad sp credential - https://learn.microsoft.com/en-us/cli/azure/ad/sp/credential?view=azure-cli-latest
- Microsoft Learn: Create or update Azure custom roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli
- Microsoft Learn: Understand Azure role definitions - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions
- HashiCorp Terraform Registry: AzureRM provider documentation - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform Registry: AzureRM service principal client certificate authentication guide - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_certificate
- HashiCorp Terraform Registry: AzureRM service principal client secret authentication guide - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret

## Issues Found
- The certificate-based authentication example said the PFX file was needed by Azure. Azure CLI's `--cert` option expects a PEM or DER public certificate and should not include the private key; the AzureRM provider uses the PFX/PKCS#12 bundle through `client_certificate_path`. I changed the comment to say the PFX is for Terraform, clarified that the service principal is created with the public certificate, and added a note to point Terraform at the generated PFX file.
- The PFX export command used an empty password while the Terraform provider block included `client_certificate_password`. I changed the example to use a placeholder non-empty export password so the command and provider configuration are consistent.

## Review Notes
- The service principal, environment variable, provider block, RBAC scoping, custom role, CI/CD, and credential rotation examples are broadly consistent with current official documentation.
- For new CI/CD implementations, OpenID Connect or managed identities can reduce long-lived secret handling, but service principal client secret and certificate authentication remain supported by the AzureRM provider.
