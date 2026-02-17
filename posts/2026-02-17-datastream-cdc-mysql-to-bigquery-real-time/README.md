# How to Set Up Datastream CDC from MySQL to BigQuery in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, MySQL, BigQuery, CDC, Change Data Capture, Real-Time Replication

Description: Step-by-step guide to setting up Google Cloud Datastream for real-time change data capture from MySQL to BigQuery.

---

Replicating data from MySQL to BigQuery used to involve batch ETL jobs that ran every few hours, leaving your analytics perpetually behind your production database. Datastream changes that by reading the MySQL binary log in real time and streaming every insert, update, and delete directly to BigQuery.

I have set this up for transactional databases ranging from small SaaS products to high-volume e-commerce platforms, and this guide covers the full setup from MySQL configuration to verifying your first replicated rows.

## Prerequisites

Before you start, make sure you have:

- A MySQL 5.7 or 8.0 instance (Cloud SQL, Amazon RDS, or self-managed)
- Binary logging enabled on the MySQL instance
- A GCP project with Datastream API enabled
- A BigQuery dataset to receive the replicated data

## Step 1: Configure MySQL for Binary Log Replication

Datastream reads changes from the MySQL binary log (binlog), so you need to make sure your MySQL instance has the right settings.

For Cloud SQL, enable binlog through the instance settings:

```bash
# Enable binary logging on a Cloud SQL MySQL instance
gcloud sql instances patch my-mysql-instance \
  --backup-start-time=00:00 \
  --enable-bin-log \
  --project=my-project
```

For self-managed MySQL, add these settings to your `my.cnf`:

```ini
# Enable row-based binary logging for CDC
[mysqld]
server-id = 1
log_bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
expire_logs_days = 3
```

After changing the configuration, restart MySQL and verify:

```sql
-- Verify binary logging is enabled and using ROW format
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
SHOW VARIABLES LIKE 'binlog_row_image';
```

All three should return `ON`, `ROW`, and `FULL` respectively.

## Step 2: Create a Datastream User

Create a dedicated MySQL user for Datastream with the minimum required permissions:

```sql
-- Create the replication user
CREATE USER 'datastream_user'@'%' IDENTIFIED BY 'strong-password-here';

-- Grant replication permissions
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'datastream_user'@'%';

-- Grant SELECT on the databases you want to replicate
GRANT SELECT ON my_database.* TO 'datastream_user'@'%';

-- Apply the grants
FLUSH PRIVILEGES;
```

The `REPLICATION SLAVE` permission allows Datastream to read the binary log. The `SELECT` permission is needed for the initial backfill of existing data.

## Step 3: Set Up Network Connectivity

Datastream needs to reach your MySQL instance. The approach depends on where MySQL is running.

For Cloud SQL, the simplest option is to use the Cloud SQL proxy through a private connection profile:

```bash
# Create a private connectivity configuration
gcloud datastream private-connections create my-private-conn \
  --display-name="MySQL Private Connection" \
  --location=us-central1 \
  --vpc=projects/my-project/global/networks/default \
  --subnet=10.1.0.0/29 \
  --project=my-project
```

For external MySQL instances, you can allowlist Datastream's IP ranges or set up a VPN/interconnect.

## Step 4: Create a Connection Profile

A connection profile stores the MySQL connection details that Datastream uses:

```bash
# Create a MySQL connection profile
gcloud datastream connection-profiles create mysql-source-profile \
  --display-name="Production MySQL" \
  --type=mysql \
  --mysql-hostname=10.0.0.5 \
  --mysql-port=3306 \
  --mysql-username=datastream_user \
  --mysql-password=strong-password-here \
  --location=us-central1 \
  --project=my-project
```

You also need a connection profile for the BigQuery destination:

```bash
# Create a BigQuery connection profile
gcloud datastream connection-profiles create bq-destination-profile \
  --display-name="BigQuery Analytics" \
  --type=bigquery \
  --location=us-central1 \
  --project=my-project
```

## Step 5: Create the Stream

Now create the actual stream that connects MySQL to BigQuery:

