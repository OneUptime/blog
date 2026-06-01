# Validation Summary: Create Azure Bicep Deployment Scripts for Post-Deployment Configuration Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Azure Resource Manager deployment scripts
- Azure CLI
- Azure PowerShell
- Azure Container Instances
- Azure managed identities
- Azure role assignments
- Azure Key Vault
- Azure Storage

## Sources Consulted
- Microsoft Learn: Develop a deployment script in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-develop
- Microsoft Learn: Use deployment scripts in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-bicep
- Microsoft Learn: Microsoft.Resources/deploymentScripts resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.resources/deploymentscripts
- Microsoft Learn: Bicep date functions, including utcNow - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-date
- Microsoft Learn: Bicep linter rule for recent Az PowerShell versions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-use-recent-az-powershell-version
- Microsoft Learn: Azure CLI deployment-scripts command group - https://learn.microsoft.com/en-us/cli/azure/deployment-scripts

## Issues Found
- The Azure CLI examples wrote outputs to `$AZ_SCRIPTS_OUTPUT_FILE`, but deployment scripts expose the output file path as `$AZ_SCRIPTS_OUTPUT_PATH`. Updated all CLI output examples to use `$AZ_SCRIPTS_OUTPUT_PATH`.
- The examples used `$AZ_SCRIPTS_RESOURCE_GROUP` and `$AZ_SCRIPTS_SUBSCRIPTION_ID`, which are not documented deployment script environment variables. Added explicit `RESOURCE_GROUP_NAME` and `SUBSCRIPTION_ID` environment variables and updated the scripts to use them.
- The post stated that deployment scripts need a managed identity for authentication. Microsoft documentation says a user-assigned identity is optional unless the script performs Azure-specific actions or runs in a private network. Updated the wording to reflect that nuance.
- The PowerShell example used `azPowerShellVersion: '10.0'`. Current Bicep lint guidance recommends Az PowerShell 14.0, and versions below 11.0 fail the recent-version linter rule. Updated the sample to `14.0`.
- The `forceUpdateTag` example used `utcNow()` directly in a resource property. Bicep only permits `utcNow()` in a parameter default value. Added a `forceUpdateTag` parameter defaulting to `utcNow()` and used that parameter in the resource.
- The debugging section said to use `cleanupPreference: 'OnExpiration'`, while the code used `OnSuccess` and the surrounding comments described the `OnSuccess` behavior. Updated the prose so it matches the code and the documented cleanup preference behavior.

## Review Notes
The examples are illustrative and still reference placeholder resources, names, and URLs such as the sample `az rest` management URL and undefined resources from surrounding templates. That is acceptable for the post's tutorial scope, but a production-ready template should also use least-privilege role assignments instead of broad Contributor access where possible.
