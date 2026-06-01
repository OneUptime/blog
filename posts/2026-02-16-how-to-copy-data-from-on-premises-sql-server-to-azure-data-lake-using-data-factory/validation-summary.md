# Validation Summary: How to Copy Data from On-Premises SQL Server to Azure Data Lake

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Factory
- Azure Data Lake Storage Gen2
- SQL Server
- Self-hosted Integration Runtime
- ADF linked services, datasets, pipelines, Copy activity, Lookup activity, and Stored Procedure activity
- Parquet

## Sources Consulted
- Microsoft Learn: SQL Server connector for Azure Data Factory and Synapse pipelines: https://learn.microsoft.com/en-us/azure/data-factory/connector-sql-server
- Microsoft Learn: Azure Data Lake Storage Gen2 connector for Azure Data Factory and Synapse pipelines: https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-data-lake-storage
- Microsoft Learn: Parquet format in Azure Data Factory and Synapse Analytics: https://learn.microsoft.com/en-us/azure/data-factory/format-parquet
- Microsoft Learn: Lookup activity in Azure Data Factory and Synapse Analytics: https://learn.microsoft.com/en-us/azure/data-factory/control-flow-lookup-activity
- Microsoft Learn: Stored Procedure activity in Azure Data Factory and Synapse Analytics: https://learn.microsoft.com/en-us/azure/data-factory/transform-data-using-stored-procedure
- Microsoft Learn: Create and configure a self-hosted integration runtime: https://learn.microsoft.com/en-us/azure/data-factory/create-self-hosted-integration-runtime

## Issues Found
- The ADF examples were labeled as JSON but contained JavaScript-style comments. I removed the comments from the JSON blocks so the snippets are valid JSON.
- The SQL Server linked service used a legacy connection-string style while current Microsoft documentation recommends explicit `server`, `database`, `authenticationType`, `encrypt`, `trustServerCertificate`, `userName`, and `password` properties. I updated the example to the recommended shape.
- The ADLS Gen2 linked service text recommended managed identity but the snippet used an account key. I changed the snippet to system-assigned managed identity style and added the required access grant note.
- The SQL Server source type used `SqlServerSource`, but current connector documentation uses `SqlSource`. I updated the full-load, incremental-load, lookup, and partitioning examples.
- The SQL Server dataset used the backward-compatible `tableName` property. I changed it to the recommended `schema` and `table` properties.
- The incremental pipeline referenced `ds_sql_watermark`, which the post never defined. I changed the lookup to reuse the SQL Server dataset with a query override.
- The incremental pipeline called `usp_UpdateWatermark` without defining it. I added a minimal `CREATE OR ALTER PROCEDURE` example and batch separators.
- The Stored Procedure activity was missing the required `linkedServiceName`. I added the SQL Server linked service reference.
- The partitioned-read example used `partitionOption`, but the documented property is `partitionOptions`. I corrected the property name.
- The prerequisites omitted the Java runtime requirement for writing Parquet through a self-hosted IR. I added that requirement.

## Review Notes
The examples are now technically aligned with current Azure Data Factory documentation and the JSON snippets parse as valid JSON. The article still uses compact illustrative pipeline definitions rather than deploy-ready ARM templates, which is acceptable for a walkthrough.
