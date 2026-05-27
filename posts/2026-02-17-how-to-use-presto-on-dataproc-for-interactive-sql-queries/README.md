# How to Use Presto on Dataproc for Interactive SQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Presto, SQL, Big Data

Description: Set up and use Presto on Dataproc clusters for fast interactive SQL queries across data stored in Cloud Storage and BigQuery.

---

When you need to run ad-hoc SQL queries against large datasets and Hive feels too slow, Presto is the answer. Presto is a distributed SQL query engine designed for interactive analytics. It runs queries in memory, avoids the overhead of MapReduce, and can query multiple data sources in a single SQL statement.

Google Cloud makes it easy to run Presto-compatible SQL on Dataproc. In Dataproc 2.1 and later images, the Presto optional component is available as Trino. You add it as an optional component when creating your cluster, and within minutes you have a fully functional Trino deployment ready to query data in Cloud Storage, BigQuery, or the Hive Metastore.

## Why Presto on Dataproc?

Presto fills a specific gap in the data analytics stack:

- **Interactive speed** - Queries that take minutes in Hive often complete in seconds with Presto
- **Federated queries** - Query data across GCS, BigQuery, and Hive tables in a single SQL statement
- **SQL support** - Presto and Trino use a familiar SQL dialect with broad ANSI SQL compatibility
- **No data movement** - Query data where it lives without loading it into a separate system

## Step 1: Create a Dataproc Cluster with Presto

Presto is available as an optional component in Dataproc. With Dataproc 2.1 images, include the Trino optional component when creating your cluster:

```bash
# Create a Dataproc cluster with Trino installed

gcloud dataproc clusters create presto-cluster \
  --region=us-central1 \
  --zone=us-central1-a \
  --image-version=2.1-debian11 \
  --optional-components=TRINO \
  --num-workers=3 \
  --worker-machine-type=n2-highmem-4 \
  --master-machine-type=n2-highmem-4 \
  --enable-component-gateway
```

The `--enable-component-gateway` flag gives you web access to the Trino UI through the Cloud Console. The `n2-highmem` machine types are a good fit for Presto-style interactive queries since they use significant memory.

## Step 2: Connect to the Trino CLI

Once the cluster is up, SSH into the master node and use the Trino CLI:

```bash
# SSH into the Dataproc master node
gcloud compute ssh presto-cluster-m --zone=us-central1-a

# Start the Trino CLI connected to the local Trino coordinator
trino --server localhost:8060 --catalog hive --schema default
```

You are now in an interactive SQL shell. Try listing the available catalogs:

```sql
-- List available data catalogs (data sources)
SHOW CATALOGS;

-- List schemas in the hive catalog
SHOW SCHEMAS FROM hive;
```

## Step 3: Query Data in Cloud Storage

Trino on Dataproc uses the Hive Metastore to find table definitions. First, create a Hive external table that points to your GCS data, then query it with Trino.

Create a table using the Trino CLI:

```sql
-- Create a schema for our data
CREATE SCHEMA IF NOT EXISTS hive.analytics;

-- Create an external table pointing to Parquet data in GCS
CREATE TABLE hive.analytics.web_events (
    event_id VARCHAR,
    user_id VARCHAR,
    event_type VARCHAR,
    page_url VARCHAR,
    event_timestamp BIGINT
)
WITH (
    format = 'PARQUET',
    external_location = 'gs://my-data-bucket/events/parquet/'
);
```

Now run queries against it:

```sql
-- Count events by type
SELECT event_type, COUNT(*) as event_count
FROM hive.analytics.web_events
GROUP BY event_type
ORDER BY event_count DESC;

-- Find the most active users in the last 24 hours
SELECT user_id, COUNT(*) as actions
FROM hive.analytics.web_events
WHERE event_timestamp > (CAST(to_unixtime(now()) AS BIGINT) - 86400) * 1000
GROUP BY user_id
ORDER BY actions DESC
LIMIT 20;
```

## Step 4: Configure the BigQuery Connector

One of Presto's strengths on Dataproc is its ability to query BigQuery tables directly. Dataproc's Trino component is configured with a BigQuery connector by default. To add a separate catalog for a specific BigQuery project, configure it at cluster creation time:

```bash
# Create a cluster with Trino and an additional BigQuery catalog
gcloud dataproc clusters create presto-bq-cluster \
  --region=us-central1 \
  --zone=us-central1-a \
  --image-version=2.1-debian11 \
  --optional-components=TRINO \
  --num-workers=3 \
  --worker-machine-type=n2-highmem-4 \
  --enable-component-gateway \
  --properties="trino-catalog:bigquery_public.connector.name=bigquery,trino-catalog:bigquery_public.bigquery.project-id=bigquery-public-data"
```

