# How to Configure BigQuery Change Data Capture for Real-Time Table Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Change Data Capture, CDC, Real-Time, Streaming

Description: Learn how to configure BigQuery change data capture to apply real-time inserts, updates, and deletes from source systems to your BigQuery tables.

---

Most analytical workloads in BigQuery follow a batch pattern - load data periodically, run queries, generate reports. But many applications need their BigQuery tables to reflect changes from source systems in near real-time. When a customer updates their profile in your application database, you want that change reflected in BigQuery within seconds, not hours. BigQuery's Change Data Capture (CDC) support, combined with BigQuery Storage Write API and streaming capabilities, makes this possible.

In this post, I will walk through setting up CDC pipelines to BigQuery, handling different types of changes (inserts, updates, deletes), and configuring the table to apply these changes automatically.

## What CDC Means in the BigQuery Context

Change Data Capture refers to the process of identifying and propagating changes from a source system to a target. In the BigQuery context, CDC support means that BigQuery can process streams of change events (inserts, updates, and deletes) and apply them to a table, maintaining an accurate current snapshot of the source data.

Before BigQuery's native CDC support, handling updates and deletes required workarounds like staging changes to a temporary table and running MERGE statements. Now, BigQuery can handle this automatically through the Storage Write API with CDC mode.

## Setting Up a CDC-Enabled Table

To use CDC with BigQuery, your table needs to have a primary key defined. This is how BigQuery knows which row to update or delete when a change event arrives.

```sql
-- Create a table with a primary key for CDC
CREATE TABLE `my_project.production.customers` (
  customer_id STRING NOT NULL,
  name STRING,
  email STRING,
  subscription_tier STRING,
  last_updated TIMESTAMP,
  -- Define the primary key
  PRIMARY KEY (customer_id) NOT ENFORCED
)
CLUSTER BY customer_id;
```

The NOT ENFORCED keyword is required because BigQuery does not enforce primary key uniqueness on writes. The primary key is used by the CDC process to identify which row to update or delete, but it is your responsibility to ensure uniqueness in the source data.

## Using the Storage Write API for CDC

The BigQuery Storage Write API supports a CDC mode where each row includes a change type indicator. The change types are UPSERT (insert or update) and DELETE.

Here is how to set up a CDC stream using the Python client.

```python
from google.cloud import bigquery_storage_v1
from google.cloud.bigquery_storage_v1 import types
from google.protobuf import descriptor_pb2
import json

# Initialize the write client
write_client = bigquery_storage_v1.BigQueryWriteClient()

# Define the target table
table_path = "projects/my-project/datasets/production/tables/customers"

# Create a write stream in committed mode for CDC
write_stream = types.WriteStream(type_=types.WriteStream.Type.COMMITTED)
parent = write_client.table_path("my-project", "production", "customers")

stream = write_client.create_write_stream(
    parent=parent,
    write_stream=write_stream
)

print(f"Created write stream: {stream.name}")
```

For a more practical implementation, here is how you would process CDC events from a source like Debezium or Datastream.

```python
from google.cloud import bigquery

def apply_cdc_events(events):
    """
    Apply CDC events to BigQuery using DML statements.
    Each event has a type (INSERT, UPDATE, DELETE) and payload.
    """
    client = bigquery.Client()

    for event in events:
        change_type = event['type']
        payload = event['payload']

        if change_type == 'INSERT':
            # Insert new row
            query = f"""
            INSERT INTO `my_project.production.customers`
            (customer_id, name, email, subscription_tier, last_updated)
            VALUES (
                '{payload["customer_id"]}',
                '{payload["name"]}',
                '{payload["email"]}',
                '{payload["subscription_tier"]}',
                CURRENT_TIMESTAMP()
            )
            """
        elif change_type == 'UPDATE':
            # Update existing row
            query = f"""
            UPDATE `my_project.production.customers`
            SET
                name = '{payload["name"]}',
                email = '{payload["email"]}',
                subscription_tier = '{payload["subscription_tier"]}',
                last_updated = CURRENT_TIMESTAMP()
            WHERE customer_id = '{payload["customer_id"]}'
            """
        elif change_type == 'DELETE':
            # Delete the row
            query = f"""
            DELETE FROM `my_project.production.customers`
            WHERE customer_id = '{payload["customer_id"]}'
            """

        client.query(query).result()
```

Note: In production, you should use parameterized queries to prevent SQL injection. The string formatting above is for illustration only.

## Using Datastream for Managed CDC

Google Cloud Datastream provides a fully managed CDC pipeline from source databases to BigQuery. It handles change detection, streaming, and applying changes automatically.

