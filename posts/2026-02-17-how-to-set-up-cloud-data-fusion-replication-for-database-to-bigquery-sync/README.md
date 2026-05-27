# How to Set Up Cloud Data Fusion Replication for Database-to-BigQuery Sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Data Fusion, Replication, BigQuery, Database Sync, CDC, Change Data Capture

Description: Step-by-step guide to setting up Cloud Data Fusion Replication for continuous database-to-BigQuery synchronization using change data capture.

---

Keeping an analytical data warehouse in sync with operational databases is one of the classic challenges in data engineering. You want near-real-time data in BigQuery for analytics, but you do not want to hammer your production database with full table scans every few hours. Cloud Data Fusion Replication solves this by using change data capture (CDC) to stream incremental changes from your database directly into BigQuery. In this post, I will walk through how to set it up end to end.

## What Is Cloud Data Fusion Replication?

Cloud Data Fusion Replication is an accelerator available for Cloud Data Fusion instances in version 6.3.0 or later. It provides continuous, low-latency data replication from operational databases to BigQuery. Unlike batch pipelines that run on a schedule, replication jobs run continuously - they read the database transaction log and apply inserts, updates, and deletes to BigQuery as they happen.

The supported source databases include:

- MySQL
- SQL Server
- Oracle

Cloud-hosted MySQL sources, such as Cloud SQL for MySQL, can also be used when the required connectivity and CDC settings are in place. The supported target is BigQuery.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Cloud Data Fusion instance running version 6.3.0 or later with the Replication accelerator enabled
- A source database with binary logging or the required change tracking solution enabled
- Network connectivity between your Data Fusion instance and the source database
- BigQuery access for the replicated datasets and tables
- Appropriate IAM permissions for the Data Fusion service account

### Enabling Binary Logging on MySQL

If your source is MySQL, you need to make sure binary logging is enabled. For Cloud SQL, this is straightforward:

```sql
-- Check if binary logging is enabled on your MySQL instance
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
SHOW VARIABLES LIKE 'binlog_row_image';

-- Cloud Data Fusion Replication expects row-based binlogs
-- with full row images.
```

For self-managed MySQL, configure the server with a unique `server-id`, `log_bin`, `binlog_format=ROW`, and `binlog_row_image=FULL`. For Cloud SQL for MySQL, enable binary logging for the instance and verify that the `binlog_row_image` flag is set to `full`.

### Setting Up a Replication User

Create a dedicated database user for replication with the minimum required privileges:

```sql
-- Create a replication user with the necessary privileges for CDC
CREATE USER 'cdf_replication'@'%' IDENTIFIED WITH mysql_native_password BY 'your-secure-password';

-- Grant replication privileges
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'cdf_replication'@'%';

FLUSH PRIVILEGES;
```

## Setting Up the Replication Job

### Step 1: Navigate to Replication

In your Cloud Data Fusion UI, click on "Replication" in the left navigation panel. Then click "Create a replication job."

### Step 2: Configure the Source

Select your source database type (e.g., MySQL). Fill in the connection details:

- **Host** - The IP address or hostname of your database
- **Port** - The database port (3306 for MySQL)
- **Database** - The name of the database to replicate
- **Username** - The replication user you created
- **Password** - The password for the replication user

Click "Test Connection" to verify connectivity. If the connection fails, check your firewall rules and VPC peering configuration.

### Step 3: Select Tables

After a successful connection, Data Fusion will display a list of all tables in the selected database. Choose the tables you want to replicate. You can select individual tables or select all.

For each table, Data Fusion shows the columns and their types. You can optionally exclude specific columns if they contain sensitive data that should not be replicated to BigQuery.

### Step 4: Configure the Target

The target configuration is straightforward since the destination is always BigQuery:

- **Project** - Your GCP project ID
- **Dataset** - The BigQuery dataset where replicated tables will be created
- **Staging Bucket** - A GCS bucket used for staging data during the load process
- **Loading Interval** - How frequently staged data is loaded into BigQuery (e.g., every 5 minutes)

The loading interval is an important setting. A shorter interval means lower latency but more BigQuery load jobs. A longer interval means fewer jobs but higher latency. For most use cases, 5-15 minutes is a good balance.

### Step 5: Configure Advanced Settings

