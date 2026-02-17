# How to Set Up Logical Replication from Cloud SQL PostgreSQL to BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, BigQuery, Logical Replication, CDC

Description: Step-by-step guide to setting up logical replication from Cloud SQL PostgreSQL to BigQuery for real-time data warehouse synchronization.

---

Getting data from your operational PostgreSQL database into BigQuery for analytics is one of the most common data engineering tasks on GCP. Batch exports work but introduce latency - your analytics are always hours behind. Logical replication gives you near-real-time synchronization by streaming changes (inserts, updates, deletes) from Cloud SQL PostgreSQL directly to BigQuery. Here is how to set it up using Datastream, Google's managed change data capture service.

## How Logical Replication Works

PostgreSQL logical replication uses the Write-Ahead Log (WAL) to capture changes at the row level. When a row is inserted, updated, or deleted, the change is recorded in the WAL. A logical replication slot reads these changes and streams them to a consumer. Datastream connects to this replication slot and writes the changes to BigQuery.

The flow looks like this:

```
Cloud SQL PostgreSQL -> WAL -> Logical Replication Slot -> Datastream -> BigQuery
```

This approach captures every change in near-real-time without impacting your production database performance significantly.

## Step 1: Configure Cloud SQL for Logical Replication

Enable logical replication on your Cloud SQL PostgreSQL instance by setting the required database flags:

```bash
# Enable logical decoding on the Cloud SQL instance
# This requires a database restart
gcloud sql instances patch my-pg-instance \
  --database-flags \
  cloudsql.logical_decoding=on
```

This flag enables PostgreSQL's logical decoding feature, which is the foundation for logical replication.

## Step 2: Create a Replication User

Create a dedicated PostgreSQL user for Datastream with the necessary permissions:

```sql
-- Create a user for Datastream replication
CREATE USER datastream_user WITH REPLICATION LOGIN PASSWORD 'strong_password_here';

-- Grant necessary permissions
-- Datastream needs SELECT on the tables it will replicate
GRANT USAGE ON SCHEMA public TO datastream_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datastream_user;

-- Grant default privileges so new tables are automatically accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO datastream_user;
```

## Step 3: Create a Publication

A publication defines which tables to replicate. You can replicate all tables or specific ones:

```sql
-- Replicate all tables in the database
CREATE PUBLICATION datastream_pub FOR ALL TABLES;

-- Or replicate specific tables
CREATE PUBLICATION datastream_pub FOR TABLE
  orders,
  customers,
  products,
  order_items;
```

Verify the publication:

```sql
-- Check publication details
SELECT * FROM pg_publication;

-- Check which tables are in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'datastream_pub';
```

## Step 4: Configure Network Connectivity

Datastream needs to reach your Cloud SQL instance. The recommended approach is using private connectivity through VPC peering:

```bash
# Create a private connectivity configuration for Datastream
gcloud datastream private-connections create my-private-connection \
  --location=us-central1 \
  --display-name="Cloud SQL Private Connection" \
  --vpc="my-vpc-network" \
  --subnet="10.1.0.0/29"
```

Make sure your Cloud SQL instance has a private IP and is in the same VPC (or a peered VPC):

```bash
# Verify Cloud SQL has a private IP
gcloud sql instances describe my-pg-instance \
  --format='get(ipAddresses)'
```

## Step 5: Create a Datastream Connection Profile for PostgreSQL

The connection profile stores the connection details for your source database:

```bash
# Create the source connection profile
gcloud datastream connection-profiles create pg-source-profile \
  --location=us-central1 \
  --display-name="Cloud SQL PostgreSQL Source" \
  --type=postgresql \
  --postgresql-hostname=10.0.0.5 \
  --postgresql-port=5432 \
  --postgresql-database=myapp \
  --postgresql-username=datastream_user \
  --postgresql-password=strong_password_here \
  --private-connection=my-private-connection
```

## Step 6: Create a Datastream Connection Profile for BigQuery

Create the destination connection profile for BigQuery:

```bash
# Create the BigQuery destination connection profile
gcloud datastream connection-profiles create bq-dest-profile \
  --location=us-central1 \
  --display-name="BigQuery Destination" \
  --type=bigquery
```

## Step 7: Create the Datastream Stream

Now create the stream that connects source to destination:

```bash
# Create the replication stream
gcloud datastream streams create pg-to-bq-stream \
  --location=us-central1 \
  --display-name="PostgreSQL to BigQuery Replication" \
  --source=pg-source-profile \
  --postgresql-source-config='{
    "includeObjects": {
      "postgresqlSchemas": [{
        "schema": "public",
        "postgresqlTables": [
          {"table": "orders"},
          {"table": "customers"},
          {"table": "products"},
          {"table": "order_items"}
        ]
      }]
    },
    "replicationSlot": "datastream_slot",
    "publication": "datastream_pub"
  }' \
  --destination=bq-dest-profile \
  --bigquery-destination-config='{
    "dataFreshness": "300s",
    "singleTargetDataset": {
      "datasetId": "projects/my-project/datasets/replicated_data"
    }
  }' \
  --backfill-all
```