```bash
# Create a Datastream connection profile for the source database
gcloud datastream connection-profiles create source-mysql \
  --location=us-central1 \
  --type=mysql \
  --mysql-hostname=10.0.0.5 \
  --mysql-port=3306 \
  --mysql-username=datastream_user \
  --mysql-password=MYSQL_PASSWORD \
  --display-name="Source MySQL Database"

# Create a connection profile for BigQuery destination
gcloud datastream connection-profiles create dest-bigquery \
  --location=us-central1 \
  --type=bigquery \
  --display-name="BigQuery Destination"
```

Then create a stream that replicates changes from MySQL to BigQuery.

```bash
# Create a Datastream stream for CDC replication
gcloud datastream streams create mysql-to-bq-cdc \
  --location=us-central1 \
  --source=source-mysql \
  --mysql-source-config='{
    "include_objects": {
      "mysql_databases": [{
        "database": "production",
        "mysql_tables": [{
          "table": "customers"
        }, {
          "table": "orders"
        }]
      }]
    }
  }' \
  --destination=dest-bigquery \
  --bigquery-destination-config='{
    "data_freshness": "300s",
    "single_target_dataset": {
      "dataset_id": "projects/my-project/datasets/production_replica"
    }
  }' \
  --display-name="MySQL to BigQuery CDC"
```

The `data_freshness` parameter controls how quickly changes are applied to BigQuery. Setting it to 300 seconds (5 minutes) means changes will be visible in BigQuery within about 5 minutes of occurring in the source database.

## MERGE-Based CDC Pattern

For sources that do not support streaming CDC, you can use a MERGE statement to apply batched changes. This is the classic CDC pattern in BigQuery.

```sql
-- Apply a batch of changes using MERGE
-- The staging table contains new and modified records
MERGE `my_project.production.customers` AS target
USING `my_project.staging.customers_changes` AS source
ON target.customer_id = source.customer_id
-- When a matching row exists and the change type is DELETE, remove it
WHEN MATCHED AND source.change_type = 'DELETE' THEN
  DELETE
-- When a matching row exists and the change type is UPDATE, update it
WHEN MATCHED AND source.change_type = 'UPSERT' THEN
  UPDATE SET
    name = source.name,
    email = source.email,
    subscription_tier = source.subscription_tier,
    last_updated = source.last_updated
-- When no matching row exists, insert the new record
WHEN NOT MATCHED AND source.change_type = 'UPSERT' THEN
  INSERT (customer_id, name, email, subscription_tier, last_updated)
  VALUES (source.customer_id, source.name, source.email, source.subscription_tier, source.last_updated);
```

Schedule this MERGE to run at your desired frequency - every 5 minutes, every hour, or whatever your latency requirements dictate.

## Handling Late-Arriving Changes

In distributed systems, changes do not always arrive in order. A common problem is receiving an older update after a newer one has already been applied. Handle this by including a timestamp in your CDC events and only applying changes that are newer than what is already in BigQuery.

```sql
-- MERGE that only applies changes newer than existing data
MERGE `my_project.production.customers` AS target
USING `my_project.staging.customers_changes` AS source
ON target.customer_id = source.customer_id
WHEN MATCHED
  AND source.change_type = 'UPSERT'
  -- Only apply if the source change is newer
  AND source.last_updated > target.last_updated
THEN
  UPDATE SET
    name = source.name,
    email = source.email,
    subscription_tier = source.subscription_tier,
    last_updated = source.last_updated
WHEN MATCHED AND source.change_type = 'DELETE' THEN
  DELETE
WHEN NOT MATCHED AND source.change_type = 'UPSERT' THEN
  INSERT (customer_id, name, email, subscription_tier, last_updated)
  VALUES (source.customer_id, source.name, source.email, source.subscription_tier, source.last_updated);
```

## Monitoring CDC Pipeline Health

Track the health of your CDC pipeline by monitoring the lag between source changes and their appearance in BigQuery.

```sql
-- Check CDC lag by comparing the latest record timestamp to current time
SELECT
  MAX(last_updated) AS latest_record,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(last_updated), SECOND) AS lag_seconds
FROM
  `my_project.production.customers`;
```

For Datastream-managed CDC, check the stream metrics.

```bash
# Check Datastream stream status and throughput
gcloud datastream streams describe mysql-to-bq-cdc \
  --location=us-central1 \
  --format='table(name,state,backfillAll,errors)'
```

## Wrapping Up

CDC in BigQuery has evolved from a manual MERGE-based pattern to a first-class feature with native support through the Storage Write API and managed services like Datastream. For most use cases, Datastream provides the simplest path from a source database to BigQuery with minimal latency. For custom CDC pipelines or non-database sources, the MERGE pattern with staging tables gives you full control over how changes are applied. The key design decisions are how much latency you can tolerate and whether you need to handle out-of-order changes. Get those two questions answered and the implementation follows naturally.
