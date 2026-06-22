# Validation Summary: How to Fix 'Resource Not Found' Errors in Azure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Resource Manager
- Azure CLI
- Azure resource groups and resources
- Azure Key Vault soft delete
- Azure Storage account recovery
- Azure App Configuration soft delete
- Terraform AzureRM references
- Bash scripting

## Sources Consulted
- Microsoft Learn: Azure CLI `az account` reference, https://learn.microsoft.com/en-us/cli/azure/account
- Microsoft Learn: Azure CLI `az group` reference, https://learn.microsoft.com/en-us/cli/azure/group
- Microsoft Learn: Azure CLI `az resource` reference, https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: Azure CLI `az deployment group` reference, https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: Azure CLI `az keyvault` reference, https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Azure CLI `az appconfig` reference, https://learn.microsoft.com/en-us/cli/azure/appconfig
- Microsoft Learn: Recover a deleted storage account, https://learn.microsoft.com/en-us/azure/storage/common/storage-account-recover
- Microsoft Learn: Azure Resource Manager frequently asked questions, https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/frequently-asked-questions
- Microsoft Learn: Azure CLI `az monitor activity-log` reference, https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- HashiCorp Terraform Registry: `azurerm_resource_group` and `azurerm_virtual_network` resources, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- The resource group typo section said case sensitivity can matter for resource group lookup. Azure Resource Manager treats resource group names as case-insensitive, although returned casing can differ. Updated the note and example accordingly.
- The storage account recovery section used `az storage account list` under a comment saying it checks whether an account was recently deleted. That command lists active storage accounts, not deleted accounts. Updated the comment to say it confirms no active account has the name, and clarified that deleted storage account recovery is done from the Azure portal and may be possible within 14 days.
- The cross-region section implied normal ARM lookups fail when using the wrong region and paired that with `az appconfig show`, which does not take a location parameter. Updated the explanation to clarify that subscription/resource group/name drive ordinary ARM lookups and that location mainly matters for location-scoped operations such as some deleted-resource recovery commands.

## Review Notes
Azure CLI was not installed in the local workspace, so command validation was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help`. The diagnostic Bash script is useful for trusted inputs, but future hardening could escape user-supplied values before embedding them in JMESPath queries.
