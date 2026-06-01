# Validation Summary: How to Join Reference Data with Streaming Data in Azure Stream Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Stream Analytics
- Azure Stream Analytics query language
- Azure Stream Analytics reference data inputs
- Azure Blob Storage
- Azure Data Lake Storage Gen2
- Azure SQL Database
- Azure CLI

## Sources Consulted
- Microsoft Learn: Use reference data for lookups in Azure Stream Analytics: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-use-reference-data
- Microsoft Learn: Understand inputs for Azure Stream Analytics: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-add-inputs
- Microsoft Learn: Stream data as input into Azure Stream Analytics: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-define-inputs
- Microsoft Learn: Use reference data from a SQL Database for an Azure Stream Analytics job: https://learn.microsoft.com/en-us/azure/stream-analytics/sql-reference-data
- Microsoft Learn: Azure CLI az stream-analytics input reference: https://learn.microsoft.com/en-us/cli/azure/stream-analytics/input
- Microsoft Learn: Azure Stream Analytics Inputs REST API: https://learn.microsoft.com/en-us/rest/api/streamanalytics/inputs/create-or-replace

## Issues Found
- The post said Stream Analytics supports two reference data sources. Current documentation lists Azure Blob Storage, Azure Data Lake Storage Gen2, and Azure SQL Database, so the wording was updated while keeping the post focused on Blob Storage and SQL Database.
- The Azure CLI examples used unsupported top-level flags such as `--type`, `--datasource`, and `--serialization`. The documented CLI uses `--properties` with a JSON payload, so both examples were corrected.
- The SQL delta refresh example used an unsupported `@lastRefreshTime` parameter and omitted the required delta metadata columns. It was updated to use `@snapshotTime`, `@deltaStartTime`, `@deltaEndTime`, `_watermark_`, and `_operation_`, matching Microsoft guidance for temporal-table delta queries.
- A join query comment incorrectly mentioned `DATEDIFF` even though reference data joins do not require a temporal window. The comment was corrected.
- The size limit section stated simple 5 GB limits by source. It was updated to reflect Microsoft guidance: less than 300 MB for best performance, up to 5 GB with six or more streaming units, and smaller recommended sizes for one or three streaming units.
- The multiple-reference-join example directly joined two reference inputs in one query. Microsoft documentation says multiple reference datasets should be joined in multiple steps, so the example was rewritten with a `WITH` step.

## Review Notes
The `az` CLI was not installed locally, so live `az --help` verification was not possible. CLI syntax was validated against the current Microsoft Learn Azure CLI reference and the Stream Analytics REST API schema.
