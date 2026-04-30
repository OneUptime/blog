# Validation Summary: How to Import Azure Storage Accounts into OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Microsoft Azure Storage Accounts
- Azure CLI
- HCL

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- Azure CLI `az storage account` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Azure CLI `az storage account blob-service-properties` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties?view=azure-cli-latest
- Azure CLI `az storage container` reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Azure Storage container operations with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli
- AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM `azurerm_storage_container` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- AzureRM `azurerm_storage_queue` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue
- AzureRM `azurerm_storage_management_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy

## Issues Found
- The storage account example used the outdated `enable_https_traffic_only` argument. I changed it to `https_traffic_only_enabled` to match the current AzureRM resource schema.
- The storage container examples used deprecated `storage_account_name` arguments. I changed them to `storage_account_id`, which is the current preferred argument in AzureRM.
- The container import examples used blob endpoint URLs and described them as composite IDs. Current AzureRM documentation requires the full Resource Manager ID for `azurerm_storage_container`, so I replaced both imports with ARM IDs and corrected the explanation.
- The storage queue example used deprecated `storage_account_name`. I changed it to `storage_account_id`.
- The queue import example used a queue endpoint URL. With `storage_account_id`, current AzureRM documentation requires the full Resource Manager ID, so I replaced the import ID accordingly.
- The `az storage container list` example omitted an authentication mode even though current Azure CLI documentation requires storage authentication parameters for this command. I added `--auth-mode login`.
- The conclusion incorrectly stated that containers and queues import via endpoint URLs. I corrected it to reflect the Resource Manager ID-based imports used in the updated examples.

## Review Notes
- OpenTofu configuration-driven `import` blocks are valid for this post, but current OpenTofu documentation still marks this workflow as experimental.
