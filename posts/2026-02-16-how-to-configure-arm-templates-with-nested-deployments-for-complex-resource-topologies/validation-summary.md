# Validation Summary: How to Configure ARM Templates with Nested Deployments

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Resource Manager templates
- Nested and linked ARM deployments
- Azure Template Specs
- Azure CLI
- Azure Blob Storage and SAS tokens
- Azure resource group and subscription-scope deployments

## Sources Consulted
- Microsoft Learn: Link templates for deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/linked-templates
- Microsoft Learn: Microsoft.Resources/deployments 2022-09-01 ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.resources/2022-09-01/deployments
- Microsoft Learn: Deployment modes - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- Microsoft Learn: Subscription deployments with ARM templates - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-subscription
- Microsoft Learn: ARM template functions in deployment scopes - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/scope-functions
- Microsoft Learn: Create and deploy template specs - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-specs
- Microsoft Learn: az ts command reference - https://learn.microsoft.com/en-us/cli/azure/ts
- Microsoft Learn: az deployment group command reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: az deployment operation group command reference - https://learn.microsoft.com/en-us/cli/azure/deployment/operation/group
- Microsoft Learn: az storage blob upload-batch command reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Microsoft Learn: az storage container generate-sas command reference - https://learn.microsoft.com/en-us/cli/azure/storage/container

## Issues Found
- The "Hosting Linked Templates" section said linked templates must be accessible via a URL, but Azure Template Specs can be referenced by template spec resource ID. Updated the wording to distinguish URL-staged linked templates from Template Specs.
- The cross-resource-group deployment example is deployed with `az deployment sub create`, so the parent template should use the subscription deployment schema. Updated the schema URL from `deploymentTemplate.json` to `subscriptionDeploymentTemplate.json`.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI syntax was verified against Microsoft Learn command references instead of local `az --help`. The post's use of incremental mode for nested and linked deployments is correct; Microsoft documentation states linked and nested templates must use incremental mode.