Under advanced settings, you can configure:

**Staging Table Prefix** - Add a prefix to temporary staging tables that Data Fusion creates before merging changes into the final BigQuery tables.

**Soft Delete Handling** - When a row is deleted in the source database, you can choose to:
- Hard delete: Remove the row from BigQuery
- Soft delete: Keep the row but set a `_is_deleted` flag to true

Soft deletes are generally recommended because they let you track deletion history and debug issues more easily.

**Schema Change Handling** - Configure how Data Fusion handles DDL changes in the source (new columns, dropped columns, type changes).

## How Replication Works Under the Hood

Understanding the replication flow helps with troubleshooting:

```mermaid
graph LR
    A[Source Database] -->|Transaction Log| B[CDC Reader]
    B -->|Change Events| C[Staging in GCS]
    C -->|Load Jobs| D[BigQuery Tables]
```

1. The CDC reader connects to the database and reads the transaction log (binlog for MySQL, WAL for PostgreSQL)
2. Change events (inserts, updates, deletes) are captured and staged in GCS
3. At each loading interval, a BigQuery load job reads the staged data and applies the changes
4. BigQuery tables are updated to reflect the current state of the source database

Data Fusion adds metadata columns to each replicated table in BigQuery:

- `_sequence_num` - Used to make replication resilient to duplicate or missed events
- `_is_deleted` - Whether the row has been soft-deleted, when soft deletes are enabled or required by the source
- `_row_id` - Used by source plugins that support row identifiers
- `_source_timestamp` and `_sort` - Used for ordering with sources that generate unordered CDC streams

## Starting and Monitoring the Replication Job

Click "Deploy and Start" to begin replication. The initial load will perform a full snapshot of each selected table. Depending on the size of your tables, this can take anywhere from minutes to hours.

After the initial snapshot completes, the job transitions to CDC mode and starts processing incremental changes.

### Monitoring Metrics

On the replication job detail page, you can monitor:

- **Throughput** - Records processed per second
- **Latency** - Time between a change in the source and its appearance in BigQuery
- **Table Status** - Whether each table is in snapshot mode, CDC mode, or error state
- **Event Counts** - Number of inserts, updates, and deletes processed

### Setting Up Alerts

Use Cloud Monitoring to create alerts for replication jobs. Key metrics to watch include:

- Replication latency exceeding a threshold (e.g., 30 minutes)
- Replication job state changes (running to failed)
- Error rates exceeding zero

## Handling Common Issues

### Replication Lag

If replication lag is growing, check:
- Source database load (heavy writes can outpace the CDC reader)
- Network bandwidth between the database and Data Fusion
- BigQuery load job times (large batches take longer)

Reducing the loading interval might seem counterintuitive, but smaller, more frequent loads can actually reduce overall latency.

### Schema Drift

When someone adds a column to a source table, the replication job needs to handle it. By default, Data Fusion will add the new column to the BigQuery table and continue replication. If a column is dropped or its type is changed, the behavior depends on your schema change handling configuration.

### Connection Failures

The replication job is designed to be resilient to transient network issues. It will retry automatically with exponential backoff. However, if the source database is down for an extended period, you may need to restart the replication job. Check the transaction log retention on your source database - if the binlog has been purged while the replication job was disconnected, you will need to do a fresh snapshot.

## Best Practices

Keep your transaction log retention period longer than your longest expected outage window. For MySQL, set `expire_logs_days` to at least 7 days. For Cloud SQL, this is managed through the backup retention settings.

Start with a small number of tables and add more as you gain confidence. Replicating hundreds of tables at once makes it harder to debug issues during initial setup.

Use separate BigQuery datasets for replicated data and transformed data. This keeps a clear boundary between raw operational data and analytics-ready tables.

Monitor the size of your staging bucket. Although Data Fusion cleans up staged files after loading, a backlog can accumulate if BigQuery load jobs are failing.

## Wrapping Up

Cloud Data Fusion Replication removes a lot of the complexity from keeping BigQuery in sync with operational databases. The CDC-based approach is far more efficient than periodic full loads, and the built-in monitoring and error handling make it suitable for production workloads. Get your source database logging configured, set up a replication job, and you will have near-real-time data flowing into BigQuery with minimal ongoing maintenance.
