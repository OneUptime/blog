# Validation Summary: How to Use Azure Bicep What-If Command to Preview Infra Changes Before

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Azure Resource Manager deployments
- Azure CLI
- Azure Pipelines
- Bash and jq

## Sources Consulted
- Microsoft Learn: Bicep What-If: Preview Changes Before Deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-what-if
- Microsoft Learn: ARM template deployment what-if operation - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-what-if
- Microsoft Learn: Azure CLI `az deployment group what-if` reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: Azure CLI `az deployment sub what-if` reference - https://learn.microsoft.com/en-us/cli/azure/deployment/sub
- Microsoft Learn: Deploy Bicep files with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli
- Microsoft Learn: Create parameters files for Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files
- Microsoft Learn: ARM template deployment modes - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2

## Issues Found
- The change-type list omitted `NoEffect` and described `NoChange` as an exact template match. I added `No effect` and updated `No change` to match Microsoft's definition: redeployed, but properties do not change.
- The Azure CLI examples passed JSON parameter files as plain paths. I updated them to use the file-reference form, such as `--parameters '@main.parameters.json'`, which is the documented form in the Bicep deployment CLI guide.
- The PR validation section said the pipeline posts a PR comment, but the YAML only publishes a build artifact. I changed the sentence to match the actual pipeline behavior.
- The incremental mode explanation said deletions show for resources explicitly removed from the template. I corrected it: in incremental mode, resources omitted from the template are left alone.
- The limitations section used `uniqueString()` password generation as the example of dynamic values. I replaced it with official what-if limitations around unresolved `reference()` calls and unevaluated expressions such as `utcNow()`.
- The deletion-check script told readers to add an `--allow-deletions` flag, but the script did not implement that flag and Azure CLI what-if has no such option. I changed the message to instruct readers to update the pipeline policy.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI validation was performed against official Microsoft Learn command references rather than local `az --help` output.
- The post's AzureCLI@2 pipeline task inputs are consistent with the official Azure Pipelines task schema.
