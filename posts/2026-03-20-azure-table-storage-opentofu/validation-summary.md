# Validation Summary: How to Create Azure Table Storage with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Table Storage
- Azure Storage Accounts
- Azure RBAC
- OpenTofu
- AzureRM provider
- HCL

## Sources Consulted
- Azure Table storage overview: https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-overview
- Scalability and performance targets for Table storage: https://learn.microsoft.com/en-us/azure/storage/tables/scalability-targets
- Authorize access to tables using Microsoft Entra ID: https://learn.microsoft.com/en-us/azure/storage/tables/authorize-access-azure-active-directory
- Assign an Azure role for access to table data: https://learn.microsoft.com/en-us/azure/storage/tables/assign-azure-role-data-access
- Create a service SAS: https://learn.microsoft.com/en-us/rest/api/storageservices/create-service-sas
- AzureRM `azurerm_storage_table` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_table
- AzureRM `azurerm_storage_table_entity` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_table_entity
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- AzureRM `azurerm_storage_account` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `toset` function: https://opentofu.org/docs/language/functions/toset/

## Issues Found
- The Step 4 section was labeled as table ACLs/stored access policies, but the snippet actually created a table entity. I corrected the section heading and explanatory sentence so they match the code.
- The `azurerm_storage_table_entity` example used deprecated/removed arguments (`storage_account_name` and `table_name`). In AzureRM 4.x, the resource uses `storage_table_id`, so I updated the snippet accordingly.

## Review Notes
- The post’s overview claim that Table Storage can scale to very large datasets is directionally correct. Current Microsoft documentation lists a maximum size of 500 TiB for a single table, with the number of tables limited by storage account capacity.
- The RBAC role names used in the examples are current and valid for Microsoft Entra ID-based access to Azure Table data.
- The storage account output attributes used in the examples are valid in current AzureRM documentation, but the connection string output should remain sensitive as shown.
