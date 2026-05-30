# Validation Summary: How to Use Azure Cosmos DB Table API as a Replacement for Azure Table Storage

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Cosmos DB for Table
- Azure Table Storage
- Azure CLI
- Azure.Data.Tables for .NET
- azure-data-tables for Python
- Azure Cosmos DB Data Migration Tool
- Azure Data Factory

## Sources Consulted
- Microsoft Learn: Azure Table Storage support in Azure Cosmos DB for Table - https://learn.microsoft.com/en-us/azure/cosmos-db/table/support
- Microsoft Learn: Frequently asked questions about Azure Cosmos DB for Table - https://learn.microsoft.com/en-ca/azure/cosmos-db/table/faq
- Microsoft Learn: Azure Cosmos DB account naming requirements - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-create-account
- Microsoft Learn: Azure CLI `az cosmosdb` reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn: Azure CLI `az cosmosdb table` reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/table
- Microsoft Learn: Get started with Azure Cosmos DB for Table using .NET - https://learn.microsoft.com/en-us/azure/cosmos-db/table/how-to-dotnet-get-started
- Microsoft Learn: Azure Tables client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/data-tables-readme
- Microsoft Learn: Azure Cosmos DB Data Migration Tool - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-migrate-desktop-tool
- Microsoft Learn: Azure Data Factory Azure Table Storage connector - https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-table-storage
- Microsoft Learn: Azure Cosmos DB request unit planning - https://learn.microsoft.com/en-us/azure/cosmos-db/plan-manage-costs

## Issues Found
- The post described Azure Table Storage as having no global distribution. Updated this to limited global distribution because Table Storage supports a single primary region with an optional readable secondary region.
- The comparison table listed 20,000 operations per second as a Table Storage partition limit. Corrected it to 20,000 transactions per second per storage account and 2,000 entities per second per partition.
- The comparison table listed Azure Table Storage consistency as simply eventual and availability as 99.9%. Corrected this to strong consistency in the primary region, eventual consistency in the secondary region, and 99.99% availability.
- The Cosmos DB account name examples used uppercase characters, which are not valid for Cosmos DB account names. Updated `myTableAccount` to `mytableaccount` everywhere.
- The .NET snippets used `ETag` without showing the `Azure` namespace import. Added `using Azure;`.
- The .NET insert example said `UpsertEntityAsync` inserts or replaces, but the default SDK behavior is merge. Updated the comment to insert or merge.
- The AzCopy migration option was not a valid Table Storage to Cosmos DB Table API migration example. Replaced it with the Azure Cosmos DB Data Migration Tool container workflow.
- The Azure Data Factory sink description implied a dedicated Cosmos DB Table API linked service. Updated it to use ADF for extracting Table Storage data to files, then load those files with the Data Migration Tool or a custom script.
- The batch operation note incorrectly said Cosmos DB Table API has a 100-operation batch limit. Updated the section to distinguish Table Storage's 100-operation/4 MB entity group transaction limit from Cosmos DB Table API's 2 MB batch limit.
- Added documented Cosmos DB Table API migration caveats for practical entity-size limits, query result ordering, RowKey length, and case-sensitive table names.

## Review Notes
The code examples use current Azure Tables SDK APIs for .NET and Python. RU estimates remain approximate and should be measured for a real workload because query and write costs depend on entity size, indexing, consistency level, and query shape.
