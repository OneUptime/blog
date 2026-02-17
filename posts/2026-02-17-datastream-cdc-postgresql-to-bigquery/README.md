# How to Configure Datastream CDC from PostgreSQL to BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, PostgreSQL, BigQuery, CDC, Change Data Capture, Replication

Description: A complete walkthrough for configuring Google Cloud Datastream to capture changes from PostgreSQL and replicate them to BigQuery in near real time.

---

PostgreSQL is one of the most popular databases for production workloads, and getting that data into BigQuery for analytics used to mean writing custom ETL scripts or waiting for nightly batch loads. Datastream solves this by tapping into PostgreSQL's logical replication system and streaming every change to BigQuery as it happens.

The PostgreSQL setup is a bit different from MySQL because Postgres uses logical replication slots and publications instead of binary logs. This guide walks through every step, from configuring your PostgreSQL instance to querying replicated data in BigQuery.

## How PostgreSQL CDC Works with Datastream

Unlike MySQL which uses binary logs, PostgreSQL uses a feature called logical decoding. Datastream creates a replication slot on your PostgreSQL instance and subscribes to changes through a publication. The publication defines which tables to replicate, and the replication slot ensures Datastream does not miss any changes even if the connection drops temporarily.

Datastream uses the `pgoutput` logical decoding plugin, which is built into PostgreSQL 10 and later.

## Step 1: Configure PostgreSQL for Logical Replication

Your PostgreSQL instance needs a few configuration changes to support logical replication.

For Cloud SQL PostgreSQL, enable logical replication through the database flags:

```bash
# Enable logical decoding on Cloud SQL PostgreSQL
gcloud sql instances patch my-pg-instance \
  --database-flags=cloudsql.logical_decoding=on \
  --project=my-project

# This requires a restart of the instance
gcloud sql instances restart my-pg-instance --project=my-project
```

For self-managed PostgreSQL, edit `postgresql.conf`:

```ini
# Required settings for logical replication
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10

# Keep WAL segments long enough for Datastream to read them
wal_keep_size = 1024
```

After changing the configuration, restart PostgreSQL and verify:

```sql
-- Check that logical replication is enabled
SHOW wal_level;
-- Should return 'logical'

SHOW max_replication_slots;
-- Should be at least 1
```

## Step 2: Create a Publication and Replication User

Datastream needs a dedicated user with replication privileges and a publication that defines which tables to replicate.

```sql
-- Create a dedicated user for Datastream
CREATE USER datastream_user WITH REPLICATION LOGIN PASSWORD 'strong-password-here';

-- Grant connect permission on the database
GRANT CONNECT ON DATABASE mydb TO datastream_user;

-- Grant usage on the schema
GRANT USAGE ON SCHEMA public TO datastream_user;

-- Grant SELECT on all tables you want to replicate
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datastream_user;

-- Make sure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO datastream_user;

-- Create a publication for the tables you want to replicate
CREATE PUBLICATION datastream_pub FOR TABLE
  public.orders,
  public.customers,
  public.products;
```

If you want to replicate all tables in the public schema, you can use:

```sql
-- Alternative: replicate all tables in the database
CREATE PUBLICATION datastream_pub FOR ALL TABLES;
```

## Step 3: Configure Network Access

Datastream needs network connectivity to your PostgreSQL instance. The setup depends on your PostgreSQL deployment.

For Cloud SQL, create a private connectivity configuration:

```bash
# Create private connectivity (if not already created)
gcloud datastream private-connections create pg-private-conn \
  --display-name="PostgreSQL Private Connection" \
  --location=us-central1 \
  --vpc=projects/my-project/global/networks/default \
  --subnet=10.2.0.0/29 \
  --project=my-project
```

Also update your PostgreSQL `pg_hba.conf` to allow connections from the Datastream IP range:

```
# Allow Datastream to connect for replication
host    mydb    datastream_user    10.2.0.0/29    md5
host    replication    datastream_user    10.2.0.0/29    md5
```

## Step 4: Create Connection Profiles

Set up the source connection profile for PostgreSQL:

```bash
# Create PostgreSQL connection profile
gcloud datastream connection-profiles create pg-source-profile \
  --display-name="Production PostgreSQL" \
  --type=postgresql \
  --postgresql-hostname=10.0.0.10 \
  --postgresql-port=5432 \
  --postgresql-username=datastream_user \
  --postgresql-password=strong-password-here \
  --postgresql-database=mydb \
  --location=us-central1 \
  --project=my-project
```

And the BigQuery destination profile:

