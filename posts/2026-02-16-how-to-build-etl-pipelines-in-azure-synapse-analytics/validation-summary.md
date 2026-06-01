# Validation Summary: How to Build ETL Pipelines in Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics
- Synapse Pipelines
- Azure Data Factory pipeline concepts
- Azure Data Lake Storage Gen2
- Dedicated SQL pool
- Mapping Data Flows
- Apache Spark / PySpark
- Parquet
- Delta Lake
- Azure Monitor
- Azure CLI

## Sources Consulted
- Microsoft Learn: Linked services in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/concepts-linked-services?tabs=synapse-analytics
- Microsoft Learn: Pipelines and activities in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipelines-activities
- Microsoft Learn: Mapping data flows - https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-overview
- Microsoft Learn: Data loading strategies for dedicated SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/design-elt-data-loading
- Microsoft Learn: COPY INTO (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/copy-into-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: T-SQL features in Synapse SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/overview-features
- Microsoft Learn: Use external tables with Synapse SQL - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-external-tables
- Microsoft Learn: Create tumbling window triggers - https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-tumbling-window-trigger
- Microsoft Learn: Monitor pipeline runs using Synapse Studio - https://learn.microsoft.com/en-us/azure/synapse-analytics/monitoring/how-to-monitor-pipeline-runs
- Microsoft Learn: Supported metrics for Microsoft.Synapse/workspaces - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-synapse-workspaces-metrics
- Microsoft Learn: Azure CLI az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI az monitor activity-log alert - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert

## Issues Found
- The linked service JSON snippet placed `type` and `typeProperties` at the top level. Updated it to use the documented linked-service artifact shape with a `properties` object.
- The incremental SQL example inserted the pipeline timestamp expression without SQL quoting or conversion. Updated the predicate to convert the substituted ISO timestamp with `CONVERT(datetime2, ..., 127)`.
- The transformation and load examples mixed Delta Lake output with direct loading into dedicated SQL pool. Dedicated SQL pool supports Parquet but not Delta Lake format, so the transformation example now writes Parquet and the load section refers to Parquet files.
- The pipeline parameter example used `@utcnow()` as a parameter default value. Replaced it with a literal default date and left expression use in activity settings.
- The tumbling window trigger JSON mixed a trigger name with the properties-only shape. Updated it to the documented artifact JSON shape and included the pipeline reference.
- The alert example used an activity-log alert for pipeline failures. Updated it to use the Synapse workspace `IntegrationPipelineRunsEnded` metric with the Azure CLI metric-alert command.
- The Delta Lake best practice did not mention dedicated SQL pool limitations. Added a caveat that dedicated SQL pool loads need a Parquet snapshot or export.

## Review Notes
The post remains a technically relevant Synapse ETL tutorial. Azure documentation now points new data integration users toward Data Factory in Microsoft Fabric, but the Synapse pipeline functionality described in the post is still documented for Azure Synapse Analytics.