Key configuration options:

- **dataFreshness**: How often BigQuery tables are updated (300s = 5 minutes)
- **singleTargetDataset**: All tables go into one BigQuery dataset
- **backfill-all**: Performs an initial backfill of existing data

## Step 8: Start the Stream

```bash
# Start the replication stream
gcloud datastream streams update pg-to-bq-stream \
  --location=us-central1 \
  --state=RUNNING
```

## Monitoring the Replication

Check the stream status and lag:

```bash
# Check stream status
gcloud datastream streams describe pg-to-bq-stream \
  --location=us-central1 \
  --format='table(name,state,backfillAll)'
```

Monitor replication lag using the stream's metrics:

```bash
# View stream metrics
gcloud monitoring metrics list \
  --filter='metric.type = starts_with("datastream.googleapis.com")'
```

You can also check the PostgreSQL side to make sure the replication slot is active:

```sql
-- Check replication slot status in PostgreSQL
SELECT
  slot_name,
  active,
  restart_lsn,
  confirmed_flush_lsn,
  pg_current_wal_lsn() AS current_lsn,
  pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots
WHERE slot_name = 'datastream_slot';
```

The `lag_bytes` value tells you how far behind the replication consumer is. Under normal conditions, this should be in the kilobytes range.

## Understanding the BigQuery Table Structure

Datastream creates tables in BigQuery with additional metadata columns:

```sql
-- Query the replicated data in BigQuery
-- Datastream adds metadata columns for tracking changes
SELECT
  datastream_metadata.uuid,           -- Unique event ID
  datastream_metadata.source_timestamp, -- When the change happened in PostgreSQL
  -- Your original columns
  order_id,
  customer_id,
  order_date,
  total,
  status
FROM `my_project.replicated_data.orders`
WHERE order_date >= CURRENT_DATE()
ORDER BY datastream_metadata.source_timestamp DESC;
```

For tables with updates and deletes, Datastream uses a merge approach in BigQuery to maintain the current state of each row.

## Handling Schema Changes

When you alter a table in PostgreSQL (add columns, change types), Datastream handles it automatically:

```sql
-- Add a column to the source table
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2);
```

Datastream detects the schema change and updates the BigQuery table accordingly. New columns appear automatically. However, some schema changes like dropping columns or changing data types may require intervention.

## Optimizing the BigQuery Tables

The replicated tables use BigQuery's default settings. For better query performance, set up clustering:

```sql
-- After initial replication, optimize the BigQuery table
-- Create a clustered copy for better query performance
CREATE OR REPLACE TABLE `my_project.warehouse.orders`
PARTITION BY DATE(order_date)
CLUSTER BY customer_id, status
AS
SELECT * FROM `my_project.replicated_data.orders`;
```

For ongoing optimization, create a scheduled query or Dataform pipeline that transforms the replicated data into an optimized format.

## Setting Up Alerts for Replication Issues

Create alerts to notify you when replication falls behind:

```bash
# Alert when replication lag exceeds 10 minutes
gcloud monitoring policies create \
  --display-name="Datastream Replication Lag Alert" \
  --condition-display-name="High replication lag" \
  --condition-filter='resource.type="datastream.googleapis.com/Stream" AND metric.type="datastream.googleapis.com/stream/freshness"' \
  --condition-threshold-value=600 \
  --condition-threshold-duration=300s \
  --notification-channels="projects/my-project/notificationChannels/123"
```

## Common Issues and Solutions

**Replication slot fills up**: If Datastream stops consuming changes (due to errors or being paused), the replication slot retains WAL segments, consuming disk space. Monitor WAL retention:

```sql
-- Check how much WAL is being retained
SELECT
  slot_name,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
```

**Large initial backfill**: For large tables, the initial backfill can take hours. Datastream handles this in the background without blocking your production database, but monitor the progress in the console.

**Unsupported column types**: Some PostgreSQL types (arrays, custom types, hstore) may not map cleanly to BigQuery. Check Datastream's documentation for type mappings and handle conversions in a downstream transformation layer.

Logical replication from Cloud SQL PostgreSQL to BigQuery through Datastream gives you near-real-time analytics without building and maintaining custom ETL pipelines. Once set up, it runs continuously with minimal maintenance, keeping your BigQuery warehouse in sync with your operational database.
