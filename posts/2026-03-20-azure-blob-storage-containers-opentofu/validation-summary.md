# Validation Summary: How to Create Azure Blob Storage Containers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Azure Blob Storage
- Azure Storage Accounts
- AzureRM provider

## Sources Consulted
- AzureRM `azurerm_storage_container` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Microsoft Learn, Configure anonymous read access for containers and blobs: https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure
- Microsoft Learn, Storage account overview: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Microsoft Learn, Naming and Referencing Containers, Blobs, and Metadata: https://learn.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
- OpenTofu `for_each` documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/

## Issues Found
- The post used `storage_account_name` in `azurerm_storage_container` resources. Current AzureRM documentation marks that argument as deprecated in favor of `storage_account_id`, so I updated all container examples to use `storage_account_id = azurerm_storage_account.storage.id`.
- The example for a public blob container relied only on `container_access_type = "blob"`. Azure requires anonymous access to be allowed at the storage-account level as well, so I added `allow_nested_items_to_be_public = true` to the storage account example to make the public-container scenario work as described.
- The post description said it covered "access tiers", but the content only covered container access levels and blob/version retention settings. I corrected the description to say "access levels" so the metadata matches the actual technical content.

## Review Notes
- The remaining HCL syntax and claims checked out against the current AzureRM and OpenTofu docs, including `blob_properties`, retention policy blocks, `for_each` usage, storage account naming rules, container naming rules, and the `primary_blob_endpoint` output pattern.
- Microsoft recommends against enabling anonymous blob access unless a workload explicitly requires it. The post now makes the required account-level setting explicit, but readers should still treat that configuration as a security-sensitive choice.
- No live `tofu plan` or Azure deployment was run as part of this review; validation was performed against current official documentation.
