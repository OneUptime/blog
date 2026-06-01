# Validation Summary: How to Connect Power BI to Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Synapse Analytics dedicated SQL pool
- Azure Synapse Analytics serverless SQL pool
- Power BI Desktop
- Power BI Service
- Power Query Azure Synapse Analytics connector
- Azure CLI
- T-SQL

## Sources Consulted
- Microsoft Learn: Connect to Synapse SQL - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/connect-overview
- Microsoft Learn: Power Query Azure Synapse Analytics (SQL DW) connector - https://learn.microsoft.com/en-sg/power-query/connectors/azure-sql-data-warehouse
- Microsoft Learn: DirectQuery in Power BI - https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about
- Microsoft Learn: Serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/on-demand-workspace-overview
- Microsoft Learn: Cost management for serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/data-processed
- Microsoft Learn: CREATE MATERIALIZED VIEW AS SELECT (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-materialized-view-as-select-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: Performance tuning with result set caching - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/performance-tuning-result-set-caching
- Microsoft Learn: Linking a Power BI workspace to a Synapse workspace - https://learn.microsoft.com/en-us/azure/synapse-analytics/quickstart-power-bi
- Microsoft Learn: Power BI Datasets Refresh Dataset REST API - https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/refresh-dataset
- Microsoft Learn: Power BI Push Datasets REST API - https://learn.microsoft.com/en-us/rest/api/power-bi/push-datasets

## Issues Found
- The DirectQuery data volume limit was listed as "No limit." Updated it to "Source/query limits apply" because Power BI DirectQuery has documented query and intermediate result limits, even though it does not import source data.
- The dedicated SQL pool aggregation query grouped by the raw order date while selecting `CAST(f.OrderDate AS DATE)`. Updated the `GROUP BY` expression to match the selected date grain.
- The serverless SQL pool view used unqualified column references across joined `OPENROWSET` sources. Qualified the selected and grouped columns with `sales` and `customers` aliases to avoid ambiguity and make the T-SQL reliable.
- The Power BI refresh API sentence said Synapse pipelines could "push data" into Power BI datasets using the refresh API. Updated it to say the refresh API triggers dataset refreshes; pushing rows uses separate push dataset APIs.
- The materialized view example used unqualified columns and grouped by the raw date column. Qualified the selected columns and grouped by `CAST(f.OrderDate AS DATE)` to match the intended aggregation grain.

## Review Notes
The Azure CLI command could not be tested locally because the Azure CLI is not installed in this environment, but the command shape and query target are consistent with Azure Synapse workspace endpoint metadata usage. The article still uses the term "dataset," which remains common in Microsoft API and Synapse linked service documentation even though Power BI documentation increasingly uses "semantic model."
