# How to Use BigQuery Time Travel to Restore Accidentally Deleted Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Time Travel, Data Recovery, Disaster Recovery, Data Management

Description: Learn how to use BigQuery time travel to query and restore data from any point in the past seven days after accidental deletions or modifications.

---

We have all been there. Someone runs a DELETE statement without a WHERE clause, drops a table they thought was in dev but was actually in prod, or an ETL pipeline overwrites data it should not have touched. In traditional databases, recovering from these mistakes often means restoring from backups, which can take hours and may result in data loss if backups are not frequent enough. BigQuery time travel lets you access data as it existed at any point in the past seven days, making recovery from accidental data loss straightforward.

In this post, I will show you how to use time travel to query historical data, restore deleted rows, recover dropped tables, and configure the time travel window for your needs.

## How Time Travel Works

BigQuery automatically maintains a history of changes to every table for a configurable window of up to seven days (168 hours). During this window, you can query the table as it existed at any specific timestamp. This works for both the table contents and the table schema. You do not need to enable time travel - it is on by default for all tables.

The time travel window is set at the dataset level and defaults to seven days. You can reduce it to as little as two days if you want to save on storage costs, but I recommend keeping it at the full seven days unless storage costs are a significant concern.

## Querying Data at a Past Timestamp

The basic syntax for time travel is the FOR SYSTEM_TIME AS OF clause. This lets you query a table as it existed at a specific point in time.

```sql
-- Query the table as it existed exactly 24 hours ago
SELECT *
FROM `my_project.analytics.events`
FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR);
```

You can also specify an exact timestamp.

```sql
-- Query the table as it existed at a specific timestamp
SELECT *
FROM `my_project.analytics.events`
FOR SYSTEM_TIME AS OF TIMESTAMP('2026-02-16T14:30:00Z');
```

This is useful when you know approximately when the data loss occurred. If someone ran a bad DELETE at 3:00 PM, querying the table at 2:59 PM gives you the data before the deletion.

## Restoring Accidentally Deleted Rows

If rows were accidentally deleted, you can restore them by querying the pre-deletion state and inserting the missing rows back.

First, identify what was deleted by comparing the current table to the historical version.

```sql
-- Find rows that existed yesterday but are missing today
-- These are the accidentally deleted rows
SELECT historical.*
FROM
  `my_project.analytics.events`
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR) AS historical
LEFT JOIN
  `my_project.analytics.events` AS current_data
ON
  historical.event_id = current_data.event_id
WHERE
  current_data.event_id IS NULL;
```

Once you confirm these are the rows you need to restore, insert them back.

```sql
-- Restore the deleted rows by inserting from the historical version
INSERT INTO `my_project.analytics.events`
SELECT historical.*
FROM
  `my_project.analytics.events`
  FOR SYSTEM_TIME AS OF TIMESTAMP('2026-02-16T14:59:00Z') AS historical
LEFT JOIN
  `my_project.analytics.events` AS current_data
ON
  historical.event_id = current_data.event_id
WHERE
  current_data.event_id IS NULL;
```

## Restoring an Entire Table from a Point in Time

If a table was corrupted by a bad UPDATE or a faulty ETL run, you might want to restore the entire table to a previous state.

```sql
-- Create a backup of the current (damaged) table first
CREATE TABLE `my_project.analytics.events_backup_20260217`
AS SELECT * FROM `my_project.analytics.events`;

-- Replace the table contents with the historical version
CREATE OR REPLACE TABLE `my_project.analytics.events`
AS
SELECT *
FROM `my_project.analytics.events`
FOR SYSTEM_TIME AS OF TIMESTAMP('2026-02-16T08:00:00Z');
```

Be careful with CREATE OR REPLACE - it creates a new table with the old data, but any table-level settings like clustering, partitioning options, or access policies need to be reapplied. A safer approach is to truncate and reload.

```sql
-- Safer approach: Truncate and reload to preserve table settings
-- Step 1: Delete all current rows
DELETE FROM `my_project.analytics.events` WHERE TRUE;

-- Step 2: Insert from the historical version
-- Note: The time travel reference is to the original table before the DELETE
INSERT INTO `my_project.analytics.events`
SELECT *
FROM `my_project.analytics.events`
FOR SYSTEM_TIME AS OF TIMESTAMP('2026-02-16T08:00:00Z');
```

