# Validation Summary: How to Build a Data Pipeline with Azure Data Factory and Databricks Activities

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Factory
- Azure Databricks
- Apache Spark / PySpark
- Databricks notebooks and widgets
- Azure SQL Database
- Azure Storage / ADLS Gen2 paths
- Azure Monitor metric alerts
- Azure CLI

## Sources Consulted
- Microsoft Learn: Transform data with Databricks Notebook in Azure Data Factory and Azure Synapse - https://learn.microsoft.com/en-us/azure/data-factory/transform-data-databricks-notebook
- Microsoft Learn: Compute environments supported by Azure Data Factory and Synapse pipelines - https://learn.microsoft.com/en-us/azure/data-factory/compute-linked-services
- Microsoft Learn: Copy and transform data in Azure SQL Database by using Azure Data Factory or Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-sql-database
- Microsoft Learn: Pipeline execution and triggers in Azure Data Factory and Azure Synapse - https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipeline-execution-triggers
- Microsoft Learn: Monitor Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/monitor-data-factory
- Microsoft Learn: Azure CLI az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Databricks Utilities reference - https://learn.microsoft.com/en-us/azure/databricks/dev-tools/databricks-utils

## Issues Found
- The architecture diagram showed a Copy Activity staging raw data to DBFS, but the implementation passes ABFS paths to the Databricks notebook and reads directly from storage. Updated the diagram to match the actual pipeline.
- The data quality notebook used `F.col(...)` before importing `pyspark.sql.functions as F`. Added the missing import before the quality checks.
- The data quality notebook called `dbutils.notebook.exit()` before raising an exception on failed checks, which would prevent the intended failure from being raised. Replaced that branch with a direct exception containing the failed check names.
- The Copy activity JSON omitted `inputs` and `outputs` dataset references, which are part of the documented Copy activity examples for Azure SQL Database sinks. Added dataset references for the transformed Parquet input and curated SQL output.

## Review Notes
- The snippets still use placeholder linked services, datasets, storage accounts, SQL tables, and permissions that must be created in a real ADF environment.
- The Azure CLI was not installed in the local environment, so the alert command was checked against Microsoft Learn CLI documentation rather than local `az --help` output.
