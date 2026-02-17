# How to Run Hive Queries on Dataproc with the Hive Metastore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Hive, Metastore, Big Data

Description: Learn how to set up the Hive Metastore on Dataproc and run HiveQL queries against data stored in Google Cloud Storage.

---

Apache Hive remains one of the most popular tools for running SQL-like queries against large datasets. If you have been using Hive on-premises or on another cloud, migrating those workloads to Dataproc is straightforward. Dataproc comes with Hive pre-installed, and when you pair it with the Dataproc Metastore service, you get a persistent metadata catalog that survives cluster restarts.

This article covers how to set up Hive on Dataproc, configure the Hive Metastore, and run queries against data sitting in Cloud Storage.

## Understanding the Hive Metastore Options

When running Hive on Dataproc, you have two choices for the metastore:

1. **Local metastore** - A MySQL database running on the cluster's master node. This is the default, but metadata is lost when the cluster is deleted.
2. **Dataproc Metastore** - A managed, persistent Hive Metastore service that runs independently of any cluster. This is what you want for production.

For anything beyond quick experiments, use the Dataproc Metastore service. It keeps your table definitions, partitions, and schema information available across cluster lifecycles.

## Step 1: Create a Dataproc Metastore Service

The Dataproc Metastore service runs as a standalone resource in your project. Create it before your cluster.

```bash
# Create a managed Dataproc Metastore service
gcloud metastore services create my-hive-metastore \
  --location=us-central1 \
  --tier=DEVELOPER \
  --hive-metastore-version=3.1.2 \
  --network=default
```

The `DEVELOPER` tier is fine for testing. For production, use `ENTERPRISE` which gives you better availability and performance. The metastore takes a few minutes to provision.

Check the status:

```bash
# Verify the metastore service is ready
gcloud metastore services describe my-hive-metastore \
  --location=us-central1 \
  --format="value(state)"
```

Wait until the state shows `ACTIVE` before proceeding.

## Step 2: Create a Dataproc Cluster with Metastore Integration

Now create a Dataproc cluster that connects to your metastore service:

```bash
# Create a Dataproc cluster connected to the managed metastore
gcloud dataproc clusters create hive-cluster \
  --region=us-central1 \
  --zone=us-central1-a \
  --image-version=2.1-debian11 \
  --num-workers=2 \
  --worker-machine-type=n2-standard-4 \
  --dataproc-metastore=projects/my-project/locations/us-central1/services/my-hive-metastore \
  --optional-components=HIVE_WEBHCAT
```

The `--dataproc-metastore` flag links the cluster to your persistent metastore. The `HIVE_WEBHCAT` component enables the HiveServer2 web interface.

## Step 3: Prepare Data in Cloud Storage

Hive on Dataproc works best with data stored in GCS. Let us create some sample data and upload it.

```bash
# Create a sample CSV dataset
cat > /tmp/employees.csv << 'CSVEOF'
1,Alice,Engineering,95000
2,Bob,Marketing,85000
3,Carol,Engineering,102000
4,Dave,Sales,78000
5,Eve,Engineering,110000
6,Frank,Marketing,82000
7,Grace,Sales,91000
8,Heidi,Engineering,99000
CSVEOF

# Upload to Cloud Storage
gsutil cp /tmp/employees.csv gs://my-data-bucket/hive/employees/
```

## Step 4: Create a Hive Table

You can run Hive queries in several ways. The simplest is to submit a HiveQL script through the gcloud CLI.

Create a script that defines a table pointing to your GCS data:

```sql
-- create_table.hql - Define an external Hive table backed by GCS
CREATE DATABASE IF NOT EXISTS company_db;

USE company_db;

-- Create an external table pointing to CSV data in Cloud Storage
CREATE EXTERNAL TABLE IF NOT EXISTS employees (
    id INT,
    name STRING,
    department STRING,
    salary INT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 'gs://my-data-bucket/hive/employees/';

-- Verify the table was created and data is accessible
SELECT COUNT(*) as total_employees FROM employees;
```

Submit the Hive job:

```bash
# Upload the Hive script and run it on the cluster
gsutil cp create_table.hql gs://my-data-bucket/scripts/

gcloud dataproc jobs submit hive \
  --cluster=hive-cluster \
  --region=us-central1 \
  -f gs://my-data-bucket/scripts/create_table.hql
```

## Step 5: Run Analytical Queries

With the table created, you can run any HiveQL query against it. Here is a more complex example:

