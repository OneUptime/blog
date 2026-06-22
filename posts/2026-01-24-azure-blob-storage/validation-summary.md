# Validation Summary: How to Handle Azure Blob Storage

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Blob Storage
- Azure Storage accounts and containers
- Azure CLI
- Terraform AzureRM provider
- Azure Storage Blob SDK for Python
- Shared Access Signatures (SAS)
- Managed identities and Azure RBAC
- Azure Blob lifecycle management policies
- Azure Storage static website hosting
- AzCopy
- Azure Monitor diagnostic settings and KQL

## Sources Consulted
- Azure Blob Storage access tiers: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Azure CLI storage account commands: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI storage container commands: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Azure CLI storage blob commands: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Azure CLI blob service properties commands: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties
- Terraform AzureRM `azurerm_storage_account` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform AzureRM `azurerm_storage_container` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- AzureRM provider version history for `azurerm_storage_container` `storage_account_id`: https://learn.microsoft.com/en-us/azure/developer/terraform/provider-version-history-azurerm-4-0-0-to-current
- Azure Storage Blob SDK for Python overview and API reference: https://learn.microsoft.com/en-us/python/api/overview/azure/storage-blob-readme
- Azure Storage Blob SDK for Python upload guide: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload-python
- Azure Storage Blob SDK for Python transfer tuning: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-tune-upload-download-python
- Azure Storage Blob SDK for Python SAS guide: https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-create-python
- Azure Blob Storage lifecycle policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure Blob Storage lifecycle policy configuration: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure
- Static website hosting in Azure Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to
- AzCopy v10 documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10
- AzCopy sync documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize
- Azure Blob Storage monitoring: https://learn.microsoft.com/en-us/azure/storage/blobs/monitor-blob-storage
- Azure Monitor diagnostic settings CLI: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure Monitor `StorageBlobLogs` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/storagebloblogs

## Issues Found
- The architecture diagram grouped containers under Hot/Cool/Archive tiers, which is misleading because access tiers apply to storage account defaults and individual block blobs, not containers. Updated the diagram to show containers separately and tier transitions as blob access tier changes.
- The Terraform `azurerm_storage_container` examples used `storage_account_name`, which is deprecated in current AzureRM provider versions in favor of `storage_account_id`. Updated both container resources to use `storage_account_id`.
- The Python SAS generation example used `os.getenv()` without importing `os` and used naive `datetime.utcnow()`. Added the missing import and switched to timezone-aware UTC with `datetime.now(timezone.utc)`.
- The lifecycle policy `prefixMatch` example was reviewed against Azure's requirement that prefixes start with a container name. The example was adjusted to use container-qualified prefixes.
- The static website CLI example used `--static-website` without an explicit boolean value. Updated it to `--static-website true`, matching the documented Azure CLI examples.
- The Python large upload example passed `max_single_put_size` and `max_block_size` to `upload_blob()`, but these transfer size settings are configured during client construction; `upload_blob()` accepts `max_concurrency`. Updated the example to create a tuned `BlobServiceClient` and pass only `max_concurrency` to `upload_blob()`.
- The AzCopy examples referenced `data` and `uploads` containers that were not created earlier in the post. Updated the URLs to use the existing `documents` container.
- The monitoring section used classic Storage Analytics logging and metrics commands while the KQL examples depend on Azure Monitor resource logs. Replaced the snippet with `az monitor diagnostic-settings create` targeting `blobServices/default`, routing StorageRead/StorageWrite/StorageDelete logs and Transaction metrics to a Log Analytics workspace with resource-specific tables.

## Review Notes
The post remains a broad practical guide rather than a complete production module. Some examples still assume pre-existing Azure resources or permissions, such as a managed identity named `myapp-identity`, a Log Analytics workspace named `storage-logs`, and suitable RBAC assignments for Azure CLI/AzCopy operations.
