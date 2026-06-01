# Validation Summary: How to Configure Apache Spark Pools in Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Synapse Analytics
- Apache Spark pools
- Azure CLI
- PySpark
- Spark SQL
- Azure Data Lake Storage Gen2
- Synapse library management
- Spark configuration

## Sources Consulted
- Microsoft Learn: Azure Synapse `az synapse spark pool` CLI reference, https://learn.microsoft.com/en-us/cli/azure/synapse/spark/pool
- Microsoft Learn: Azure Synapse runtime version support, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-version-support
- Microsoft Learn: Azure Synapse Runtime for Apache Spark 3.4, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-34-runtime
- Microsoft Learn: Azure Synapse Runtime for Apache Spark 3.5, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-35-runtime
- Microsoft Learn: Apache Spark pool configurations in Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-pool-configurations
- Microsoft Learn: Automatically scale Azure Synapse Analytics Apache Spark pools, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-autoscale
- Microsoft Learn: Manage Apache Spark configuration, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-azure-create-spark-configuration
- Microsoft Learn: Manage workspace libraries for Apache Spark, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-manage-workspace-packages
- Microsoft Learn: Manage libraries for Apache Spark pools in Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-manage-pool-packages
- Microsoft Learn: Manage session-scoped packages, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-manage-session-packages
- Microsoft Learn: Use .NET for Apache Spark with Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/spark-dotnet
- Apache Spark documentation: Spark configuration, https://spark.apache.org/docs/3.5.4/configuration.html
- Apache Spark PySpark API documentation: DataFrameReader.parquet and DataFrameWriter.parquet, https://spark.apache.org/docs/3.5.6/api/python/reference/pyspark.sql/

## Issues Found
- The post used Spark version 3.4 as the recommended/current runtime. Azure Synapse Runtime for Apache Spark 3.4 is deprecated and unsupported as of March 31, 2026, so the example and explanation were updated to Spark 3.5, the current GA runtime.
- The Azure CLI `az synapse spark pool create` example omitted the required `--node-count` argument. Added `--node-count 3` and explained it as the initial cluster size when autoscale is enabled.
- The article stated that current Spark pools support .NET Spark jobs. Microsoft documents that .NET for Apache Spark was removed from Synapse Spark 3.3 and later runtimes. Updated the language support text to PySpark, Scala, and Spark SQL, with a caveat for older runtimes.
- The node-size description implied XXXLarge was part of the normal range. Updated the wording and table to show XXLarge as the standard upper size and XXXLarge as Isolated Compute in supported regions.
- The Spark configuration workflow said users could upload a configuration file directly under a pool. Microsoft documents the current flow as selecting a published Apache Spark configuration and creating/importing configurations under Manage > Apache Spark configurations. Updated the instructions.
- The configuration file description said `key=value` pairs, but Synapse `.txt` and `.conf` examples use space-separated key/value pairs. Updated the wording to match the documented format.
- The workspace package section implied workspace packages automatically apply to all pools. Microsoft documents workspace packages as uploaded to the workspace and then assigned to specific pools. Updated the description and steps.
- The session-level package example used `%%configure` with a Delta package coordinate while the current Synapse Spark 3.5 runtime already includes Delta Lake 3.2. Replaced it with a documented `%pip install` session-scoped Python package example.

## Review Notes
- The PySpark DataFrame read, transform, and write example uses valid PySpark APIs. It depends on the placeholder ADLS Gen2 account/container path and appropriate workspace identity permissions.
- The Azure CLI was not installed in the local environment, so command syntax was verified against the official Azure CLI reference rather than local `az --help` output.
