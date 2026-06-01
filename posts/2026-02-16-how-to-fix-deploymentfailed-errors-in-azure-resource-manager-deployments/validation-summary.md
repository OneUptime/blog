# Validation Summary: How to Fix 'DeploymentFailed' Errors in Azure Resource Manager Deployments

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Resource Manager
- ARM templates
- Azure CLI
- Azure resource providers
- Azure quotas
- Azure VM SKUs
- Azure deployment history and operations

## Sources Consulted
- Azure CLI `az deployment group` reference: https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Azure CLI `az deployment operation group` reference: https://learn.microsoft.com/en-us/cli/azure/deployment/operation/group?view=azure-cli-latest
- Azure Resource Manager deployment operations REST API: https://learn.microsoft.com/en-us/rest/api/resources/deployment-operations/list?view=rest-resources-2025-04-01
- Azure Resource Manager deployment modes: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- Azure Resource Manager deployment history quota troubleshooting: https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/deployment-quota-exceeded
- ARM/Bicep `uniqueString` function documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-string#uniquestring
- Azure CLI `az quota` reference: https://learn.microsoft.com/en-us/cli/azure/quota?view=azure-cli-latest
- Azure Quotas portal quickstart: https://learn.microsoft.com/en-us/azure/quotas/quickstart-increase-quota-portal
- Azure VM quota documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/quotas
- Azure CLI `az vm list-skus` reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-list-skus
- Azure Resource Manager SKU not available troubleshooting: https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available
- Azure resource provider registration troubleshooting: https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-register-resource-provider
- Azure resource providers and types: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types

## Issues Found
- The first deployment operations query filtered on `properties.statusCode!='OK'`, which can include non-failed operations such as successful creates. Changed it to filter on `properties.provisioningState=='Failed'`, matching the deployment operations schema.
- The provider registration example said to wait for registration but only ran `az provider show`, which checks state once. Added `--wait` to `az provider register` and changed the follow-up comment to verification.
- The Complete mode example did not mention Microsoft guidance that Complete mode is not recommended and is being gradually deprecated for deletes. Added a concise warning that deployment stacks are recommended for deletion scenarios.
- The VM SKU availability query depended on `restrictions[0].type!='Location'`, which can be misleading because restrictions are an array and may be empty or contain other restriction types. Changed it to list SKUs with no restrictions for the selected location and subscription.
- The deployment history section said Azure keeps the last 800 deployments per resource group. Microsoft documents this as an 800-deployment history limit and says Azure automatically deletes old deployments as the limit is approached. Updated the wording accordingly.
- The prevention tips referred to tagging deployments with meaningful names. Changed this to using meaningful deployment names, which matches the surrounding deployment history guidance.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI references instead of local `az --help` output.
