# How to Use Apache Iceberg Tables on GCP with BigLake Metastore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Apache Iceberg, BigLake, BigQuery, Data Lake

Description: Step-by-step guide to setting up and using Apache Iceberg tables on Google Cloud Platform with BigLake Metastore for open table format analytics.

---

Apache Iceberg has been gaining serious momentum as the open table format of choice for data lakes. It brings features like ACID transactions, schema evolution, time travel, and partition evolution to files sitting in object storage. On GCP, you can use Iceberg tables through BigLake Metastore, which acts as a managed catalog that lets BigQuery, Spark, and other engines all work with the same Iceberg tables.

If you have been eyeing Iceberg but were not sure how it fits into the GCP ecosystem, this guide covers the practical setup from start to finish.

## Why Iceberg on GCP

Before Iceberg, querying data in Cloud Storage meant dealing with Hive-style partitioning, no transactional guarantees, and painful schema changes. Iceberg solves these problems with metadata tracking at the file level. It knows exactly which files belong to each snapshot, supports hidden partitioning, and lets you evolve schemas without rewriting data.

BigLake Metastore provides the catalog layer that Iceberg needs. It stores the table metadata and makes it accessible to multiple query engines. BigQuery can read Iceberg tables directly, and Spark on Dataproc can both read and write them.

## Setting Up BigLake Metastore

First, enable the required APIs and create a BigLake Metastore catalog.

```bash
# Enable the BigLake API
gcloud services enable biglake.googleapis.com

# Create a BigLake Metastore catalog
# This is the top-level container for your Iceberg databases and tables
curl -X POST \
  "https://biglake.googleapis.com/v1/projects/my-project/locations/us-central1/catalogs?catalogId=my-iceberg-catalog" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Next, create a database within the catalog:

```bash
# Create a database in the catalog
curl -X POST \
  "https://biglake.googleapis.com/v1/projects/my-project/locations/us-central1/catalogs/my-iceberg-catalog/databases?databaseId=analytics" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "HIVE",
    "hiveOptions": {
      "locationUri": "gs://my-iceberg-warehouse/analytics",
      "parameters": {}
    }
  }'
```

## Creating Your First Iceberg Table with Spark

Spark on Dataproc is currently the best way to create and write to Iceberg tables on GCP. Set up a Dataproc cluster with Iceberg support.

```bash
# Create a Dataproc cluster with Iceberg dependencies
gcloud dataproc clusters create iceberg-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --optional-components=JUPYTER \
  --properties="spark:spark.jars.packages=org.apache.iceberg:iceberg-spark-runtime-3.3_2.12:1.4.3,spark:spark.sql.catalog.my_catalog=org.apache.iceberg.spark.SparkCatalog,spark:spark.sql.catalog.my_catalog.catalog-impl=org.apache.iceberg.gcp.biglake.BigLakeCatalog,spark:spark.sql.catalog.my_catalog.gcp_project=my-project,spark:spark.sql.catalog.my_catalog.gcp_location=us-central1,spark:spark.sql.catalog.my_catalog.blms_catalog=my-iceberg-catalog,spark:spark.sql.catalog.my_catalog.warehouse=gs://my-iceberg-warehouse"
```

Now submit a Spark job to create an Iceberg table:

```python
# create_iceberg_table.py
# This script creates an Iceberg table and loads sample data into it
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

spark = SparkSession.builder \
    .appName("Create Iceberg Table") \
    .getOrCreate()

# Define the schema for our events table
schema = StructType([
    StructField("event_id", StringType(), False),
    StructField("user_id", StringType(), False),
    StructField("event_type", StringType(), False),
    StructField("amount", DoubleType(), True),
    StructField("event_time", TimestampType(), False),
    StructField("region", StringType(), True),
])

# Create the Iceberg table using Spark SQL
# Hidden partitioning by day on event_time means you
# do not need partition columns in the schema
spark.sql("""
    CREATE TABLE IF NOT EXISTS my_catalog.analytics.user_events (
        event_id STRING,
        user_id STRING,
        event_type STRING,
        amount DOUBLE,
        event_time TIMESTAMP,
        region STRING
    )
    USING iceberg
    PARTITIONED BY (days(event_time), region)
    TBLPROPERTIES (
        'write.format.default' = 'parquet',
        'write.parquet.compression-codec' = 'zstd'
    )
""")

