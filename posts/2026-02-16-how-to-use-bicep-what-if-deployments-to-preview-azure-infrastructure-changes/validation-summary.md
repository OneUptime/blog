# Validation Summary: How to Use Bicep What-If Deployments to Preview Azure Infrastructure Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Manager deployments
- Bicep
- Azure CLI
- Azure PowerShell Az.Resources
- GitHub Actions

## Sources Consulted
- Microsoft Learn: ARM template deployment what-if operation - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-what-if
- Microsoft Learn: Bicep what-if deployments - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-what-if
- Microsoft Learn: Azure CLI `az deployment group what-if` reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft Learn: Azure PowerShell `Get-AzResourceGroupDeploymentWhatIfResult` reference - https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azresourcegroupdeploymentwhatifresult
- Microsoft Learn: Azure PowerShell `New-AzResourceGroupDeployment` reference - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresourcegroupdeployment
- GitHub Docs: `actions/github-script` usage and examples - https://github.com/actions/github-script

## Issues Found
- The what-if change type list omitted `Deploy` and `NoEffect`. Microsoft documents seven possible change types, so the post now includes those two types.
- The `NoChange` description said the resource matches the template exactly. Microsoft describes `NoChange` as a redeploy with no property changes, so the wording was adjusted.
- The GitHub Actions PR comment example embedded triple backticks directly inside a JavaScript template literal, which would terminate the string and break the script. The example now builds the comment body with an array and uses Markdown tildes for the code fence.
- The `actions/github-script` API call was not awaited. The example now uses `await github.rest.issues.createComment(...)`.
- The limitations section said what-if evaluates `listKeys()` and similar Azure API functions. Microsoft documents that what-if does not evaluate resource functions such as `listKeys()` outside the deployment context, so the paragraph now describes that limitation accurately.

## Review Notes
The Azure CLI and PowerShell command names and parameters used in the post match current Microsoft documentation. The local environment did not have the Azure CLI installed, so CLI verification was performed against official Microsoft Learn references rather than local `az --help` output.
