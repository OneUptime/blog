# Validation Summary: How to Create Azure Blob Storage Containers in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Storage Accounts
- Azure Blob Storage containers and blobs
- Azure Blob lifecycle management
- Azure Blob immutable storage
- Azure CLI

## Sources Consulted
- HashiCorp AzureRM `azurerm_storage_account` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- HashiCorp AzureRM `azurerm_storage_container` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_container.html.markdown
- HashiCorp AzureRM `azurerm_storage_blob` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_blob.html.markdown
- HashiCorp AzureRM `azurerm_storage_management_policy` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_management_policy.html.markdown
- HashiCorp AzureRM `azurerm_storage_container_immutability_policy` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_container_immutability_policy.html.markdown
- Microsoft Learn, Azure Blob lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn, Azure Blob immutable storage overview: https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview
- Microsoft Learn, Azure Storage container CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Microsoft Learn, Azure Storage container naming rules: https://learn.microsoft.com/en-us/rest/api/storageservices/Naming-and-Referencing-Containers--Blobs--and-Metadata

## Issues Found
- The post pinned AzureRM `~> 3.80` and used arguments that are deprecated or superseded in current AzureRM. Updated the provider constraint to `~> 4.72`, changed `enable_https_traffic_only` to `https_traffic_only_enabled`, and changed storage container examples to use `storage_account_id`.
- The public container example conflicted with `allow_nested_items_to_be_public = false` on the storage account. Updated the storage account setting to `true` so the `container_access_type = "blob"` example can work.
- Lifecycle management examples used `prefix_match` values with trailing slashes for whole-container policies. Updated them to the container names without trailing slashes, matching Azure lifecycle prefix rules for targeting an entire container.
- The uploads lifecycle rule comment said it deleted incomplete uploads after 7 days, but the Terraform rule deleted blobs after 90 days based on modification time. Updated the comment and rule name to describe deleting old uploads after 90 days.
- The immutability section said container immutability could be set through metadata or CLI and that AzureRM 3.x needed `azapi_resource` or a CLI provisioner. Replaced that note with the current `azurerm_storage_container_immutability_policy` resource.
- The connection-string command referenced `primary_connection_string`, but the Outputs section did not define it. Added a sensitive `primary_connection_string` output.

## Review Notes
Terraform and Azure CLI were not installed in the local environment, so syntax was checked manually against official provider and CLI documentation rather than with `terraform validate` or `az --help`.
