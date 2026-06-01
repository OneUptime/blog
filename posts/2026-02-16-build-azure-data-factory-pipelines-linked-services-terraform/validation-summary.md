# Validation Summary: How to Build Azure Data Factory Pipelines and Linked Services with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Factory
- AzureRM Terraform Provider
- Terraform HCL
- Azure Blob Storage
- Azure Data Lake Storage Gen2
- Azure SQL Database
- Azure Key Vault
- Azure RBAC

## Sources Consulted
- HashiCorp AzureRM `azurerm_data_factory` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_linked_service_azure_blob_storage` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_linked_service_azure_blob_storage.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_linked_service_azure_sql_database` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_linked_service_azure_sql_database.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_linked_service_data_lake_storage_gen2` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_linked_service_data_lake_storage_gen2.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_linked_service_key_vault` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_linked_service_key_vault.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_dataset_delimited_text` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_dataset_delimited_text.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_dataset_parquet` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_dataset_parquet.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_dataset_azure_sql_table` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_dataset_azure_sql_table.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_pipeline` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_pipeline.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_trigger_schedule` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_trigger_schedule.html.markdown
- HashiCorp AzureRM `azurerm_data_factory_trigger_blob_event` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/data_factory_trigger_blob_event.html.markdown
- Microsoft Learn, Create event-based triggers in Azure Data Factory: https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-event-trigger

## Issues Found
- The Azure SQL Database linked service described managed identity authentication but did not set `use_managed_identity`. Added `use_managed_identity = true` and kept the connection string to server/database settings.
- The delimited text dataset referenced `@dataset().folderPath` and `@dataset().fileName` without declaring those dataset parameters. Added the `parameters` block required for the dynamic path and filename expressions.
- The Parquet dataset used `azure_blob_storage_location` while the linked service and copy sink were ADLS Gen2. Changed it to `azure_blob_fs_location` with `file_system`, matching the AzureRM dataset arguments for Azure Blob Filesystem locations.
- The SQL warehouse dataset used `azurerm_data_factory_dataset_azure_blob`, which is not a SQL table dataset and does not match the Azure SQL linked service. Changed it to `azurerm_data_factory_dataset_azure_sql_table` with `linked_service_id`, `schema`, and `table`, and updated the pipeline output reference.
- The pipeline and triggers passed a `targetTable` parameter that was never consumed by the pipeline or dataset. Removed the unused parameter from the snippets to avoid implying dynamic table routing that the shown dataset did not implement.
- The Blob event trigger path omitted the required `/blobs/` segment for a container-qualified path. Changed `blob_path_begins_with` to `/raw-data/blobs/incoming/`.

## Review Notes
The examples reference supporting resources such as storage accounts, SQL server/database, and Key Vault without defining them in the post. That is acceptable for a focused tutorial, but a complete runnable Terraform module would need those resource definitions and any SQL-level permissions required by Azure SQL managed identity authentication.
