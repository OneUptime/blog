# Validation Summary: How to Set Up Azure Storage Replication with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Storage
- Azure Storage redundancy options
- Azure Storage object replication
- OpenTofu
- AzureRM provider
- HCL

## Sources Consulted
- Microsoft Learn, Azure Storage redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy-zrs
- Microsoft Learn, change how a storage account is replicated: https://learn.microsoft.com/en-us/azure/storage/common/redundancy-migration
- Microsoft Learn, object replication overview: https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview
- Microsoft Learn, configure object replication: https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure
- HashiCorp AzureRM provider docs, `azurerm_storage_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- HashiCorp AzureRM provider docs, `azurerm_storage_object_replication`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_object_replication.html.markdown
- HashiCorp AzureRM provider docs, `azurerm_storage_container`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_container.html.markdown
- OpenTofu docs, `contains` function: https://opentofu.org/docs/v1.8/language/functions/contains/

## Issues Found
- The overview said replication types were easy to "switch", but Azure redundancy changes are constrained and some provider changes force recreation or require migration. I corrected the sentence to avoid implying seamless in-place switching.
- Step 2 was labeled as GRS while the code actually used `RAGRS`, which is RA-GRS in Azure terminology. I renamed the section and clarified that `RAGRS` is the provider value for RA-GRS.
- Step 2 included `cross_tenant_replication_enabled = false` with a comment implying it enabled secondary read access. That argument controls cross-tenant object replication policy behavior, not RA-GRS secondary endpoint access, so I removed it.
- Step 3 was labeled as GZRS while the code used `RAGZRS`, which is RA-GZRS in Azure terminology. I renamed the section and clarified the comment.
- The object replication example referenced `azurerm_storage_container.src_container` and `azurerm_storage_container.dst_container` without defining those resources. I added the missing container resources using the current `storage_account_id` argument.
- The object replication intro and prefix comment were slightly ambiguous. I clarified that the example is for block blobs and that the prefix filter replicates blobs whose names begin with the specified prefix.

## Review Notes
- ZRS, GZRS, and RA-GZRS availability depends on Azure region and storage account type support.
- AzureRM supports `LRS`, `GRS`, `RAGRS`, `ZRS`, `GZRS`, and `RAGZRS` as `account_replication_type` values, while Azure prose documentation refers to the read-access options as RA-GRS and RA-GZRS.
