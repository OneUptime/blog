# Validation Summary: How to Create Azure Data Lake Storage Gen2 with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Lake Storage Gen2
- Azure Storage Accounts
- Azure RBAC
- OpenTofu
- HashiCorp AzureRM provider
- HCL

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_storage_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_storage_data_lake_gen2_filesystem`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_data_lake_gen2_filesystem.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_storage_data_lake_gen2_path`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_data_lake_gen2_path.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_role_assignment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/role_assignment.html.markdown
- Azure Data Lake Storage ACL documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-access-control
- Azure Data Lake Storage access control model: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-access-control-model
- Azure RBAC for blob data access: https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access
- Azure Data Lake Storage Gen2 Path Create REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/datalakestoragegen2/path/create?view=rest-storageservices-datalakestoragegen2-2019-12-12
- Azure NFS 3.0 support for Blob Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/network-file-system-protocol-support

## Issues Found
- The filesystem ACL example claimed to set default ACLs for new child items, but the `ace` blocks omitted `scope = "default"`. In the AzureRM provider, `scope` defaults to `access`, which would apply access ACLs to the filesystem root instead of default ACLs for newly created files and directories. I added `scope = "default"` to each relevant `ace` block and clarified the inline comment.

## Review Notes
- The post is otherwise technically sound against current AzureRM provider and Microsoft Learn documentation.
- Azure RBAC grants coarse-grained access at storage account or container scope, while ACLs provide fine-grained path-level access. If the same principal is granted a broad blob data role such as `Storage Blob Data Contributor` at storage account or container scope, ACLs do not restrict that already-granted access.
