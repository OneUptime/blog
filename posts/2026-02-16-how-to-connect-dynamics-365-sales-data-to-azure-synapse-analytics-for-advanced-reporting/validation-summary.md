# Validation Summary: How to Connect Dynamics 365 Sales Data to Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dynamics 365 Sales
- Microsoft Dataverse
- Azure Synapse Link for Dataverse
- Azure Data Lake Storage Gen2
- Azure Synapse Analytics
- Synapse serverless SQL pool
- Synapse dedicated SQL pool
- Azure CLI
- Power BI
- SQL
- DAX

## Sources Consulted
- Microsoft Learn: Export Microsoft Dataverse data in Delta Lake format - https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-delta-lake
- Microsoft Learn: Create an Azure Synapse Link for Dataverse with Azure Data Lake in Power Apps - https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-data-lake
- Microsoft Learn: Query and analyze incremental updates with Azure Synapse Link for Dataverse - https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-incremental-updates
- Microsoft Learn: Read Dataverse data incremental updates - https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-incremental
- Microsoft Learn: How to use OPENROWSET in serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Visualize Azure Synapse Link for Dataverse data with Power BI - https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-powerbi
- Microsoft Learn: Cost management for serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/data-processed
- Microsoft Learn: Azure CLI az storage account create - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI az synapse workspace create - https://learn.microsoft.com/en-us/cli/azure/synapse/workspace
- Microsoft Learn: Connect to Synapse SQL endpoint - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/get-started-ssms

## Issues Found
- The post implied Azure Synapse Link always exports Dataverse tables directly in Delta Lake format. Updated it to clarify that Delta Lake output requires enabling the Delta Lake option and provisioning a Synapse Spark pool for conversion.
- The setup instructions pointed to the Power Platform admin center and said the link could be set up programmatically with the shown CLI. Updated the flow to use Power Apps for the Synapse Link profile and clarified that the CLI snippet provisions Azure prerequisites only.
- The latency claim gave a fixed 15-30 minute lag. Replaced it with the documented configurable incremental interval model and noted the 5-minute minimum plus additional Delta conversion processing time.
- The SQL examples queried `*.parquet` paths with `FORMAT = 'DELTA'` from the container root. Updated the external data source to point at the `deltalake` folder and query table-level Delta folders.
- The sales rep performance view joined `systemuser.teamid` to `team.teamid`, which is not a reliable Dataverse user-to-team relationship. Changed the example to group users by `businessunit`, using `systemuser.businessunitid`.
- The monthly revenue DAX measure referenced `vw_MonthlyRevenueTrend[Date]`, but the SQL view did not define a `Date` column. Added `MonthStartDate` to the SQL view and updated the DAX measure to use it.
- The data freshness query used `sys.external_tables.last_modified`, which does not represent Dataverse export freshness. Replaced it with a freshness check based on the exported `SinkModifiedOn` column.
- The cost section recommended partitioning data when creating materialized views in the serverless SQL pool context. Replaced that with filtering on date columns and partitioned folders where available, and materializing results in a dedicated SQL pool when justified.

## Review Notes
The examples still assume representative Dataverse logical column names and may need minor adjustment for customized Dynamics 365 environments, especially where lookup columns or option-set labels are customized. For production Power BI models, a separate calendar table is usually preferable for year-over-year DAX calculations.
