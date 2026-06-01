# Validation Summary: How to Create Power BI Reports from Azure Data Lake Storage Gen2 Parquet Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Power BI Desktop and Power Query
- Azure Data Lake Storage Gen2
- Parquet
- Azure Synapse serverless SQL pool
- Databricks SQL and Unity Catalog
- DAX

## Sources Consulted
- Microsoft Learn: Azure Data Lake Storage Gen2 Power Query connector: https://learn.microsoft.com/en-us/power-query/connectors/data-lake-storage
- Microsoft Learn: AzureStorage.DataLake Power Query M function: https://learn.microsoft.com/en-us/powerquery-m/azurestorage-datalake
- Microsoft Learn: Power Query Parquet connector: https://learn.microsoft.com/en-us/power-query/connectors/parquet
- Microsoft Learn: Power Query M Date.AddMonths: https://learn.microsoft.com/en-us/powerquery-m/date-addmonths
- Microsoft Learn: Power Query M DateTime.LocalNow: https://learn.microsoft.com/en-us/powerquery-m/datetime-localnow
- Microsoft Learn: Azure Synapse serverless SQL pool OPENROWSET: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Query Parquet files using serverless SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-parquet-files
- Microsoft Learn: Best practices for serverless SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-serverless-sql-pool
- Microsoft Learn: Power Query Azure Synapse Analytics SQL connector: https://learn.microsoft.com/en-us/power-query/connectors/azure-sql-data-warehouse
- Microsoft Learn: Power BI large semantic models: https://learn.microsoft.com/en-us/power-bi/enterprise/service-premium-large-models
- Microsoft Learn: Connect Power BI Desktop to Azure Databricks: https://learn.microsoft.com/en-us/azure/databricks/partners/bi/power-bi-desktop
- Microsoft Learn: Azure Databricks CREATE TABLE USING syntax: https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/sql-ref-syntax-ddl-create-table-using

## Issues Found
- The Power Query connection example used a subfolder URL for `AzureStorage.DataLake`. Current Microsoft documentation notes ADLS Gen2 connector limitations around subfolder and file paths, so the example was changed to connect at the container level and filter the `processed` folder in Power Query.
- The Power BI semantic model size wording said "up to 400 GB for Premium" as a blanket limit. Microsoft documentation makes this dependent on Premium/Fabric capacity settings and SKU, so the wording was generalized while preserving the 1 GB Pro limit.
- The Synapse serverless SQL section presented the approach as universally recommended for production. Microsoft best practices caution that complex queries or large DirectQuery workloads may not provide an interactive experience, so the wording was narrowed to a common production approach that requires performance testing.
- The Synapse SQL example used `filepath(1)` and `filepath(2)` without qualifying them with the `OPENROWSET` alias. Official examples use the alias form, so these were changed to `sales.filepath(1)` and `sales.filepath(2)`.
- The Synapse SQL example did not account for Parquet string collation guidance. Added `ALTER DATABASE CURRENT COLLATE Latin1_General_100_BIN2_UTF8;` to align with Microsoft guidance for Parquet string compatibility and pruning.
- The Databricks SQL example described creating a table over Parquet files but used `USING DELTA`. Since the files are Parquet and not necessarily a Delta table with a transaction log, this was changed to `USING PARQUET`.

## Review Notes
The post is technically relevant and accurate after the corrections above. Future improvements could mention Unity Catalog external location/storage credential requirements for external cloud paths and clarify that DirectQuery performance depends heavily on model design, query complexity, and file layout.