```bash
# Create BigQuery connection profile
gcloud datastream connection-profiles create bq-dest-profile \
  --display-name="BigQuery Destination" \
  --type=bigquery \
  --location=us-central1 \
  --project=my-project
```

## Step 5: Create and Start the Stream

Create the stream with the PostgreSQL-specific configuration:

```bash
# Create the stream
gcloud datastream streams create pg-to-bq-stream \
  --display-name="PostgreSQL to BigQuery CDC" \
  --location=us-central1 \
  --source=pg-source-profile \
  --postgresql-source-config='{
    "publication": "datastream_pub",
    "replicationSlot": "datastream_slot",
    "includeObjects": {
      "postgresqlSchemas": [
        {
          "schema": "public",
          "postgresqlTables": [
            {"table": "orders"},
            {"table": "customers"},
            {"table": "products"}
          ]
        }
      ]
    }
  }' \
  --destination=bq-dest-profile \
  --bigquery-destination-config='{
    "dataFreshness": "300s",
    "singleTargetDataset": {
      "datasetId": "projects/my-project/datasets/pg_replicated"
    }
  }' \
  --project=my-project
```

Start the stream:

```bash
# Start the stream
gcloud datastream streams update pg-to-bq-stream \
  --location=us-central1 \
  --state=RUNNING \
  --project=my-project
```

## Understanding PostgreSQL Data Type Mapping

Datastream maps PostgreSQL data types to BigQuery types. Most mappings are straightforward, but there are a few worth noting:

| PostgreSQL Type | BigQuery Type | Notes |
|----------------|---------------|-------|
| integer, bigint | INT64 | Direct mapping |
| numeric, decimal | NUMERIC | Precision preserved |
| text, varchar | STRING | No length limit in BQ |
| timestamp | TIMESTAMP | Converted to UTC |
| timestamptz | TIMESTAMP | Timezone preserved then UTC |
| jsonb, json | STRING | Stored as JSON string |
| uuid | STRING | Stored as string |
| boolean | BOOL | Direct mapping |
| bytea | BYTES | Binary data |
| array types | STRING | Serialized as JSON |

The JSON and array handling deserves attention. PostgreSQL JSONB columns become STRING columns in BigQuery, but you can use BigQuery's JSON functions to parse them in queries:

```sql
-- Parse a JSONB column that was replicated as STRING
SELECT
  order_id,
  JSON_VALUE(metadata, '$.source') AS order_source,
  JSON_VALUE(metadata, '$.campaign_id') AS campaign_id
FROM
  `my-project.pg_replicated.orders`
WHERE
  _metadata_deleted IS NOT TRUE
```

## Handling TOAST Columns

PostgreSQL uses a mechanism called TOAST (The Oversized-Attribute Storage Technique) to store large column values. When a row is updated but the TOAST columns are not changed, PostgreSQL does not include those values in the WAL record.

This means Datastream might see NULL values for unchanged TOAST columns during updates. To work around this, set the replica identity to FULL on tables with TOAST columns:

```sql
-- Set replica identity to FULL to include all columns in WAL records
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
```

This increases WAL size but ensures all column values are captured during updates.

## Monitoring Replication Slot Health

One critical thing to watch with PostgreSQL CDC is the replication slot. If Datastream falls behind or disconnects for too long, the replication slot prevents PostgreSQL from cleaning up old WAL segments. This can fill up your disk.

```sql
-- Check replication slot status and lag
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag_size
FROM pg_replication_slots
WHERE slot_name = 'datastream_slot';
```

Set up monitoring alerts if the lag exceeds a threshold. If the slot falls too far behind, you may need to drop it and recreate the stream with a fresh backfill.

## Verifying Replication

After starting the stream, verify data is flowing by checking BigQuery:

```sql
-- Check the most recent replicated events
SELECT
  order_id,
  datastream_metadata.source_timestamp,
  _metadata_change_type
FROM `my-project.pg_replicated.orders`
ORDER BY datastream_metadata.source_timestamp DESC
LIMIT 10;
```

You should see rows appearing within a few minutes of the stream starting, with the initial backfill data followed by real-time changes.

## Wrapping Up

Datastream CDC from PostgreSQL to BigQuery is a solid solution for keeping your analytics data current. The key differences from MySQL CDC are the use of logical replication slots and publications, and the need to handle TOAST columns carefully. Once you have the replication slot configured and the stream running, the ongoing maintenance is mostly about monitoring slot lag and ensuring your PostgreSQL WAL retention is sufficient. The payoff is near-real-time analytics without any custom pipeline code.