```bash
# Create the stream configuration file
cat > stream-config.json << 'EOF'
{
  "sourceConfig": {
    "sourceConnectionProfile": "projects/my-project/locations/us-central1/connectionProfiles/mysql-source-profile",
    "mysqlSourceConfig": {
      "includeObjects": {
        "mysqlDatabases": [
          {
            "database": "my_database",
            "mysqlTables": [
              {"table": "orders"},
              {"table": "customers"},
              {"table": "products"}
            ]
          }
        ]
      }
    }
  },
  "destinationConfig": {
    "destinationConnectionProfile": "projects/my-project/locations/us-central1/connectionProfiles/bq-destination-profile",
    "bigqueryDestinationConfig": {
      "dataFreshness": "300s",
      "singleTargetDataset": {
        "datasetId": "projects/my-project/datasets/replicated_data"
      }
    }
  }
}
EOF

# Create the stream
gcloud datastream streams create mysql-to-bq-stream \
  --display-name="MySQL to BigQuery CDC" \
  --location=us-central1 \
  --source=mysql-source-profile \
  --destination=bq-destination-profile \
  --source-config=stream-config.json \
  --destination-config=stream-config.json \
  --project=my-project
```

## Step 6: Start the Stream

Streams are created in a paused state. Start it when you are ready:

```bash
# Start the stream
gcloud datastream streams update mysql-to-bq-stream \
  --location=us-central1 \
  --state=RUNNING \
  --project=my-project
```

## Understanding the BigQuery Output

Datastream creates tables in BigQuery that mirror your MySQL tables, with a few additional metadata columns:

- `datastream_metadata.uuid` - Unique identifier for each CDC event
- `datastream_metadata.source_timestamp` - When the change happened in MySQL
- `_metadata_deleted` - Boolean flag for soft deletes
- `_metadata_change_type` - INSERT, UPDATE, or DELETE

When a row is updated in MySQL, Datastream writes the new version of the full row to BigQuery. Deletes are handled as soft deletes by default - the row remains in BigQuery with `_metadata_deleted` set to true.

## Querying Replicated Data

To get the current state of a table (excluding deleted rows), use a query like this:

```sql
-- Get current state of the orders table, excluding soft-deleted rows
SELECT
  order_id,
  customer_id,
  total_amount,
  order_status,
  datastream_metadata.source_timestamp AS last_updated
FROM
  `my-project.replicated_data.orders`
WHERE
  _metadata_deleted IS NOT TRUE
```

If you need point-in-time queries, you can use the source timestamp to see what the data looked like at any moment:

```sql
-- Get orders as they existed at a specific point in time
SELECT *
FROM `my-project.replicated_data.orders`
WHERE datastream_metadata.source_timestamp <= TIMESTAMP('2026-02-17 10:00:00 UTC')
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY order_id
  ORDER BY datastream_metadata.source_timestamp DESC
) = 1
```

## Monitoring the Stream

Keep an eye on your stream with these checks:

```bash
# Check stream status and throughput
gcloud datastream streams describe mysql-to-bq-stream \
  --location=us-central1 \
  --project=my-project

# List recent errors
gcloud datastream streams list \
  --location=us-central1 \
  --project=my-project \
  --format="table(name, state, errors)"
```

You should also set up Cloud Monitoring alerts for replication lag. A healthy stream typically has less than 30 seconds of lag, but this varies based on write volume.

## Common Pitfalls

There are a few things that caught me off guard during setup. Binary log retention is the most common issue. If your binlog expires before Datastream can read it, you will get gaps in replication. Set `expire_logs_days` to at least 3 days.

Large transactions can cause temporary lag spikes. If your application does bulk inserts of millions of rows in a single transaction, Datastream needs to process the entire transaction before it can commit to BigQuery.

Schema changes require attention. Adding a column in MySQL works fine - Datastream picks it up automatically. But dropping or renaming columns can cause issues that need manual intervention.

## Wrapping Up

Datastream CDC from MySQL to BigQuery gives you near-real-time analytics on your transactional data without impacting your production database. The setup is straightforward once you understand the networking and permission requirements, and the managed nature of the service means you do not need to babysit it day to day. Just keep an eye on replication lag and binlog retention, and you will have a solid real-time data pipeline.
