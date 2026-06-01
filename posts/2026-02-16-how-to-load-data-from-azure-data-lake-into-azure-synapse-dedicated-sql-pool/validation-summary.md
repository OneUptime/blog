# Validation Summary: How to Load Data from Azure Data Lake into Azure Synapse Dedicated SQL Pool

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics dedicated SQL pool
- Azure Data Lake Storage Gen2
- T-SQL COPY INTO
- PolyBase external tables
- Synapse pipelines Copy Activity
- Azure CLI
- Dedicated SQL pool workload resource classes

## Sources Consulted
- Microsoft Learn: COPY INTO (Transact-SQL) for Azure Synapse Analytics and Microsoft Fabric, https://learn.microsoft.com/en-us/sql/t-sql/statements/copy-into-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: Use External Tables with Synapse SQL, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-external-tables
- Microsoft Learn: Tutorial - Load External Data Using a Managed Identity, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/tutorial-external-tables-using-managed-identity
- Microsoft Learn: Copy and transform data in Azure Synapse Analytics by using Azure Data Factory or Synapse pipelines, https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-sql-data-warehouse
- Microsoft Learn: Best practices for dedicated SQL pools, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-dedicated-sql-pool
- Microsoft Learn: Best practices for loading data into a dedicated SQL pool, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/data-loading-best-practices
- Microsoft Learn: Workload management with resource classes in Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/resource-classes-for-workload-management
- Microsoft Learn: Azure CLI az synapse sql pool, https://learn.microsoft.com/en-us/cli/azure/synapse/sql/pool
- Microsoft Learn: Azure CLI az storage fs file, https://learn.microsoft.com/en-us/cli/azure/storage/fs/file
- Microsoft Learn: T-SQL features in Synapse SQL pool, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/overview-features

## Issues Found
- The loading-method comparison listed "INSERT...SELECT from Serverless" as a dedicated SQL pool loading method. Serverless SQL pool is a query service over external data and does not provide regular table storage for direct INSERT loading into dedicated SQL pool, so this was changed to "Serverless SQL CETAS + COPY".
- The Parquet COPY INTO example claimed column mapping is automatic from Parquet schema/column names. Microsoft documents that COPY maps source fields to target columns by ordinal position unless automatic table creation/schema discovery is used, so the note and follow-up sentence were corrected.
- The column mapping example described handling different order but did not include field numbers. The COPY INTO column list was updated with explicit source field ordinals.
- The PolyBase database-scoped credential used `IDENTITY = 'Managed Identity'`. Microsoft documents `IDENTITY = 'Managed Service Identity'` for database-scoped credentials used by external tables, so the credential was corrected.
- The resource-class table used unsupported hardcoded memory-per-query MB values for DW1000c. Microsoft documents dynamic resource class allocation as percentages for DW1000c and higher, so the table was changed to 3%, 10%, 22%, and 70%.
- The final performance tip recommended disabling all indexes before loading. That is not a safe general recommendation for dedicated SQL pool columnstore tables, so the section was changed to post-load index maintenance guidance.

## Review Notes
The Azure CLI examples use documented command groups and parameters, but the local environment does not have Azure CLI installed, so command verification was performed against Microsoft Learn CLI documentation rather than local `az --help` output.
