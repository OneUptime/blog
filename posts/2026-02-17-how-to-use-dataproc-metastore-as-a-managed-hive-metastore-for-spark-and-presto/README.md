# How to Use Dataproc Metastore as a Managed Hive Metastore for Spark and Presto

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc Metastore, Hive, Apache Spark, Presto

Description: Learn how to set up Dataproc Metastore as a managed Hive Metastore service on GCP for shared table metadata across Spark, Presto, and other query engines.

---

Every Spark or Presto deployment needs a metastore to keep track of table schemas, partition layouts, and storage locations. Without one, every job has to rediscover the data format and location from scratch. The Hive Metastore has been the standard for this, but running it yourself means managing a MySQL or PostgreSQL backend, handling schema upgrades, and making sure it stays available.

Dataproc Metastore is Google's managed Hive Metastore service. You create an instance, point your Dataproc clusters at it, and forget about the operational details. Multiple clusters can share the same metastore, which means a table created by one Spark job is immediately visible to Presto, another Spark cluster, or Dataproc Serverless.

## Why a Shared Metastore Matters

Without a shared metastore, each Dataproc cluster has its own local Hive Metastore that dies when the cluster is deleted. If you create a table on Monday's cluster, it does not exist on Tuesday's cluster. You end up recreating external table definitions repeatedly or storing DDL scripts that you run on each new cluster.

With Dataproc Metastore, table metadata persists independently of any cluster. Create a table once, and it is available to every cluster, serverless job, and query engine that connects to the metastore.

## Creating a Dataproc Metastore Instance

Set up a metastore instance in your region:

```bash
# Enable the Dataproc Metastore API
gcloud services enable metastore.googleapis.com

# Create a metastore instance
# The DEVELOPER tier is good for development, use ENTERPRISE for production
gcloud metastore services create my-metastore \
  --location=us-central1 \
  --tier=DEVELOPER \
  --hive-metastore-version=3.1.2 \
  --network=default \
  --port=9083

# Check the status - it takes a few minutes to provision
gcloud metastore services describe my-metastore \
  --location=us-central1
```

For production with high availability:

```bash
# Create an enterprise-tier metastore with scaling and HA
gcloud metastore services create prod-metastore \
  --location=us-central1 \
  --tier=ENTERPRISE \
  --hive-metastore-version=3.1.2 \
  --network=default \
  --port=9083 \
  --scaling-factor=2 \
  --maintenance-window-day=SUNDAY \
  --maintenance-window-hour=2
```

## Connecting a Dataproc Cluster to the Metastore

When creating a Dataproc cluster, point it to your metastore instance:

```bash
# Create a Dataproc cluster that uses the managed metastore
gcloud dataproc clusters create my-spark-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --master-machine-type=n1-standard-4 \
  --worker-machine-type=n1-standard-4 \
  --num-workers=4 \
  --dataproc-metastore=projects/my-project/locations/us-central1/services/my-metastore
```

The cluster automatically configures its Spark and Hive to use the external metastore. No additional Spark properties needed.

## Creating Tables in the Shared Metastore

Connect to the cluster and create tables that will be available to all connected clusters:

```python
# create_tables.py
# Create tables in the shared metastore using PySpark
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("Create Shared Tables") \
    .enableHiveSupport() \
    .getOrCreate()

# Create a database in the metastore
spark.sql("CREATE DATABASE IF NOT EXISTS analytics")
spark.sql("USE analytics")

# Create a managed table - Spark handles the data storage
spark.sql("""
    CREATE TABLE IF NOT EXISTS user_events (
        event_id STRING,
        user_id STRING,
        event_type STRING,
        properties MAP<STRING, STRING>,
        event_timestamp TIMESTAMP
    )
    PARTITIONED BY (event_date DATE)
    STORED AS PARQUET
    LOCATION 'gs://my-data-lake/analytics/user_events/'
    TBLPROPERTIES ('parquet.compression' = 'ZSTD')
""")

# Create an external table pointing to existing data
spark.sql("""
    CREATE EXTERNAL TABLE IF NOT EXISTS raw_logs (
        log_line STRING,
        source STRING,
        ingestion_time TIMESTAMP
    )
    PARTITIONED BY (dt STRING)
    STORED AS PARQUET
    LOCATION 'gs://my-data-lake/raw/logs/'
""")

# Repair partitions to discover existing data
spark.sql("MSCK REPAIR TABLE raw_logs")

# Verify the tables are registered
spark.sql("SHOW TABLES IN analytics").show()
spark.stop()
```

