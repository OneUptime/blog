# Validation Summary: How to Use Terraform Workload Identity Federation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp AzureAD provider
- Azure CLI
- Microsoft Entra ID workload identity federation
- Azure Storage Terraform backend
- GitHub Actions OIDC
- Azure DevOps workload identity federation

## Sources Consulted
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp AzureRM provider OIDC guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- HashiCorp AzureAD provider federated identity credential resource documentation: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application_federated_identity_credential
- Microsoft Azure CLI federated credential documentation: https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- GitHub Actions OIDC with Azure documentation: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure
- GitHub Actions OIDC reference: https://docs.github.com/en/actions/reference/security/oidc
- Azure Login action documentation: https://github.com/Azure/login
- Azure DevOps AzureCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Azure DevOps workload identity service connection documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity
- Azure DevOps workload identity troubleshooting documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/troubleshoot-workload-identity

## Issues Found
- The Azure Storage backend example used `use_oidc = true` but did not enable Azure AD data-plane authentication or grant a storage data-plane role. Added `use_azuread_auth = true`, added a `Storage Blob Data Contributor` role assignment for the state storage account, and updated the troubleshooting note.
- The post said GitHub Actions OIDC tokens are automatically provided to Terraform through `ARM_OIDC_TOKEN` by `azure/login`. Corrected this to explain that the AzureRM provider can request a GitHub OIDC token from the GitHub Actions runtime environment variables, while `ARM_OIDC_TOKEN` is for explicitly supplied tokens.
- The Azure DevOps federated credential example hard-coded the older Azure DevOps issuer format. Updated it to instruct readers to copy the generated issuer and subject identifier from the workload identity service connection, and noted that new service connections use a Microsoft Entra issuer.
- The Azure DevOps Terraform environment example did not include the Azure DevOps service connection ID expected by current Terraform AzureRM OIDC support. Added `ARM_ADO_PIPELINE_SERVICE_CONNECTION_ID`.

## Review Notes
The post still uses the term Azure AD in prose. Microsoft now brands this as Microsoft Entra ID, but the Azure CLI commands still use the `az ad` command group, so this is not a functional issue.