## Recovering a Dropped Table

If someone dropped a table entirely using DROP TABLE, you can recover it using the table snapshot feature. BigQuery retains dropped tables within the time travel window.

```bash
# Recover a dropped table using bq cp with a time travel decorator
# The @0 suffix means "at the time of deletion"
bq cp \
  my_project:analytics.events@1708099200000 \
  my_project:analytics.events_recovered
```

The number after the @ is a Unix timestamp in milliseconds. You can also use a relative offset.

```bash
# Recover the table as it was 3 hours ago
# Calculate the millisecond timestamp for 3 hours ago
bq cp \
  my_project:analytics.dropped_table@-10800000 \
  my_project:analytics.dropped_table_recovered
```

The negative number represents milliseconds in the past relative to the current time. -10800000 is 3 hours (3 * 60 * 60 * 1000).

Using the Python client:

```python
from google.cloud import bigquery
import datetime

client = bigquery.Client()

# Specify the timestamp to recover from (before the drop)
recovery_time = datetime.datetime(2026, 2, 16, 14, 0, 0)
# Convert to milliseconds since epoch
recovery_ms = int(recovery_time.timestamp() * 1000)

# Copy the table from the historical snapshot
source_table = f"my_project.analytics.dropped_table@{recovery_ms}"
destination_table = "my_project.analytics.dropped_table_recovered"

job = client.copy_table(source_table, destination_table)
job.result()  # Wait for completion

print(f"Table recovered to {destination_table}")
```

## Comparing Data Across Time

Time travel is also useful for debugging data pipeline issues by comparing table contents at different points.

```sql
-- Compare row counts at different points in time
SELECT
  'Current' AS snapshot,
  COUNT(*) AS row_count
FROM `my_project.analytics.events`
UNION ALL
SELECT
  '24h ago' AS snapshot,
  COUNT(*) AS row_count
FROM `my_project.analytics.events`
FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
UNION ALL
SELECT
  '48h ago' AS snapshot,
  COUNT(*) AS row_count
FROM `my_project.analytics.events`
FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR);
```

This can quickly reveal if a pipeline accidentally deleted or duplicated data.

## Configuring the Time Travel Window

The time travel window is set at the dataset level. The default is seven days (168 hours). You can configure it between 48 hours and 168 hours.

```sql
-- Set the time travel window to 7 days (maximum)
ALTER SCHEMA `my_project.analytics`
SET OPTIONS(
  max_time_travel_hours = 168
);
```

```sql
-- Reduce to 2 days for datasets where storage cost matters more than recovery
ALTER SCHEMA `my_project.staging`
SET OPTIONS(
  max_time_travel_hours = 48
);
```

For production datasets, always use the full 168-hour window. The extra storage cost is minimal compared to the value of being able to recover from mistakes. For staging or temporary datasets, a shorter window is fine.

## Fail-Safe Period

Beyond the time travel window, BigQuery provides an additional fail-safe period of seven days. During this period, data is retained for disaster recovery but is not accessible through time travel queries. Only Google Cloud Support can access fail-safe data, and only in emergency situations. This means even if your time travel window is set to two days, data is technically recoverable for up to nine days (2 + 7) through a support request.

## Best Practices for Data Recovery

While time travel is a powerful safety net, it should not be your only recovery strategy. Here are some additional practices.

Create snapshots of critical tables before major operations like schema migrations or bulk updates. BigQuery table snapshots are point-in-time copies that do not expire with the time travel window.

```sql
-- Create a snapshot before a risky operation
CREATE SNAPSHOT TABLE `my_project.backups.events_20260217`
CLONE `my_project.analytics.events`;
```

Snapshots are much cheaper than full copies because they use delta storage - they only store the differences from the source table.

## Wrapping Up

BigQuery time travel is one of those features that you hope you never need but are extremely grateful for when you do. The ability to query any table as it existed at any point in the past week makes data recovery straightforward and fast. Keep the time travel window at the full seven days for production data, create snapshots before risky operations, and make sure your team knows these recovery techniques before a crisis happens. The worst time to learn about time travel is when you are panicking about lost data.