Alternatively, you can configure the BigQuery catalog after cluster creation. SSH into the master node and create a catalog properties file:

```bash
# SSH into the master node
gcloud compute ssh presto-bq-cluster-m --zone=us-central1-a

# Create the BigQuery catalog configuration
sudo tee /usr/lib/trino/etc/catalog/bigquery_public.properties << 'EOF'
connector.name=bigquery
bigquery.project-id=bigquery-public-data
bigquery.views-enabled=true
EOF

# Restart Trino to pick up the new catalog
sudo systemctl restart trino
```

Now you can query BigQuery tables from Trino:

```sql
-- Query a BigQuery public dataset directly from Trino
SELECT
    word,
    SUM(word_count) as total_count
FROM bigquery_public.samples.shakespeare
GROUP BY word
ORDER BY total_count DESC
LIMIT 10;
```

## Step 5: Run Federated Queries

The real power of Presto shines when you join data across different sources. For example, joining a Hive table in GCS with a BigQuery table:

```sql
-- Join GCS-backed Hive data with a BigQuery table
SELECT
    e.user_id,
    e.event_type,
    u.user_name,
    u.account_tier
FROM hive.analytics.web_events e
JOIN bigquery.user_dataset.users u
    ON e.user_id = CAST(u.user_id AS VARCHAR)
WHERE e.event_type = 'purchase'
ORDER BY e.event_timestamp DESC
LIMIT 100;
```

This query reads event data from Cloud Storage and user data from BigQuery, joins them in Trino's memory, and returns the result. No ETL pipeline needed.

## Step 6: Access the Trino Web UI

Dataproc's component gateway exposes the Trino Web UI through the Cloud Console. To access it:

1. Go to the **Dataproc Clusters** page in the Cloud Console
2. Click on your cluster name
3. Click the **Web Interfaces** tab
4. Click **Trino** to open the UI

The Trino UI shows you:

- Running and completed queries
- Query execution plans
- Worker node status
- Memory usage across the cluster

This is invaluable for debugging slow queries and understanding resource utilization.

## Step 7: Tune Presto for Performance

Trino's performance depends heavily on how much memory is available. Here are key tuning parameters:

```bash
# Create a cluster with tuned Trino settings
gcloud dataproc clusters create tuned-presto \
  --region=us-central1 \
  --zone=us-central1-a \
  --image-version=2.1-debian11 \
  --optional-components=TRINO \
  --num-workers=4 \
  --worker-machine-type=n2-highmem-8 \
  --properties="\
trino:query.max-memory-per-node=8GB,\
trino:query.max-memory=40GB,\
trino:query.max-total-memory=60GB,\
trino:memory.heap-headroom-per-node=4GB"
```

A few tuning tips that have worked well in practice:

- **Use columnar formats** - Parquet and ORC are significantly faster than CSV or JSON for Presto queries
- **Partition your data** - Presto and Trino can skip entire partitions when your WHERE clause filters on partition columns
- **Avoid SELECT star** - Only select the columns you need, especially with wide tables
- **Right-size your workers** - Presto is memory-hungry, so use highmem machine types

## Submitting Trino Jobs from gcloud

For automated pipelines, you can submit Trino queries through the gcloud CLI without SSH:

```bash
# Submit a Trino query as a Dataproc job
gcloud dataproc jobs submit trino \
  --cluster=presto-cluster \
  --region=us-central1 \
  -e "SELECT event_type, COUNT(*) FROM hive.analytics.web_events GROUP BY event_type"

# Or run a SQL file
gcloud dataproc jobs submit trino \
  --cluster=presto-cluster \
  --region=us-central1 \
  -f gs://my-data-bucket/scripts/weekly_report.sql
```

## When to Use Presto vs. Other Options

Presto is best for:
- Interactive, ad-hoc analytics where query speed matters
- Federated queries across multiple data sources
- Exploratory analysis where you are iterating quickly on queries

Consider alternatives when:
- You need batch ETL processing (use Spark instead)
- Your queries involve complex ML transformations (use Spark MLlib)
- You are already all-in on BigQuery and do not need federated access

## Wrapping Up

Presto-compatible SQL on Dataproc gives you a fast SQL engine that queries data wherever it lives. The setup is minimal - just add the Trino optional component on Dataproc 2.1 and later images - and the ability to run federated queries across GCS, BigQuery, and other sources makes it a versatile tool in your analytics stack. For teams that need interactive query speeds without moving all their data into a single warehouse, Presto and Trino are hard to beat.
