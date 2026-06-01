# Validation Summary: How to Read and Write Delta Lake Tables in Azure Databricks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Delta Lake
- Azure Databricks
- Apache Spark
- PySpark DataFrame API
- Databricks SQL
- Delta Lake MERGE, time travel, RESTORE, OPTIMIZE, VACUUM, schema evolution

## Sources Consulted
- Microsoft Learn: What is Delta Lake in Azure Databricks? https://learn.microsoft.com/en-us/azure/databricks/delta/
- Microsoft Learn: Tutorial - Create and manage Delta Lake tables https://learn.microsoft.com/en-us/azure/databricks/delta/tutorial
- Microsoft Learn: Work with Delta Lake table history https://learn.microsoft.com/en-us/azure/databricks/delta/history
- Microsoft Learn: Update Delta Lake table schema https://learn.microsoft.com/en-us/azure/databricks/delta/update-schema
- Microsoft Learn: OPTIMIZE command https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/delta-optimize
- Microsoft Learn: Optimize data file layout https://learn.microsoft.com/en-us/azure/databricks/delta/optimize
- Microsoft Learn: VACUUM command https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/delta-vacuum
- Microsoft Learn: Remove unused data files with VACUUM https://learn.microsoft.com/en-us/azure/databricks/delta/vacuum
- Microsoft Learn: Control data file size / optimized writes and auto compaction https://learn.microsoft.com/en-us/azure/databricks/optimizations/auto-optimize
- Microsoft Learn: When to partition tables on Azure Databricks https://learn.microsoft.com/en-us/azure/databricks/tables/partitions
- Microsoft Learn: Use liquid clustering for tables https://learn.microsoft.com/en-us/azure/databricks/delta/clustering
- Databricks Documentation: Upsert into a Delta Lake table using MERGE https://docs.databricks.com/aws/en/delta/merge

## Issues Found
- Updated the partitioning guidance. The original text recommended partitioning large tables by frequently filtered columns without qualification. Current Databricks guidance recommends liquid clustering for new Delta tables and says legacy partitioning should be used carefully, typically with low-cardinality columns.
- Softened the small-files claim from "accumulate" to "can accumulate" because optimized writes, auto compaction, and predictive optimization can reduce this behavior on current Databricks runtimes and Unity Catalog managed tables.
- Updated the Z-ordering explanation. ZORDER syntax remains valid for non-liquid-clustered Delta tables, but current Databricks guidance recommends liquid clustering for new tables instead of Z-ordering, and the original "dramatically improves" wording was too absolute.
- Replaced the `VACUUM silver.employees RETAIN 24 HOURS` example. Current Azure Databricks documentation describes retention using the `delta.deletedFileRetentionDuration` table property, defaults to 7 days, and strongly recommends at least 7 days. The post now shows a 30-day retention example before running `VACUUM`.
- Updated the auto-optimization section to use current terminology: optimized writes, auto compaction, and predictive optimization. The retired "auto optimize" wording was replaced, and auto compaction now uses the recommended `auto` value.

## Review Notes
The remaining Python and SQL examples use supported Delta Lake, PySpark, and Databricks SQL APIs. The examples assume the target schemas and storage paths already exist and that the code is run inside an Azure Databricks notebook or job with an active `spark` session.
