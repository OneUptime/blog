# Validation Summary: How to Connect Power BI to Azure Synapse Analytics Serverless SQL Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Power BI Desktop and Power BI service
- Azure Synapse Analytics serverless SQL pools
- T-SQL
- OPENROWSET
- Azure Data Lake Storage Gen2
- Parquet, CSV, JSON, and Delta Lake files
- Microsoft Entra authentication and managed identity

## Sources Consulted
- Microsoft Learn: Use serverless SQL pool with Power BI Desktop and create a report - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/tutorial-connect-power-bi-desktop
- Microsoft Learn: How to use OPENROWSET using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Query Parquet files using serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-parquet-files
- Microsoft Learn: Best practices for serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-serverless-sql-pool
- Microsoft Learn: Create and update statistics using Azure Synapse SQL resources - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-statistics
- Microsoft Learn: Control storage account access for serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-storage-files-storage-access-control
- Microsoft Learn: Serverless SQL pool self-help - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/resources-self-help-sql-on-demand
- Microsoft Learn: Power Query Azure Synapse Analytics SQL connector - https://learn.microsoft.com/en-us/power-query/connectors/azure-sql-data-warehouse
- Microsoft Learn: DirectQuery in Power BI - https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about
- Microsoft Learn: Large semantic models in Power BI Premium - https://learn.microsoft.com/en-us/power-bi/enterprise/service-premium-large-models
- Microsoft Learn: Power BI implementation planning - data gateways - https://learn.microsoft.com/en-us/power-bi/guidance/powerbi-implementation-planning-data-gateways

## Issues Found
- The post implied JSON has a native serverless SQL pool file format like Parquet, CSV, and Delta. Updated the wording to clarify that JSON is read as delimited text and parsed with T-SQL JSON functions.
- The database scoped credential example omitted the database master key prerequisite. Added `CREATE MASTER KEY` before creating the credential.
- The `filepath()` examples were not qualified through the `OPENROWSET` alias. Updated the Parquet, aggregate, and statistics examples to use `orders.filepath(...)`.
- The Delta Lake comment said Delta supports time travel in this context. Synapse serverless SQL pool reads the current Delta version and does not support Delta time travel queries, so the comment was corrected.
- The Power BI import size limit text used fixed values that are no longer generally accurate across Fabric/Premium capacities. Replaced it with license/capacity-dependent wording.
- The file size recommendation said 100 MB to 1 GB per Parquet file. Microsoft guidance says to keep files at least 100 MB and avoid very large single files that reduce parallelism, so the recommendation was adjusted.
- The statistics example used `CREATE STATISTICS` on a view, which is not the documented approach for OPENROWSET-backed serverless SQL pool data. Replaced it with `sys.sp_create_openrowset_statistics` examples.
- The security section said Power BI passes the user identity through the connection unconditionally. Updated it to note this applies to DirectQuery when SSO is configured, and to use Power BI RLS for Import mode or non-SSO DirectQuery.
- The ADLS Gen2 ACL note only mentioned read access. Updated it to include execute access on each folder in the path.

## Review Notes
The post is technically relevant and remains a valid tutorial after the corrections. Future improvements could add explicit `WITH` schemas for `OPENROWSET` examples to avoid schema inference surprises and improve Parquet string type performance, but that is not required for correctness.
