# Validation Summary: How to Create Azure Data Factory with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- AzureRM provider
- Azure Data Factory
- Azure SQL Database
- Azure Blob Storage
- Azure Key Vault
- Snowflake

## Sources Consulted
- AzureRM `azurerm_data_factory` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/data_factory.html.markdown
- AzureRM `azurerm_data_factory_linked_service_azure_sql_database` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/data_factory_linked_service_azure_sql_database.html.markdown
- AzureRM `azurerm_data_factory_linked_service_azure_blob_storage` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/data_factory_linked_service_azure_blob_storage.html.markdown
- AzureRM `azurerm_data_factory_linked_service_key_vault` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/data_factory_linked_service_key_vault.html.markdown
- AzureRM `azurerm_data_factory_linked_custom_service` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/data_factory_linked_custom_service.html.markdown
- AzureRM `azurerm_data_factory_integration_runtime_azure` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/data_factory_integration_runtime_azure.html.markdown
- AzureRM `azurerm_role_assignment` docs (v3.85.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.85.0/website/docs/r/role_assignment.html.markdown
- Managed virtual network and managed private endpoints - Azure Data Factory: https://learn.microsoft.com/en-us/azure/data-factory/managed-virtual-network-private-endpoint
- Copy and transform data in Azure SQL Database - Azure Data Factory & Azure Synapse: https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-sql-database
- Copy and transform data in Azure Blob Storage - Azure Data Factory & Azure Synapse: https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-blob-storage
- Copy and transform data in Snowflake V2 - Azure Data Factory & Azure Synapse: https://learn.microsoft.com/en-us/azure/data-factory/connector-snowflake
- Copy and transform data in Snowflake V1 - Azure Data Factory & Azure Synapse: https://learn.microsoft.com/en-us/azure/data-factory/connector-snowflake-legacy
- Store credentials in Azure Key Vault - Azure Data Factory: https://learn.microsoft.com/en-us/azure/data-factory/store-credentials-in-key-vault

## Issues Found
- The Snowflake linked service example used the legacy `Snowflake` connector shape. Microsoft documents Snowflake V1 as a legacy/removal-stage connector, so I updated the example to `SnowflakeV2` and changed the JSON properties to the current `accountIdentifier`/`database`/`warehouse`/`authenticationType`/`user` form.
- The Snowflake example referenced `KeyVaultLinkedService` without defining it. I added an `azurerm_data_factory_linked_service_key_vault` resource so the Azure Key Vault secret reference is valid.
- The Azure integration runtime example enabled a managed virtual network on the factory but did not provision the Azure IR inside that managed virtual network. I added `virtual_network_enabled = true` so the example matches Microsoft’s managed-network guidance.
- The Azure SQL Database managed identity example did not mention the required Azure SQL prerequisites. I added a note that the SQL server needs a Microsoft Entra admin and that the Data Factory managed identity must exist as a contained database user.
- The Azure Blob Storage managed identity example omitted `storage_kind`. I set it to `StorageV2`, which aligns with current Microsoft guidance for managed identity and data flow scenarios.
- The Key Vault IAM example implicitly assumed Azure RBAC authorization on the vault. I clarified that the `Key Vault Secrets User` role assignment applies when the vault uses Azure RBAC.

## Review Notes
- The post pins `azurerm` to `~> 3.85`. I verified the example arguments against the AzureRM 3.85 documentation and spot-checked that the same arguments still exist in current 4.x provider docs. The pin is older than the current major release, but the corrected examples remain valid for that provider line.
- I could not run `tofu` or `terraform` locally for an automated parse/validate pass because neither binary is installed in this environment.
