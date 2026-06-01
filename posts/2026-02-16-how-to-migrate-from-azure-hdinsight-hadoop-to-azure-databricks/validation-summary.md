# Validation Summary: How to Migrate from Azure HDInsight Hadoop to Azure Databricks

## Status
validated

## Post Type
Migration guide

## Technologies Covered
- Azure HDInsight
- Azure Databricks
- Apache Hadoop
- Apache Hive and Beeline
- Apache Spark and PySpark
- Delta Lake
- Azure Blob Storage
- Azure Data Lake Storage Gen2
- Databricks Jobs
- Oozie
- Azure Data Factory

## Sources Consulted
- Azure Databricks documentation: Mounting cloud object storage on Azure Databricks - https://learn.microsoft.com/en-us/azure/databricks/dbfs/mounts
- Azure Databricks documentation: Use Azure managed identities in Unity Catalog to access storage - https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/azure-managed-identities
- Azure Storage documentation: Tutorial: Azure Data Lake Storage, Azure Databricks & Spark - https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-use-databricks-spark
- Azure Databricks documentation: CREATE TABLE [USING] - https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/sql-ref-syntax-ddl-create-table-using
- Azure Databricks documentation: REPAIR TABLE - https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/sql-ref-syntax-ddl-repair-table
- Azure Databricks documentation: What is Delta Lake in Azure Databricks? - https://learn.microsoft.com/en-us/azure/databricks/delta/
- Azure Databricks documentation: Automate job creation and management - https://learn.microsoft.com/en-us/azure/databricks/jobs/automate
- Apache Spark documentation: PySpark SQL functions API reference - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/functions.html
- Delta Lake documentation: Delta Lake Python API - https://docs.delta.io/api/latest/python/spark/index.html
- Microsoft documentation: Use Apache Hive with Beeline in HDInsight - https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-hadoop-use-hive-beeline

## Issues Found
- The storage examples used DBFS mounts under `/mnt`. Azure Databricks documentation now identifies DBFS mounts as a deprecated pattern and recommends Unity Catalog external locations or direct cloud URI access. I changed the examples to configure storage credentials and access `wasbs://` and `abfss://` paths directly, then updated later sample paths and the checklist wording to match.
- The ADLS Gen2 service principal example used generic Hadoop configuration keys in a DBFS mount. I changed it to account-qualified `fs.azure.account.*.<account>.dfs.core.windows.net` Spark configuration keys, matching current Azure Databricks storage access examples.
- The PySpark word count snippet used `col`, `explode`, and `split` without importing them. I added `from pyspark.sql.functions import col, explode, split`.
- The Hive inventory script comment said it listed tables and DDL, but the loop only ran `SHOW TABLES`. I corrected the comment to say it lists tables.

## Review Notes
The post remains a practical migration guide rather than a fully executable runbook. The examples still use placeholder storage accounts, secrets, cluster node types, and notebook paths that must be adjusted for a real Azure Databricks workspace.