```sql
-- analytics.hql - Run analytical queries on the employees table
USE company_db;

-- Average salary by department
SELECT
    department,
    COUNT(*) as headcount,
    AVG(salary) as avg_salary,
    MAX(salary) as max_salary,
    MIN(salary) as min_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;
```

Submit this query:

```bash
# Run the analytics query on Dataproc
gcloud dataproc jobs submit hive \
  --cluster=hive-cluster \
  --region=us-central1 \
  -f gs://my-data-bucket/scripts/analytics.hql
```

## Step 6: Use Partitioned Tables for Better Performance

For large datasets, partitioning is essential. Hive partitions map to directory structures in Cloud Storage, which means query engines can skip irrelevant data entirely.

```sql
-- create_partitioned_table.hql - Create a partitioned table for event data
USE company_db;

-- Create a partitioned table for web events
CREATE EXTERNAL TABLE IF NOT EXISTS web_events (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    page_url STRING,
    timestamp_ms BIGINT
)
PARTITIONED BY (event_date STRING)
STORED AS PARQUET
LOCATION 'gs://my-data-bucket/hive/web_events/';

-- Add partitions manually or use MSCK REPAIR TABLE
-- to discover existing partitions from the directory structure
MSCK REPAIR TABLE web_events;
```

When you query a partitioned table with a filter on the partition column, Hive only reads the relevant directories:

```sql
-- This query only scans data in the event_date=2025-12-01 partition
SELECT event_type, COUNT(*) as count
FROM web_events
WHERE event_date = '2025-12-01'
GROUP BY event_type;
```

## Step 7: Connect via Beeline for Interactive Queries

For interactive work, you can SSH into the cluster's master node and use Beeline, the Hive CLI:

```bash
# SSH into the Dataproc master node
gcloud compute ssh hive-cluster-m --zone=us-central1-a

# Once connected, start Beeline
beeline -u "jdbc:hive2://localhost:10000"
```

From within Beeline, you can run queries interactively:

```sql
-- Run queries interactively in the Beeline shell
USE company_db;
SHOW TABLES;
DESCRIBE FORMATTED employees;
SELECT * FROM employees WHERE department = 'Engineering';
```

## Step 8: Configure Hive Performance Settings

For better performance on large datasets, tune these Hive settings:

```sql
-- performance_settings.hql - Configure Hive for better query performance

-- Enable Tez execution engine (faster than MapReduce)
SET hive.execution.engine=tez;

-- Enable vectorized query execution
SET hive.vectorized.execution.enabled=true;
SET hive.vectorized.execution.reduce.enabled=true;

-- Enable cost-based optimizer
SET hive.cbo.enable=true;
SET hive.compute.query.using.stats=true;
SET hive.stats.fetch.column.stats=true;
SET hive.stats.fetch.partition.stats=true;

-- Enable map-side joins for small tables
SET hive.auto.convert.join=true;
SET hive.auto.convert.join.noconditionaltask.size=536870912;
```

You can set these properties at the cluster level when creating the Dataproc cluster so they apply to all Hive queries:

```bash
# Create a cluster with optimized Hive settings
gcloud dataproc clusters create optimized-hive-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --num-workers=4 \
  --properties="hive:hive.execution.engine=tez,hive:hive.vectorized.execution.enabled=true,hive:hive.cbo.enable=true" \
  --dataproc-metastore=projects/my-project/locations/us-central1/services/my-hive-metastore
```

## Working with the Persistent Metastore

The biggest advantage of the Dataproc Metastore service is that your table definitions persist independently of the cluster. You can delete the Dataproc cluster, create a new one connected to the same metastore, and all your tables are still there.

This is useful for ephemeral cluster patterns where you spin up a cluster for a job and tear it down afterward. The metadata stays safe in the metastore service.

```bash
# Delete the cluster - the metastore retains all table definitions
gcloud dataproc clusters delete hive-cluster --region=us-central1

# Later, create a new cluster and reconnect to the same metastore
gcloud dataproc clusters create new-hive-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --dataproc-metastore=projects/my-project/locations/us-central1/services/my-hive-metastore

# Your tables are immediately available on the new cluster
```

## Wrapping Up

Running Hive on Dataproc is a solid choice when you need familiar SQL semantics over large-scale data in Cloud Storage. Pair it with the Dataproc Metastore service and you get persistent metadata that decouples table definitions from cluster lifecycles. Whether you are migrating existing Hive workloads or starting fresh, the combination of Dataproc and the managed metastore gives you a production-ready setup with minimal operational effort.
