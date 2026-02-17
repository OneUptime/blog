# How to Convert an Existing BigQuery Table to a Partitioned Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Partitioning, Data Migration, SQL

Description: Step-by-step guide to converting an existing unpartitioned BigQuery table to a partitioned table for better query performance and cost optimization.

---

You have got a BigQuery table that has been growing for months. Queries are getting slower and more expensive. You know partitioning would help, but the table already exists and is full of data. BigQuery does not let you alter a table to add partitioning after the fact, so what do you do?

The answer is: you create a new partitioned table and copy the data over. It sounds simple, and it mostly is - but there are a few things you need to handle carefully to avoid downtime or data loss. Let me walk through the full process.

## Understanding the Limitation

BigQuery does not support ALTER TABLE to change a table from unpartitioned to partitioned. This is a fundamental schema property that is set at table creation time. The only way to convert is to create a new table with partitioning and migrate the data.

There are three main approaches:

1. **CREATE TABLE AS SELECT (CTAS)** - simplest, works for most cases
2. **Copy to Cloud Storage and reload** - better for very large tables
3. **BigQuery Data Transfer Service** - for scheduled migrations

## Method 1: CTAS (Create Table As Select)

This is the most straightforward approach. You create a new partitioned table and populate it in a single SQL statement.

```sql
-- Create a new partitioned table from the existing unpartitioned table
-- This copies all data and applies partitioning in one step
CREATE TABLE `my_project.my_dataset.orders_partitioned`
PARTITION BY DATE(order_timestamp)
CLUSTER BY customer_id
AS
SELECT *
FROM `my_project.my_dataset.orders`;
```

This works well for tables up to a few terabytes. The operation runs as a single BigQuery job and is billed for the full table scan of the source table.

For date-based partitioning, you can also use a DATE column directly.

```sql
-- If you have a DATE column, use it directly
CREATE TABLE `my_project.my_dataset.orders_partitioned`
PARTITION BY order_date
AS
SELECT *
FROM `my_project.my_dataset.orders`;
```

For integer-range partitioning, specify the range boundaries.

```sql
-- Integer-range partitioning during CTAS
CREATE TABLE `my_project.my_dataset.orders_by_region`
PARTITION BY RANGE_BUCKET(region_id, GENERATE_ARRAY(0, 1000, 10))
AS
SELECT *
FROM `my_project.my_dataset.orders`;
```

## Method 2: Export and Reimport

For very large tables (10 TB or more), CTAS might time out or be impractical. In that case, export the data to Cloud Storage and reimport it.

First, export the existing table.

```sql
-- Export to Cloud Storage in Parquet format
-- Parquet preserves types and compresses well
EXPORT DATA OPTIONS(
  uri='gs://my-bucket/exports/orders/*.parquet',
  format='PARQUET',
  overwrite=true
) AS
SELECT *
FROM `my_project.my_dataset.orders`;
```

Then create the new partitioned table schema.

```sql
-- Create the empty partitioned table with the desired schema
CREATE TABLE `my_project.my_dataset.orders_partitioned`
(
  order_id INT64,
  customer_id INT64,
  order_date DATE,
  amount NUMERIC,
  status STRING
)
PARTITION BY order_date
CLUSTER BY customer_id;
```

Finally, load the exported data back.

```sql
-- Load the exported data into the partitioned table
LOAD DATA INTO `my_project.my_dataset.orders_partitioned`
FROM FILES (
  format = 'PARQUET',
  uris = ['gs://my-bucket/exports/orders/*.parquet']
);
```

## Handling the Switchover

The tricky part is switching from the old table to the new one without breaking anything. Here is the approach I use.

```sql
-- Step 1: Create the partitioned table with a temporary name
CREATE TABLE `my_project.my_dataset.orders_partitioned_new`
PARTITION BY order_date
CLUSTER BY customer_id
AS
SELECT *
FROM `my_project.my_dataset.orders`;

-- Step 2: Verify row counts match
SELECT 'original' AS source, COUNT(*) AS row_count
FROM `my_project.my_dataset.orders`
UNION ALL
SELECT 'partitioned' AS source, COUNT(*) AS row_count
FROM `my_project.my_dataset.orders_partitioned_new`;

-- Step 3: Verify data integrity with checksums on key columns
SELECT
  'original' AS source,
  SUM(amount) AS total_amount,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM `my_project.my_dataset.orders`
UNION ALL
SELECT
  'partitioned' AS source,
  SUM(amount) AS total_amount,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM `my_project.my_dataset.orders_partitioned_new`;
```