# Insert some sample data
spark.sql("""
    INSERT INTO my_catalog.analytics.user_events VALUES
    ('evt001', 'user_1', 'purchase', 99.99, TIMESTAMP '2026-02-17 10:00:00', 'us-east'),
    ('evt002', 'user_2', 'signup', NULL, TIMESTAMP '2026-02-17 10:05:00', 'eu-west'),
    ('evt003', 'user_1', 'purchase', 49.50, TIMESTAMP '2026-02-17 11:30:00', 'us-east')
""")

print("Table created and data inserted successfully")
spark.stop()
```

Submit the job to Dataproc:

```bash
gcloud dataproc jobs submit pyspark create_iceberg_table.py \
  --cluster=iceberg-cluster \
  --region=us-central1
```

## Querying Iceberg Tables from BigQuery

Once the Iceberg table exists in BigLake Metastore, you can query it directly from BigQuery. First, create a BigQuery connection and an external table.

```sql
-- Create an external table in BigQuery that points to the Iceberg table
-- The connection handles authentication to Cloud Storage
CREATE OR REPLACE EXTERNAL TABLE `my-project.analytics.user_events`
WITH CONNECTION `my-project.us-central1.my-biglake-connection`
OPTIONS (
  format = 'ICEBERG',
  uris = ['gs://my-iceberg-warehouse/analytics/user_events/metadata/v1.metadata.json'],
  require_partition_filter = false
);

-- Now query it like any other BigQuery table
SELECT
  region,
  event_type,
  COUNT(*) AS event_count,
  SUM(amount) AS total_amount
FROM `my-project.analytics.user_events`
GROUP BY region, event_type
ORDER BY total_amount DESC;
```

## Using Iceberg Time Travel

One of the best features of Iceberg is time travel. You can query the table as it existed at any point in the past.

```python
# Query a previous snapshot of the table using Spark
# This reads the table as it was before the last write operation
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("Iceberg Time Travel").getOrCreate()

# List all snapshots of the table
spark.sql("""
    SELECT snapshot_id, committed_at, operation
    FROM my_catalog.analytics.user_events.snapshots
    ORDER BY committed_at DESC
""").show()

# Query the table at a specific snapshot
spark.sql("""
    SELECT *
    FROM my_catalog.analytics.user_events
    TIMESTAMP AS OF '2026-02-17 10:00:00'
""").show()

# Or use a specific snapshot ID
spark.sql("""
    SELECT *
    FROM my_catalog.analytics.user_events
    VERSION AS OF 1234567890
""").show()
```

## Schema Evolution Without Downtime

Iceberg handles schema changes gracefully. You can add columns, rename columns, or reorder them without rewriting existing data files.

```python
# Add a new column to the table - no data rewrite needed
spark.sql("""
    ALTER TABLE my_catalog.analytics.user_events
    ADD COLUMNS (
        device_type STRING COMMENT 'The type of device used',
        session_id STRING COMMENT 'Browser session identifier'
    )
""")

# Existing queries continue to work, new columns return NULL
# for rows written before the schema change
spark.sql("""
    SELECT event_id, user_id, device_type, session_id
    FROM my_catalog.analytics.user_events
    LIMIT 10
""").show()
```

## Compacting Small Files

Over time, frequent writes create many small files that slow down queries. Iceberg supports compaction to merge these into larger files.

```python
# Compact small files in the Iceberg table
# This rewrites data files to optimize read performance
spark.sql("""
    CALL my_catalog.system.rewrite_data_files(
        table => 'analytics.user_events',
        options => map(
            'target-file-size-bytes', '536870912',
            'min-file-size-bytes', '67108864'
        )
    )
""")

# Clean up old snapshots to reclaim storage
spark.sql("""
    CALL my_catalog.system.expire_snapshots(
        table => 'analytics.user_events',
        older_than => TIMESTAMP '2026-02-10 00:00:00',
        retain_last => 5
    )
""")
```

## Summary

Apache Iceberg on GCP with BigLake Metastore gives you a production-ready open table format with managed metadata. The setup involves creating a BigLake Metastore catalog, using Spark on Dataproc to create and write Iceberg tables, and then querying them from BigQuery through external tables. You get ACID transactions, time travel, schema evolution, and hidden partitioning - all on top of Parquet files in Cloud Storage. The multi-engine access through a shared catalog means your Spark jobs and BigQuery queries always see the same data without any synchronization headaches.
