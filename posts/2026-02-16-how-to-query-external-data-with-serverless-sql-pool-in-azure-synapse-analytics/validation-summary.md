# Validation Summary: How to Query External Data with Serverless SQL Pool in Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics serverless SQL pool
- T-SQL
- OPENROWSET
- External tables and external data sources
- Azure Data Lake Storage Gen2 and Azure Blob Storage
- Azure Cosmos DB analytical store
- Azure CLI
- Parquet, CSV, and JSON files

## Sources Consulted
- Microsoft Learn: Serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/on-demand-workspace-overview
- Microsoft Learn: How to use OPENROWSET using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Access external storage using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-storage-files-overview
- Microsoft Learn: Query Parquet files using serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-parquet-files
- Microsoft Learn: Query CSV files using serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-single-csv-file
- Microsoft Learn: Query JSON files using serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-json-files
- Microsoft Learn: Query folders and multiple files using serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-folders-multiple-csv-files
- Microsoft Learn: Use file metadata in serverless SQL pool queries - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-specific-files
- Microsoft Learn: Use external tables with Synapse SQL - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-external-tables
- Microsoft Learn: CETAS with Synapse SQL - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-cetas
- Microsoft Learn: CREATE DATABASE SCOPED CREDENTIAL (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-scoped-credential-transact-sql
- Microsoft Learn: CREATE EXTERNAL DATA SOURCE (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-external-data-source-transact-sql
- Microsoft Learn: Azure CLI az synapse workspace - https://learn.microsoft.com/en-us/cli/azure/synapse/workspace
- Microsoft Learn: Azure CLI az storage account - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI az role assignment - https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The managed identity example implied that assigning Storage Blob Data Reader to the Synapse workspace managed identity is enough for a direct URL OPENROWSET query. Microsoft documents managed identity impersonation through database-scoped credentials and external data sources for this pattern, so the example now creates a master key, a `Managed Identity` database-scoped credential, and an external data source before querying.
- The SAS credential example created a database-scoped credential without first creating a database master key. Added a master key statement with a note that it is only needed if the database does not already have one.
- The external table setup created a master key but did not create or use a credential for protected storage. Added a workspace managed identity credential and attached it to the external data source.
- Several recursive file examples used `**/*.parquet`. Microsoft documents recursive traversal by specifying `/**` at the end of the path, so those examples and the explanatory text were changed to use `/**`.
- The partitioning guidance said to filter on partition columns for folder skipping. For direct `OPENROWSET` paths, Microsoft documents targeting folders directly or using `filepath()` metadata filters. Updated the wording and example accordingly.
- The explanation said the engine reads files from Cosmos DB analytical store. Cosmos DB analytical store is external data but not a file source, so the wording now distinguishes Azure Storage files from Cosmos DB analytical store data.

## Review Notes
- The local environment does not have the Azure CLI installed, so CLI command verification was performed against the Microsoft Learn Azure CLI reference rather than local `az --help` output.
- The examples use placeholder storage account, workspace, and credential values. They are syntactically aligned with Microsoft documentation, but they still require matching storage paths, schemas, permissions, and data files in a real environment.