## Querying from Multiple Clusters

Once tables are registered in the metastore, any connected cluster can query them immediately.

From a different Spark cluster:

```python
# query_shared_table.py
# Query the shared metastore table from any connected cluster
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("Query Shared Tables") \
    .enableHiveSupport() \
    .getOrCreate()

# The table definition comes from the shared metastore
# No need to specify the schema or location
df = spark.sql("""
    SELECT
        event_type,
        COUNT(*) AS event_count,
        COUNT(DISTINCT user_id) AS unique_users
    FROM analytics.user_events
    WHERE event_date = '2026-02-17'
    GROUP BY event_type
    ORDER BY event_count DESC
""")

df.show()
spark.stop()
```

## Setting Up Presto with the Metastore

Create a Dataproc cluster with Presto that shares the same metastore:

```bash
# Create a Presto cluster connected to the same metastore
gcloud dataproc clusters create presto-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --optional-components=PRESTO \
  --master-machine-type=n1-standard-8 \
  --worker-machine-type=n1-standard-8 \
  --num-workers=4 \
  --dataproc-metastore=projects/my-project/locations/us-central1/services/my-metastore
```

Query the same tables from Presto:

```bash
# Connect to Presto and query the shared table
# Presto sees the same tables as Spark through the shared metastore
presto --server localhost:8080 --catalog hive --schema analytics

# Run the query in Presto
SELECT
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM user_events
WHERE event_date = DATE '2026-02-17'
GROUP BY event_type
ORDER BY event_count DESC;
```

## Using with Dataproc Serverless

Dataproc Serverless Spark jobs can also connect to the shared metastore:

```bash
# Submit a Serverless Spark job that uses the shared metastore
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/query_metastore.py \
  --region=us-central1 \
  --subnet=default \
  --metastore-service=projects/my-project/locations/us-central1/services/my-metastore
```

## Managing Metastore Configuration

Customize the Hive Metastore settings:

```bash
# Update metastore configuration properties
gcloud metastore services update my-metastore \
  --location=us-central1 \
  --update-hive-metastore-configs="\
hive.metastore.warehouse.dir=gs://my-data-lake/warehouse,\
hive.metastore.disallow.incompatible.col.type.changes=true,\
datanucleus.autoCreateSchema=false"
```

## Setting Up Access Control

Control who can access the metastore and which tables they can see:

```bash
# Grant a service account access to the metastore
gcloud metastore services add-iam-policy-binding my-metastore \
  --location=us-central1 \
  --member="serviceAccount:spark-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/metastore.editor"

# Grant read-only access for analyst clusters
gcloud metastore services add-iam-policy-binding my-metastore \
  --location=us-central1 \
  --member="group:analysts@example.com" \
  --role="roles/metastore.viewer"
```

## Backing Up and Restoring

Protect your metadata with regular backups:

```bash
# Create a manual backup of the metastore
gcloud metastore services backups create my-backup \
  --service=my-metastore \
  --location=us-central1 \
  --description="Weekly backup 2026-02-17"

# List available backups
gcloud metastore services backups list \
  --service=my-metastore \
  --location=us-central1

# Restore from a backup (creates a new metastore instance)
gcloud metastore services restore my-metastore \
  --location=us-central1 \
  --backup=my-backup
```

## Monitoring the Metastore

Keep an eye on metastore health and performance:

```bash
# View metastore logs
gcloud logging read \
  'resource.type="metastore.googleapis.com/Service" AND resource.labels.service_id="my-metastore"' \
  --limit=50 \
  --format="table(timestamp, severity, textPayload)"
```

```sql
-- From Spark, check metastore statistics
-- This shows all databases and their tables
SHOW DATABASES;

-- For each database, see the tables
SHOW TABLES IN analytics;

-- Check table details including location and partition info
DESCRIBE FORMATTED analytics.user_events;
```

## Summary

Dataproc Metastore gives you a managed Hive Metastore that persists independently of your compute clusters. Create it once, connect your Dataproc clusters and Serverless jobs to it, and every table definition is shared across all of them. Spark, Presto, and other Hive-compatible engines all see the same tables. For teams running multiple Dataproc clusters or migrating between clusters frequently, a shared metastore eliminates the repetitive work of recreating table definitions. The enterprise tier adds high availability and scaling for production workloads, and built-in backup and restore protects your metadata investment.
