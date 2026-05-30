# Validation Summary: How to Sync Dynamics 365 Customer Data with Azure Data Lake

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Dynamics 365
- Microsoft Dataverse
- Azure Synapse Link for Dataverse
- Azure Data Lake Storage Gen2
- Azure CLI
- Azure Functions
- Dataverse Web API / OData
- Azure.Storage.Files.DataLake for .NET
- Azure Databricks / Synapse Spark
- PySpark

## Sources Consulted
- Microsoft Learn: Create an Azure Synapse Link for Dataverse with Azure Data Lake in Power Apps: https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-data-lake
- Microsoft Learn: Export Microsoft Dataverse data in Delta Lake format: https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-delta-lake
- Microsoft Learn: Important changes / Data Export Service deprecation: https://learn.microsoft.com/en-us/power-platform/important-changes-coming
- Microsoft Learn: Azure CLI `az storage account create`: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Authorize access to blob data with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Microsoft Learn: Manage blob containers using Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli
- Microsoft Learn: Dataverse Web API paging: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/page-results
- Microsoft Learn: Dataverse Web API properties and lookup properties: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-properties
- Microsoft Learn: Dataverse Web API account EntityType lookup reference: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/account
- Microsoft Learn: Azure Functions timer trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- Microsoft Learn: `DataLakeFileClient.UploadAsync`: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.files.datalake.datalakefileclient.uploadasync

## Issues Found
- The post metadata said the sync used Data Export Service. Data Export Service was deprecated in November 2021, reached end of support in November 2022, and replicated Dataverse data to Azure SQL Database rather than Azure Data Lake. Updated the tags and description to use Azure Synapse Link for Dataverse.
- The Synapse Link description overstated direct Delta/CSV export behavior. Updated it to explain that Synapse Link exports CSV data and can convert it to Delta Lake through a Synapse workspace and Spark pool.
- The Power Platform setup steps incorrectly described selecting a storage container. Updated the steps to match the current Power Apps Azure Synapse Link workflow: select the Synapse workspace, Spark pool, storage account, tables, and Delta Lake option.
- The Azure CLI container creation command omitted `--auth-mode login`. Added it to use Microsoft Entra authorization, matching current Microsoft guidance for blob data operations.
- The custom exporter selected Dataverse lookup columns as `parentcustomerid` and `parentaccountid`. Dataverse Web API lookup values are exposed as computed properties such as `_parentcustomerid_value` and `_parentaccountid_value`. Updated the C# `$select` list and the PySpark join.
- The custom exporter advanced the last export timestamp even when one or more entity exports failed, which could skip records on the next run. Added failure tracking and only advance state after all entities export successfully.
- The incremental filter used `gt`, which can skip records with the exact stored watermark timestamp. Changed it to `ge`; downstream processing should deduplicate by primary key and `modifiedon` if needed.
- The code comment said it wrote Parquet, but the implementation wrote JSON Lines. Updated the comment to match the actual output format.
- The state file writer did not create the `_state` directory before upload. Added directory creation before writing `last-export.txt`.
- The Web API response handling assumed a non-null response body. Added null-safe handling for `value` and `@odata.nextLink`.

## Review Notes
The post is technically valid after the fixes. The custom exporter is still a simplified example: production implementations should add authentication setup, retry/backoff for Dataverse throttling, schema management, idempotent merge/deduplication, and stronger GDPR controls based on the organization's retention and consent requirements.
