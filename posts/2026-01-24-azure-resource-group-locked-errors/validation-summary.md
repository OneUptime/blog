# Validation Summary: How to Fix 'Resource Group Locked' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Resource Manager resource locks
- Azure CLI
- Azure PowerShell
- ARM templates
- Terraform AzureRM provider
- Azure DevOps Pipelines
- GitHub Actions for Azure
- Azure Policy

## Sources Consulted
- Microsoft Learn: Lock your Azure resources to protect your infrastructure - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- Microsoft Learn: Azure CLI `az lock` reference - https://learn.microsoft.com/en-us/cli/azure/lock
- Microsoft Learn: Azure CLI `az resource lock` reference - https://learn.microsoft.com/en-us/cli/azure/resource/lock
- Microsoft Learn: Microsoft.Authorization/locks ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/2020-05-01/locks
- Microsoft Learn: Azure Policy `deployIfNotExists` effect - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: AzureResourceManagerTemplateDeployment@3 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-resource-manager-template-deployment-v3
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- GitHub Marketplace / Azure action releases: Azure Login and Azure CLI actions - https://github.com/marketplace/actions/azure-login and https://github.com/marketplace/actions/azure-cli-action
- Terraform Registry: `azurerm_management_lock` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock

## Issues Found
- The Azure Policy `deployIfNotExists` example omitted `details.roleDefinitionIds`, which Microsoft documents as required for this effect. Added the built-in User Access Administrator role definition ID because that role has the permissions needed to create management locks.
- The GitHub Actions example used older major versions `azure/login@v1` and `azure/CLI@v1`. Updated them to current major versions `azure/login@v3` and `azure/cli@v2`.
- The Azure DevOps ARM deployment task omitted explicit `action` and `deploymentMode` values. Added `Create Or Update Resource Group` and `Incremental` to match the documented task inputs and the example's intended behavior.

## Review Notes
The main lock semantics are accurate: locks can be applied at subscription, resource group, or resource scope; child resources inherit parent locks; `CanNotDelete` allows modification but prevents deletion; and `ReadOnly` blocks updates and deletes at the control plane. The storage-account warning is also correct, but the post could later be expanded to explain the control-plane versus data-plane distinction in more detail.
