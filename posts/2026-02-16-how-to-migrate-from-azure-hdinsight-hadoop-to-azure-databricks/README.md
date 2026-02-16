# How to Migrate from Azure HDInsight Hadoop to Azure Databricks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Databricks, Azure HDInsight, Migration, Apache Spark, Hadoop, Data Engineering, Cloud Migration

Description: A practical migration guide for moving your Hadoop workloads from Azure HDInsight to Azure Databricks with minimal disruption.

---

Many organizations started their big data journey on Azure HDInsight with Hadoop clusters running MapReduce, Hive, and Pig jobs. While HDInsight served that purpose well, the industry has shifted toward Apache Spark and managed analytics platforms. Azure Databricks offers a more modern, collaborative, and performant environment for data engineering and data science workloads. If you are planning this migration, this guide covers the practical steps, common pitfalls, and strategies for making the transition smoothly.

## Why Migrate to Databricks?

Before diving into the how, let us acknowledge the legitimate reasons for this migration:

**Performance**: Spark on Databricks is generally faster than MapReduce or even Hive on Tez for most workloads. The Photon engine in Databricks adds further acceleration.

**Developer experience**: Databricks notebooks provide a collaborative environment with version control, commenting, and shared workspaces. This is a significant improvement over Ambari and SSH-based development.

**Cluster management**: Databricks handles auto-scaling, auto-termination, and cluster pools automatically. You spend less time managing infrastructure.

**Unity Catalog**: Databricks' governance layer provides centralized access control, data lineage, and auditing that goes beyond what HDInsight offers natively.

**Cost optimization**: Auto-terminating clusters and spot instance support can reduce costs compared to always-on HDInsight clusters.

## Assessment Phase

Start by inventorying what you have on HDInsight. You need to catalog:

1. **Jobs and scripts**: List all MapReduce, Hive, Pig, and Spark jobs
2. **Schedules**: Document Oozie workflows and their schedules
3. **Data locations**: Map all data in HDFS, Azure Storage, and ADLS
4. **Dependencies**: Identify upstream and downstream systems
5. **Custom libraries**: Note any custom JARs, UDFs, or Python packages

Here is a script to help inventory Hive objects on your HDInsight cluster:

```bash
# SSH into the HDInsight cluster and extract Hive metadata
ssh sshuser@my-hdinsight-cluster-ssh.azurehdinsight.net

# List all databases
beeline -u "jdbc:hive2://localhost:10001/default;transportMode=http" \
  -n admin -p "password" \
  -e "SHOW DATABASES;" > /tmp/hive_databases.txt

# For each database, list tables and their DDL
for db in $(cat /tmp/hive_databases.txt | tail -n +2); do
  echo "=== Database: $db ===" >> /tmp/hive_inventory.txt
  beeline -u "jdbc:hive2://localhost:10001/$db;transportMode=http" \
    -n admin -p "password" \
    -e "SHOW TABLES;" >> /tmp/hive_inventory.txt
done
```

## Migrating Data

If your HDInsight cluster uses Azure Blob Storage or ADLS Gen2 as its primary storage, your data is already accessible from Databricks. You do not need to physically move it - just mount the same storage in your Databricks workspace.

### Mount Azure Storage in Databricks

```python
# Mount an Azure Blob Storage container in Databricks
# This makes the same data accessible from both HDInsight and Databricks
# during the migration transition period

dbutils.fs.mount(
    source="wasbs://hive-warehouse@mystorageaccount.blob.core.windows.net",
    mount_point="/mnt/hive-warehouse",
    extra_configs={
        "fs.azure.account.key.mystorageaccount.blob.core.windows.net":
            dbutils.secrets.get(scope="storage", key="account-key")
    }
)

# Verify the mount works
display(dbutils.fs.ls("/mnt/hive-warehouse"))
```

For ADLS Gen2 with service principal authentication:

```python
# Mount ADLS Gen2 using service principal credentials
# Store credentials in Databricks secrets for security
configs = {
    "fs.azure.account.auth.type": "OAuth",
    "fs.azure.account.oauth.provider.type": "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider",
    "fs.azure.account.oauth2.client.id": dbutils.secrets.get(scope="adls", key="client-id"),
    "fs.azure.account.oauth2.client.secret": dbutils.secrets.get(scope="adls", key="client-secret"),
    "fs.azure.account.oauth2.client.endpoint": "https://login.microsoftonline.com/<tenant-id>/oauth2/token"
}

dbutils.fs.mount(
    source="abfss://data@myadlsaccount.dfs.core.windows.net",
    mount_point="/mnt/adls-data",
    extra_configs=configs
)
```

## Migrating Hive Tables

Hive tables are the most common migration item. Databricks supports Hive metastore compatibility, so you can often recreate your Hive tables directly.

### Export Hive DDL from HDInsight

```bash
# Generate CREATE TABLE statements for all tables in a database
# Run this on the HDInsight cluster
beeline -u "jdbc:hive2://localhost:10001/ecommerce_dw;transportMode=http" \
  -n admin -p "password" \
  -e "SHOW TABLES;" --outputformat=csv2 | tail -n +2 | while read table; do
    echo "-- Table: $table"
    beeline -u "jdbc:hive2://localhost:10001/ecommerce_dw;transportMode=http" \
      -n admin -p "password" \
      -e "SHOW CREATE TABLE $table;" --outputformat=csv2
    echo ""
done > /tmp/hive_ddl_export.sql
```

### Recreate Tables in Databricks

In a Databricks notebook, recreate the tables pointing to the same storage:

```sql
-- Create the database in Databricks
CREATE DATABASE IF NOT EXISTS ecommerce_dw;

-- Recreate an external table pointing to the same storage location
CREATE TABLE IF NOT EXISTS ecommerce_dw.fact_orders (
    order_id STRING,
    customer_id STRING,
    product_id STRING,
    quantity INT,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    shipping_country STRING
)
PARTITIONED BY (order_year INT, order_month INT)
STORED AS ORC
LOCATION '/mnt/hive-warehouse/ecommerce_dw/fact_orders';

-- Recover partitions from existing data on storage
MSCK REPAIR TABLE ecommerce_dw.fact_orders;
```

### Converting to Delta Format

While you can keep data in ORC or Parquet, converting to Delta Lake format gives you ACID transactions, schema enforcement, and time travel:

```python
# Read the existing ORC table
df = spark.read.table("ecommerce_dw.fact_orders")

# Write as Delta format to a new location
df.write \
    .format("delta") \
    .mode("overwrite") \
    .partitionBy("order_year", "order_month") \
    .save("/mnt/adls-data/delta/ecommerce_dw/fact_orders")

# Create a Delta table over the new location
spark.sql("""
    CREATE TABLE ecommerce_dw.fact_orders_delta
    USING DELTA
    LOCATION '/mnt/adls-data/delta/ecommerce_dw/fact_orders'
""")
```

## Migrating MapReduce Jobs to Spark

MapReduce jobs need to be rewritten in Spark. The good news is that most MapReduce patterns have simpler Spark equivalents.

### Classic Word Count Example

MapReduce version (Java, typically 50+ lines):
```java
// The classic MapReduce word count requires a Mapper class,
// a Reducer class, and a driver class - roughly 50-60 lines of code
```

Spark equivalent (Python, 5 lines):
```python
# The same word count in PySpark - dramatically simpler
# Read the input file, split lines into words, and count
text = spark.read.text("/mnt/data/input.txt")
word_counts = text.select(explode(split(col("value"), "\\s+")).alias("word")) \
    .groupBy("word") \
    .count() \
    .orderBy(col("count").desc())
word_counts.write.csv("/mnt/data/output/word-counts")
```

### ETL Pipeline Migration

A typical Hive ETL pipeline orchestrated by Oozie can be converted to a Databricks notebook or a Delta Live Tables pipeline:

```python
from pyspark.sql.functions import col, year, month, current_timestamp

# Read raw data (same source as the HDInsight pipeline)
raw_orders = spark.read \
    .option("header", "true") \
    .option("inferSchema", "true") \
    .csv("/mnt/hive-warehouse/raw/orders/")

# Transform: clean, enrich, and compute derived columns
processed_orders = raw_orders \
    .filter(col("order_date").isNotNull()) \
    .withColumn("total_amount", col("quantity") * col("unit_price")) \
    .withColumn("order_year", year(col("order_date"))) \
    .withColumn("order_month", month(col("order_date"))) \
    .withColumn("processed_at", current_timestamp())

# Write to Delta table with merge for idempotent updates
from delta.tables import DeltaTable

if DeltaTable.isDeltaTable(spark, "/mnt/adls-data/delta/fact_orders"):
    # Merge new data with existing - handles duplicates gracefully
    delta_table = DeltaTable.forPath(spark, "/mnt/adls-data/delta/fact_orders")
    delta_table.alias("existing") \
        .merge(processed_orders.alias("new"), "existing.order_id = new.order_id") \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
else:
    # First run - create the table
    processed_orders.write \
        .format("delta") \
        .partitionBy("order_year", "order_month") \
        .save("/mnt/adls-data/delta/fact_orders")
```

## Migrating Oozie Workflows

Oozie workflows need to be replaced with Databricks Jobs or Azure Data Factory pipelines.

### Databricks Jobs

For simple sequential workflows, Databricks Jobs with task dependencies work well:

```python
# Define a multi-task job using the Databricks REST API
import requests
import json

# Job definition with task dependencies
job_config = {
    "name": "daily-etl-pipeline",
    "tasks": [
        {
            "task_key": "extract_raw_data",
            "notebook_task": {
                "notebook_path": "/Repos/data-engineering/etl/01_extract"
            },
            "new_cluster": {
                "spark_version": "13.3.x-scala2.12",
                "num_workers": 4,
                "node_type_id": "Standard_D13_v2"
            }
        },
        {
            "task_key": "transform_data",
            "depends_on": [{"task_key": "extract_raw_data"}],
            "notebook_task": {
                "notebook_path": "/Repos/data-engineering/etl/02_transform"
            },
            "new_cluster": {
                "spark_version": "13.3.x-scala2.12",
                "num_workers": 8,
                "node_type_id": "Standard_D13_v2"
            }
        },
        {
            "task_key": "load_warehouse",
            "depends_on": [{"task_key": "transform_data"}],
            "notebook_task": {
                "notebook_path": "/Repos/data-engineering/etl/03_load"
            },
            "new_cluster": {
                "spark_version": "13.3.x-scala2.12",
                "num_workers": 4,
                "node_type_id": "Standard_D13_v2"
            }
        }
    ],
    "schedule": {
        "quartz_cron_expression": "0 0 6 * * ?",
        "timezone_id": "UTC"
    }
}
```

## Migration Checklist

Here is a practical checklist to track your migration:

1. Inventory all HDInsight workloads (Hive tables, jobs, schedules)
2. Set up Databricks workspace and configure storage mounts
3. Recreate Hive metastore objects in Databricks
4. Convert data to Delta format (optional but recommended)
5. Rewrite MapReduce and Pig jobs in PySpark or Spark SQL
6. Replace Oozie workflows with Databricks Jobs or ADF pipelines
7. Set up equivalent monitoring and alerting
8. Run parallel testing - both systems processing the same data
9. Validate outputs match between HDInsight and Databricks
10. Cut over downstream consumers to Databricks outputs
11. Decommission HDInsight clusters

## Summary

Migrating from HDInsight Hadoop to Azure Databricks is a significant effort, but it pays off in improved performance, better developer experience, and lower operational overhead. The most important thing is to approach it methodically: inventory what you have, migrate data access first, then convert workloads incrementally while running parallel validation. Do not try to migrate everything at once. Pick a non-critical workload, migrate it end-to-end, validate the results, and use what you learn to accelerate the remaining migrations.