Once you have verified the data matches, you can do the swap.

```sql
-- Step 4: Rename tables to complete the swap
-- Note: BigQuery does not have RENAME TABLE, so we use copy and delete
-- First, back up the original just in case
CREATE TABLE `my_project.my_dataset.orders_backup`
COPY `my_project.my_dataset.orders`;

-- Then drop the original
DROP TABLE `my_project.my_dataset.orders`;

-- Rename the new table to the original name using copy
CREATE TABLE `my_project.my_dataset.orders`
COPY `my_project.my_dataset.orders_partitioned_new`;

-- Drop the temp table
DROP TABLE `my_project.my_dataset.orders_partitioned_new`;
```

Alternatively, you can use the `bq` command-line tool which supports table copy operations that effectively rename tables.

```bash
# Copy the partitioned table to the original table name
bq cp --force \
  my_project:my_dataset.orders_partitioned_new \
  my_project:my_dataset.orders

# Clean up the temporary table
bq rm -f my_project:my_dataset.orders_partitioned_new
```

## Handling Ongoing Writes During Migration

If your table is receiving continuous writes, you need to handle the gap between when you copy the data and when you switch over. Here is one approach.

```sql
-- Step 1: Note the current max timestamp before starting migration
SELECT MAX(order_timestamp) AS cutoff_time
FROM `my_project.my_dataset.orders`;
-- Let's say this returns 2026-02-17 10:30:00

-- Step 2: Create the partitioned table (takes time for large tables)
CREATE TABLE `my_project.my_dataset.orders_partitioned`
PARTITION BY DATE(order_timestamp)
AS
SELECT *
FROM `my_project.my_dataset.orders`;

-- Step 3: After CTAS completes, copy rows that arrived during migration
INSERT INTO `my_project.my_dataset.orders_partitioned`
SELECT *
FROM `my_project.my_dataset.orders`
WHERE order_timestamp > '2026-02-17 10:30:00';

-- Step 4: Do the switchover (ideally during low-traffic period)
```

For zero-downtime migrations, you might need to use views as an abstraction layer.

```sql
-- Create a view that points to the current table
CREATE OR REPLACE VIEW `my_project.my_dataset.orders_view` AS
SELECT * FROM `my_project.my_dataset.orders`;

-- After migration, update the view to point to the new table
CREATE OR REPLACE VIEW `my_project.my_dataset.orders_view` AS
SELECT * FROM `my_project.my_dataset.orders_partitioned`;
```

## Verifying the Partition Structure

After migration, confirm that partitioning is working correctly.

```sql
-- Check that partitions were created correctly
SELECT
  table_name,
  partition_id,
  total_rows,
  total_logical_bytes
FROM `my_project.my_dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'orders_partitioned'
ORDER BY partition_id
LIMIT 20;
```

Also run a query with a partition filter and verify that it scans significantly less data than a full table scan.

```sql
-- This should only scan one partition's worth of data
SELECT COUNT(*)
FROM `my_project.my_dataset.orders_partitioned`
WHERE order_date = '2026-02-01';
```

## Common Issues During Conversion

**Data type mismatches**: Your partition column needs to be the right type. If you want to partition by date but your column is a STRING, you need to cast it.

```sql
-- Handle string date columns by casting during migration
CREATE TABLE `my_project.my_dataset.orders_partitioned`
PARTITION BY order_date_parsed
AS
SELECT
  *,
  PARSE_DATE('%Y-%m-%d', date_string) AS order_date_parsed
FROM `my_project.my_dataset.orders`;
```

**NULL values in partition column**: Rows with NULL in the partition column go to a special NULL partition. If you have a lot of NULLs, clean them up before or during migration.

**Table too large for single CTAS**: If CTAS times out, break the migration into chunks. Migrate one month or one range at a time.

```sql
-- Migrate in monthly chunks for very large tables
INSERT INTO `my_project.my_dataset.orders_partitioned`
SELECT *
FROM `my_project.my_dataset.orders`
WHERE order_date BETWEEN '2025-01-01' AND '2025-01-31';
```

## Wrapping Up

Converting an unpartitioned table to a partitioned one is a one-time effort that pays off continuously. The CTAS approach works for most tables, while the export-and-reimport method handles very large datasets. Plan your switchover carefully, verify data integrity before and after, and consider using views to minimize disruption to downstream consumers.

If you are managing multiple BigQuery datasets and need to track migration progress and query performance improvements, [OneUptime](https://oneuptime.com) offers monitoring capabilities that can help you stay on top of your data infrastructure health.
