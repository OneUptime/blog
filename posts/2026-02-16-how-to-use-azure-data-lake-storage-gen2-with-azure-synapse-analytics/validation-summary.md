# Validation Summary: How to Use Azure Data Lake Storage Gen2 with Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics
- Azure Data Lake Storage Gen2
- Azure CLI
- Synapse serverless SQL pool
- Synapse dedicated SQL pool
- Synapse Spark / PySpark
- Synapse pipelines and linked services
- T-SQL external tables and OPENROWSET
- Managed identities and Azure RBAC
- Managed private endpoints

## Sources Consulted
- Microsoft Learn: `az synapse workspace create` CLI reference: https://learn.microsoft.com/en-us/cli/azure/synapse/workspace?view=azure-cli-latest#az-synapse-workspace-create
- Microsoft Learn: `az synapse managed-private-endpoints create` CLI reference: https://learn.microsoft.com/en-us/cli/azure/synapse/managed-private-endpoints?view=azure-cli-latest#az-synapse-managed-private-endpoints-create
- Microsoft Learn: Grant permissions to workspace managed identity: https://learn.microsoft.com/en-us/azure/synapse-analytics/security/how-to-grant-workspace-managed-identity-permissions
- Microsoft Learn: Quickstart create Synapse workspace: https://learn.microsoft.com/en-us/azure/synapse-analytics/get-started-create-workspace
- Microsoft Learn: OPENROWSET in serverless SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Access external storage using serverless SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-storage-files-overview
- Microsoft Learn: Query Parquet files using serverless SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-parquet-files
- Microsoft Learn: Use file metadata in Synapse SQL queries: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-specific-files
- Microsoft Learn: Use external tables with Synapse SQL: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-external-tables
- Microsoft Learn: Securely load data using Synapse SQL COPY: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/quickstart-bulk-load-copy-tsql-examples
- Microsoft Learn: Azure Data Lake Storage Gen2 connector for Azure Synapse pipelines: https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-data-lake-storage
- Microsoft Learn: Microsoft Spark utilities / ADLS Gen2 access from Synapse Spark: https://learn.microsoft.com/azure/synapse-analytics/spark/microsoft-spark-utilities
- Microsoft Learn: Managed private endpoints in Azure Synapse: https://learn.microsoft.com/en-us/azure/synapse-analytics/security/synapse-workspace-managed-private-endpoints

## Issues Found
- The default storage description implied that no access setup was needed for primary ADLS Gen2 storage. Updated it to clarify that the workspace uses the primary storage for Spark tables and Spark application logs, and that the workspace managed identity still needs appropriate storage RBAC permissions.
- The partitioned data example said Synapse reads partition structure from the folder hierarchy. Updated the comment to state the precise behavior: `filepath()` exposes values matched by wildcards in the `OPENROWSET` path.
- The managed private endpoint CLI example used unsupported `--resource-id` and `--group-id` flags. Updated it to create a JSON definition containing `privateLinkResourceId` and `groupId`, then pass it with the required `--file` option.

## Review Notes
Azure CLI was not installed in the local environment, so CLI command validation was performed against current Microsoft Learn CLI reference pages. The post's remaining SQL, Spark, linked service, COPY INTO, and performance guidance matched current Microsoft documentation at the level of detail used in the article.
