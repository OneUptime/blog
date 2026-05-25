# Validation Summary: How to Create Azure DevOps Projects in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Microsoft Azure DevOps Terraform provider
- AzureRM Terraform provider
- Azure DevOps Projects, Repos, Pipelines, branch policies, service connections, variable groups, environments, teams, and groups
- Azure Resource Manager service connections
- Docker Registry and GitHub service connections
- Azure Key Vault-linked variable groups

## Sources Consulted
- Azure DevOps Terraform provider documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs
- `azuredevops_project` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/project
- `azuredevops_git_repository` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/git_repository
- `azuredevops_branch_policy_min_reviewers` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/branch_policy_min_reviewers
- `azuredevops_branch_policy_build_validation` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/branch_policy_build_validation
- `azuredevops_variable_group` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/variable_group
- `azuredevops_serviceendpoint_azurerm` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/serviceendpoint_azurerm
- `azuredevops_serviceendpoint_dockerregistry` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/serviceendpoint_dockerregistry
- `azuredevops_serviceendpoint_github` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/serviceendpoint_github
- `azuredevops_build_definition` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/build_definition
- `azuredevops_environment` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/environment
- `azuredevops_team` resource documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/resources/team
- `azuredevops_group` data source documentation: https://registry.terraform.io/providers/microsoft/azuredevops/latest/docs/data-sources/group
- AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- `azurerm_client_config` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config
- `azurerm_subscription` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription
- Microsoft Learn, What is Azure DevOps?: https://learn.microsoft.com/en-us/azure/devops/user-guide/what-is-azure-devops
- Microsoft Learn, Azure Pipelines service connections: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints
- Microsoft Learn, Azure Repos branch policies: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies

## Issues Found
- The Azure DevOps provider pin used `~> 0.11`, which is stale for a 2026 tutorial. Updated it to `~> 1.15`, matching the current provider major/minor version available during review.
- The AzureRM provider pin used `~> 3.80`, while the current maintained major version is 4.x. Updated it to `~> 4.0`.
- The prerequisites implied Azure CLI specifically was required for Azure service connections. Updated this to AzureRM provider authentication, since AzureRM supports Azure CLI, service principal, managed identity, and OIDC authentication methods.
- The Azure DevOps provider example commented that a PAT variable could be replaced by managed identity in the same argument. Updated the comment to recommend `AZDO_PERSONAL_ACCESS_TOKEN` or a secrets manager.
- Branch policy and build definition examples hardcoded `refs/heads/main`. Updated them to use `azuredevops_git_repository.api.default_branch`, matching the provider's exported initialized repository default branch and avoiding failures in organizations with a different default branch.
- The Azure Resource Manager service endpoint example omitted the authentication scheme and hardcoded the subscription display name. Added `service_endpoint_authentication_scheme = "ServicePrincipal"` and changed the subscription name to `data.azurerm_subscription.current.display_name`.
- The Docker Registry service endpoint example for ACR used `https://myacr.azurecr.io`; the provider's documented "Others" registry examples use the Docker registry endpoint form with `/v1`. Updated it to `https://myacr.azurecr.io/v1`.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was performed against the official Terraform provider documentation, Terraform Registry provider metadata, and Microsoft Learn documentation.
